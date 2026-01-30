import { ethers } from 'ethers';
import { GokiteAASDK } from 'gokite-aa-sdk';
import { config } from '../config';

/**
 * Agent instance containing SDK and signer information
 */
export interface AgentInstance {
  sdk: GokiteAASDK;
  signer: ethers.Wallet;
  eoaAddress: string;
  aaWalletAddress: string;
  signFunction: (userOpHash: string) => Promise<string>;
}

/**
 * Create and initialize a Kite AA Agent
 * @returns Initialized agent instance with SDK and signing capabilities
 */
export async function createAgent(): Promise<AgentInstance> {
  console.log('\n🤖 Creating Kite AA Agent...');
  console.log(`   Network: ${config.network.name}`);
  console.log(`   RPC URL: ${config.network.rpcUrl}`);

  // Initialize the Kite AA SDK
  const sdk = new GokiteAASDK(
    config.network.name,
    config.network.rpcUrl,
    config.network.bundlerUrl
  );
  console.log('✅ Kite AA SDK initialized');

  // Create signer from private key
  const provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
  const signer = new ethers.Wallet(config.signer.privateKey, provider);
  const eoaAddress = await signer.getAddress();
  console.log(`✅ EOA Signer created: ${eoaAddress}`);

  // Get the Account Abstraction wallet address
  const aaWalletAddress = sdk.getAccountAddress(eoaAddress);
  console.log(`✅ AA Wallet Address: ${aaWalletAddress}`);

  // Create the signing function for user operations
  const signFunction = async (userOpHash: string): Promise<string> => {
    console.log('🔐 Signing user operation...');
    const signature = await signer.signMessage(ethers.getBytes(userOpHash));
    return signature;
  };

  console.log('\n🎉 Agent created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   EOA Address:       ${eoaAddress}`);
  console.log(`   AA Wallet Address: ${aaWalletAddress}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    sdk,
    signer,
    eoaAddress,
    aaWalletAddress,
    signFunction,
  };
}

/**
 * Check agent's native token balance
 * @param agent - The agent instance
 * @returns Balance in ETH
 */
export async function getAgentBalance(agent: AgentInstance): Promise<string> {
  const provider = agent.signer.provider;
  if (!provider) {
    throw new Error('Provider not available');
  }

  const balance = await provider.getBalance(agent.aaWalletAddress);
  return ethers.formatEther(balance);
}

/**
 * Check agent's token balance (USDT)
 * @param agent - The agent instance
 * @param tokenAddress - The token contract address
 * @returns Token balance
 */
export async function getAgentTokenBalance(
  agent: AgentInstance,
  tokenAddress: string = config.contracts.settlementToken
): Promise<string> {
  const provider = agent.signer.provider;
  if (!provider) {
    throw new Error('Provider not available');
  }

  const tokenAbi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ];

  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  
  try {
    const balance = await tokenContract.balanceOf(agent.aaWalletAddress);
    const decimals = await tokenContract.decimals();
    const symbol = await tokenContract.symbol();
    
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log(`💰 Token Balance: ${formattedBalance} ${symbol}`);
    
    return formattedBalance;
  } catch (error) {
    console.log('⚠️  Could not fetch token balance (token may not be deployed or no balance)');
    return '0';
  }
}

/**
 * Display agent information
 * @param agent - The agent instance
 */
export async function displayAgentInfo(agent: AgentInstance): Promise<void> {
  console.log('\n📊 Agent Information:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const nativeBalance = await getAgentBalance(agent);
  console.log(`   Native Balance: ${nativeBalance} KITE`);
  
  await getAgentTokenBalance(agent);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
