import dotenv from 'dotenv';

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

  // Agent signer configuration
  signer: {
    privateKey: process.env.PRIVATE_KEY || '',
  },

  // Payment configuration
  payment: {
    // Default merchant address (can be overridden in orders)
    defaultMerchantAddress: process.env.MERCHANT_ADDRESS || '',
    // Token decimals for USDT
    tokenDecimals: 18,
  },
};

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
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `https://testnet.kitescan.ai/tx/${txHash}`;
}
