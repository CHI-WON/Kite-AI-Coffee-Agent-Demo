import { ethers } from 'ethers';
import { BaseAgent } from './BaseAgent';
import { config, getExplorerUrl } from '../config';
import {
  AgentRole,
  AgentConfig,
  AgentMessage,
  OrderStatus,
  AgentStepRecord,
} from './types';

/**
 * Payment Agent - Final agent in the pipeline
 * Responsibilities:
 * - Execute on-chain USDT transfers
 * - Record transaction results
 * - Only processes approved orders
 */
export class PaymentAgent extends BaseAgent {
  constructor(privateKey: string) {
    const agentConfig: AgentConfig = {
      role: AgentRole.PAYMENT,
      name: 'PaymentAgent',
      privateKey,
    };
    super(agentConfig);
  }

  /**
   * Execute the USDT transfer
   */
  private async executeTransfer(
    recipientAddress: string,
    amount: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const tokenAddress = config.contracts.settlementToken;
    const tokenDecimals = config.payment.tokenDecimals;

    console.log(`💳 [${this.name}] Executing transfer...`);
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${amount} USDT`);

    try {
      // Encode the ERC20 transfer function call
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);

      const transferAmount = ethers.parseUnits(amount.toString(), tokenDecimals);
      const transferCallData = erc20Interface.encodeFunctionData('transfer', [
        recipientAddress,
        transferAmount,
      ]);

      // Construct the user operation request
      const userOpRequest = {
        target: tokenAddress,
        value: 0n,
        callData: transferCallData,
      };

      const sdk = this.getSDK();
      const eoaAddress = this.eoaAddress!;
      const signFunction = this.getSignFunction();

      console.log(`🚀 [${this.name}] Sending UserOperation...`);

      // Send the user operation and wait for result
      const result = await sdk.sendUserOperationAndWait(
        eoaAddress,
        userOpRequest,
        signFunction
      );

      if (result.status.status === 'success') {
        const txHash = result.status.transactionHash || '';
        console.log(`✅ [${this.name}] Transfer successful!`);
        console.log(`   TX: ${txHash}`);
        return { success: true, txHash };
      } else {
        const errorReason = result.status.reason || 'Unknown error';
        console.log(`❌ [${this.name}] Transfer failed: ${errorReason}`);
        return { success: false, error: errorReason };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ [${this.name}] Transfer error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process payment for approved order
   */
  async process(message: AgentMessage): Promise<AgentMessage> {
    const startTime = Date.now();
    console.log(`\n💰 [${this.name}] Processing payment for order ${message.orderId}...`);

    if (!this.initialized) {
      throw new Error(`${this.name} is not initialized`);
    }

    // Verify order came from approval and is approved
    if (message.previousAgent !== AgentRole.APPROVAL) {
      console.log(`❌ [${this.name}] Invalid pipeline - order must come from ApprovalAgent`);
      message.status = OrderStatus.FAILED;
      message.error = 'Invalid processing pipeline';
      message.pipeline.payment = {
        ...this.createStepRecord(startTime, 'failed', 'Invalid pipeline'),
      };
      return message;
    }

    if (message.status !== OrderStatus.APPROVED) {
      console.log(`❌ [${this.name}] Cannot process - order not approved`);
      message.status = OrderStatus.FAILED;
      message.error = 'Order not approved';
      message.pipeline.payment = {
        ...this.createStepRecord(startTime, 'failed', 'Order not approved'),
      };
      return message;
    }

    // Update status to processing
    message.status = OrderStatus.PROCESSING;

    // Execute the transfer
    const transferResult = await this.executeTransfer(
      message.order.merchantAddress,
      message.order.price
    );

    // Create step record based on result
    const stepRecord: AgentStepRecord & { txHash?: string; explorerUrl?: string } = {
      ...this.createStepRecord(
        startTime,
        transferResult.success ? 'success' : 'failed',
        transferResult.success ? 'Payment completed' : transferResult.error
      ),
    };

    if (transferResult.success && transferResult.txHash) {
      stepRecord.txHash = transferResult.txHash;
      stepRecord.explorerUrl = getExplorerUrl(transferResult.txHash);
      
      // Sign the payment confirmation
      const paymentMessage = `Payment ${message.orderId} completed: ${transferResult.txHash}`;
      stepRecord.signature = await this.signMessage(paymentMessage);

      message.status = OrderStatus.COMPLETED;
      console.log(`🎉 [${this.name}] Payment completed (${stepRecord.duration}ms)`);
    } else {
      message.status = OrderStatus.FAILED;
      message.error = transferResult.error;
      console.log(`❌ [${this.name}] Payment failed (${stepRecord.duration}ms)`);
    }

    message.pipeline.payment = stepRecord;
    message.previousAgent = AgentRole.PAYMENT;

    return message;
  }

  /**
   * Get the agent's USDT balance
   */
  async getUSDTBalance(): Promise<string> {
    if (!this.initialized || !this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }

    const provider = this.instance.signer.provider;
    if (!provider) {
      throw new Error('Provider not available');
    }

    const tokenAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const tokenContract = new ethers.Contract(
      config.contracts.settlementToken,
      tokenAbi,
      provider
    );

    try {
      const balance = await tokenContract.balanceOf(this.instance.aaWalletAddress);
      const decimals = await tokenContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch {
      return '0';
    }
  }
}
