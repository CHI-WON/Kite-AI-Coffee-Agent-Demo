import dotenv from 'dotenv';
import { MultiAgentConfig, AgentRole } from './agents/types';

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * All sensitive values are loaded from environment variables
 */
export const config = {
  // Network configuration
  network: {
    name: 'kite_testnet',
    rpcUrl: process.env.RPC_URL || 'https://rpc-testnet.gokite.ai',
    bundlerUrl: process.env.BUNDLER_URL || 'https://bundler-service.staging.gokite.ai/rpc/',
    chainId: 2368, // Kite testnet chain ID
  },

  // Contract addresses on Kite Testnet
  contracts: {
    // USDT Settlement Token on Kite Testnet
    settlementToken: '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
    // Settlement Contract
    settlementContract: '0x8d9FaD78d5Ce247aA01C140798B9558fd64a63E3',
    // ClientAgentVault Implementation
    vaultImplementation: '0xB5AAFCC6DD4DFc2B80fb8BCcf406E1a2Fd559e23',
  },

  // Agent signer configuration (legacy - for single agent mode)
  signer: {
    privateKey: process.env.PRIVATE_KEY || '',
  },

  // Payment configuration
  payment: {
    // Default merchant address (can be overridden in orders)
    defaultMerchantAddress: process.env.MERCHANT_ADDRESS || '',
    // Token decimals for USDT (Kite Testnet Test USD uses 18 decimals)
    tokenDecimals: 18,
  },

  // Multi-Agent configuration
  multiAgent: {
    // Use separate keys if provided, otherwise fallback to single PRIVATE_KEY
    receptionKey: process.env.RECEPTION_AGENT_KEY || process.env.PRIVATE_KEY || '',
    approvalKey: process.env.APPROVAL_AGENT_KEY || process.env.PRIVATE_KEY || '',
    paymentKey: process.env.PAYMENT_AGENT_KEY || process.env.PRIVATE_KEY || '',
    // Policy settings
    approvalThreshold: parseFloat(process.env.APPROVAL_THRESHOLD || '0.5'),
    maxSinglePayment: parseFloat(process.env.MAX_SINGLE_PAYMENT || '1.0'),
    maxDailySpending: parseFloat(process.env.MAX_DAILY_SPENDING || '10.0'),
  },
};

/**
 * Get Multi-Agent configuration
 */
export function getMultiAgentConfig(): MultiAgentConfig {
  return {
    reception: {
      role: AgentRole.RECEPTION,
      name: 'ReceptionAgent',
      privateKey: config.multiAgent.receptionKey,
    },
    approval: {
      role: AgentRole.APPROVAL,
      name: 'ApprovalAgent',
      privateKey: config.multiAgent.approvalKey,
    },
    payment: {
      role: AgentRole.PAYMENT,
      name: 'PaymentAgent',
      privateKey: config.multiAgent.paymentKey,
    },
    approvalThreshold: config.multiAgent.approvalThreshold,
    maxSinglePayment: config.multiAgent.maxSinglePayment,
    maxDailySpending: config.multiAgent.maxDailySpending,
  };
}

/**
 * Validate that all required configuration is present
 */
export function validateConfig(): void {
  if (!config.signer.privateKey) {
    throw new Error('PRIVATE_KEY is required in .env file');
  }

  if (config.signer.privateKey === 'your_testnet_private_key_here') {
    throw new Error('Please replace the placeholder PRIVATE_KEY with your actual testnet private key');
  }

  console.log('✅ Configuration validated successfully');
}

/**
 * Validate Multi-Agent configuration
 */
export function validateMultiAgentConfig(): void {
  const { receptionKey, approvalKey, paymentKey } = config.multiAgent;

  if (!receptionKey || !approvalKey || !paymentKey) {
    throw new Error('All agent private keys are required. Set PRIVATE_KEY or individual agent keys.');
  }

  // Check for placeholder values
  const placeholders = ['your_testnet_private_key_here', ''];
  if (placeholders.includes(receptionKey) || 
      placeholders.includes(approvalKey) || 
      placeholders.includes(paymentKey)) {
    throw new Error('Please replace placeholder private keys with actual testnet private keys');
  }

  console.log('✅ Multi-Agent configuration validated');
  console.log(`   Reception Key: ${receptionKey.slice(0, 6)}...${receptionKey.slice(-4)}`);
  console.log(`   Approval Key:  ${approvalKey.slice(0, 6)}...${approvalKey.slice(-4)}`);
  console.log(`   Payment Key:   ${paymentKey.slice(0, 6)}...${paymentKey.slice(-4)}`);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://testnet.kitescan.ai/tx/${txHash}`;
}
