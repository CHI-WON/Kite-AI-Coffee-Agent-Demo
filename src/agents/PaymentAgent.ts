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

// EntryPoint contract address on Kite Testnet
const ENTRYPOINT_ADDRESS = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108';

// Minimum deposit required in EntryPoint (0.01 KITE)
const MIN_ENTRYPOINT_DEPOSIT = ethers.parseEther('0.01');

/**
 * Payment Agent - Final agent in the pipeline
 * Responsibilities:
 * - Execute on-chain USDT transfers
 * - Record transaction results
 * - Only processes approved orders
 * - Ensure sufficient EntryPoint deposit for gas
 */
export class PaymentAgent extends BaseAgent {
  private hasCheckedDeposit: boolean = false;

  constructor(privateKey: string) {
    const agentConfig: AgentConfig = {
      role: AgentRole.PAYMENT,
      name: 'PaymentAgent',
      privateKey,
    };
    super(agentConfig);
  }

  /**
   * Check and ensure sufficient EntryPoint deposit
   */
  private async ensureEntryPointDeposit(): Promise<void> {
    if (this.hasCheckedDeposit) return;

    const signer = this.getSigner();
    const provider = signer.provider;
    if (!provider) return;

    try {
      // Check current deposit in EntryPoint
      const entryPoint = new ethers.Contract(
        ENTRYPOINT_ADDRESS,
        [
          'function getDepositInfo(address account) view returns (uint112 deposit, bool staked, uint112 stake, uint32 unstakeDelaySec, uint48 withdrawTime)',
          'function depositTo(address account) payable',
        ],
        signer
      );

      const depositInfo = await entryPoint.getDepositInfo(this.aaWalletAddress);
      const currentDeposit = depositInfo.deposit;

      console.log(`   EntryPoint deposit: ${ethers.formatEther(currentDeposit)} KITE`);

      // If deposit is too low, add more
      if (currentDeposit < MIN_ENTRYPOINT_DEPOSIT) {
        const depositAmount = MIN_ENTRYPOINT_DEPOSIT - currentDeposit + ethers.parseEther('0.005');
        console.log(`   ⚠️  Low deposit, adding ${ethers.formatEther(depositAmount)} KITE to EntryPoint...`);

        // Check EOA balance
        const eoaBalance = await provider.getBalance(this.eoaAddress!);
        if (eoaBalance < depositAmount) {
          console.log(`   ❌ Insufficient EOA balance for deposit. Need ${ethers.formatEther(depositAmount)} KITE`);
          return;
        }

        // Deposit to EntryPoint
        const tx = await entryPoint.depositTo(this.aaWalletAddress, { value: depositAmount });
        await tx.wait();
        console.log(`   ✅ Deposited to EntryPoint. TX: ${tx.hash}`);
      }

      this.hasCheckedDeposit = true;
    } catch (error) {
      console.log(`   ⚠️  Could not check/add EntryPoint deposit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute the USDT transfer using direct EOA transaction
   * This bypasses the AA SDK's Paymaster which has usage limits
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
    console.log(`   Method: Direct EOA transfer (bypassing AA Paymaster limits)`);

    try {
      const signer = this.getSigner();
      
      // Create ERC20 contract instance
      const erc20Contract = new ethers.Contract(
        tokenAddress,
        [
          'function transfer(address to, uint256 amount) returns (bool)',
          'function balanceOf(address account) view returns (uint256)',
        ],
        signer
      );

      // Check balance first
      const eoaAddress = this.eoaAddress!;
      const balance = await erc20Contract.balanceOf(eoaAddress);
      const transferAmount = ethers.parseUnits(amount.toString(), tokenDecimals);
      
      console.log(`   EOA USDT Balance: ${ethers.formatUnits(balance, tokenDecimals)} USDT`);
      
      if (balance < transferAmount) {
        // Try AA wallet balance
        const aaBalance = await erc20Contract.balanceOf(this.aaWalletAddress);
        console.log(`   AA Wallet USDT Balance: ${ethers.formatUnits(aaBalance, tokenDecimals)} USDT`);
        
        if (aaBalance >= transferAmount) {
          // Use AA wallet - need to use SDK
          console.log(`   Using AA wallet for transfer...`);
          return await this.executeAATransfer(recipientAddress, amount);
        }
        
        return { 
          success: false, 
          error: `Insufficient USDT balance. EOA: ${ethers.formatUnits(balance, tokenDecimals)}, AA: ${ethers.formatUnits(aaBalance, tokenDecimals)}` 
        };
      }

      console.log(`🚀 [${this.name}] Sending direct ERC20 transfer...`);

      // Send the transfer transaction directly from EOA
      const tx = await erc20Contract.transfer(recipientAddress, transferAmount);
      console.log(`   TX submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        console.log(`✅ [${this.name}] Transfer successful!`);
        console.log(`   TX: ${tx.hash}`);
        return { success: true, txHash: tx.hash };
      } else {
        console.log(`❌ [${this.name}] Transfer reverted`);
        return { success: false, error: 'Transaction reverted' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ [${this.name}] Transfer error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute transfer using AA wallet (fallback method)
   */
  private async executeAATransfer(
    recipientAddress: string,
    amount: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const tokenAddress = config.contracts.settlementToken;
    const tokenDecimals = config.payment.tokenDecimals;

    try {
      const erc20Interface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ]);

      const transferAmount = ethers.parseUnits(amount.toString(), tokenDecimals);
      const transferCallData = erc20Interface.encodeFunctionData('transfer', [
        recipientAddress,
        transferAmount,
      ]);

      const userOpRequest = {
        target: tokenAddress,
        value: 0n,
        callData: transferCallData,
      };

      const sdk = this.getSDK();
      const eoaAddress = this.eoaAddress!;
      const signFunction = this.getSignFunction();

      console.log(`🚀 [${this.name}] Sending AA UserOperation...`);

      const result = await sdk.sendUserOperationAndWait(
        eoaAddress,
        userOpRequest,
        signFunction
      );

      if (result.status.status === 'success') {
        const txHash = result.status.transactionHash || '';
        console.log(`✅ [${this.name}] AA Transfer successful!`);
        return { success: true, txHash };
      } else {
        const errorReason = result.status.reason || 'Unknown error';
        console.log(`❌ [${this.name}] AA Transfer failed: ${errorReason}`);
        return { success: false, error: errorReason };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ [${this.name}] AA Transfer error: ${errorMessage}`);
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
