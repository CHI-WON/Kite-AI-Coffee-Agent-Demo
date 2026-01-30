import { ethers } from 'ethers';
import { AgentInstance } from '../agent/createAgent';
import { config, getExplorerUrl } from '../config';

/**
 * Payment request structure
 */
export interface PaymentRequest {
  recipientAddress: string;
  amount: number;
  tokenAddress?: string;
}

/**
 * Payment result structure
 */
export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
}

/**
 * Execute a USDT token transfer using the agent's AA wallet
 * @param agent - The initialized agent instance
 * @param request - The payment request details
 * @returns Payment result with transaction hash
 */
export async function payWithAgent(
  agent: AgentInstance,
  request: PaymentRequest
): Promise<PaymentResult> {
  const tokenAddress = request.tokenAddress || config.contracts.settlementToken;
  const tokenDecimals = config.payment.tokenDecimals;

  console.log('\n💳 Initiating payment...');
  console.log(`   Recipient: ${request.recipientAddress}`);
  console.log(`   Amount: ${request.amount} USDT`);
  console.log(`   Token Contract: ${tokenAddress}`);

  try {
    // Encode the ERC20 transfer function call
    const erc20Interface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    const transferAmount = ethers.parseUnits(request.amount.toString(), tokenDecimals);
    const transferCallData = erc20Interface.encodeFunctionData('transfer', [
      request.recipientAddress,
      transferAmount,
    ]);

    console.log('📝 Constructing user operation...');
    console.log(`   Transfer amount (wei): ${transferAmount.toString()}`);

    // Construct the user operation request
    const userOpRequest = {
      target: tokenAddress,
      value: 0n, // No ETH value for token transfer
      callData: transferCallData,
    };

    console.log('🚀 Sending user operation to bundler...');

    // Send the user operation and wait for result
    const result = await agent.sdk.sendUserOperationAndWait(
      agent.eoaAddress,
      userOpRequest,
      agent.signFunction
    );

    // Check the result status
    if (result.status.status === 'success') {
      const txHash = result.status.transactionHash || '';
      const explorerUrl = getExplorerUrl(txHash);

      console.log('\n✅ Payment successful!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer URL: ${explorerUrl}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return {
        success: true,
        transactionHash: txHash,
        explorerUrl,
      };
    } else {
      const errorReason = result.status.reason || 'Unknown error';
      console.log('\n❌ Payment failed!');
      console.log(`   Reason: ${errorReason}`);

      return {
        success: false,
        error: errorReason,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.log('\n❌ Payment error!');
    console.log(`   Error: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute a batch payment with multiple transfers
 * @param agent - The initialized agent instance
 * @param requests - Array of payment requests
 * @returns Payment result
 */
export async function batchPayWithAgent(
  agent: AgentInstance,
  requests: PaymentRequest[]
): Promise<PaymentResult> {
  const tokenAddress = config.contracts.settlementToken;
  const tokenDecimals = config.payment.tokenDecimals;

  console.log('\n💳 Initiating batch payment...');
  console.log(`   Number of payments: ${requests.length}`);

  try {
    const erc20Interface = new ethers.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    // Build batch request arrays
    const targets: string[] = [];
    const values: bigint[] = [];
    const callDatas: string[] = [];

    for (const request of requests) {
      const transferAmount = ethers.parseUnits(request.amount.toString(), tokenDecimals);
      const transferCallData = erc20Interface.encodeFunctionData('transfer', [
        request.recipientAddress,
        transferAmount,
      ]);

      targets.push(request.tokenAddress || tokenAddress);
      values.push(0n);
      callDatas.push(transferCallData);

      console.log(`   - ${request.amount} USDT to ${request.recipientAddress}`);
    }

    console.log('🚀 Sending batch user operation to bundler...');

    // Send batch user operation
    const result = await agent.sdk.sendUserOperationAndWait(
      agent.eoaAddress,
      {
        targets,
        values,
        callDatas,
      },
      agent.signFunction
    );

    if (result.status.status === 'success') {
      const txHash = result.status.transactionHash || '';
      const explorerUrl = getExplorerUrl(txHash);

      console.log('\n✅ Batch payment successful!');
      console.log(`   Transaction Hash: ${txHash}`);
      console.log(`   Explorer URL: ${explorerUrl}`);

      return {
        success: true,
        transactionHash: txHash,
        explorerUrl,
      };
    } else {
      return {
        success: false,
        error: result.status.reason || 'Batch payment failed',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
