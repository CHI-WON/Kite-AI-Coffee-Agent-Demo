import { ethers } from 'ethers';
import { GokiteAASDK } from 'gokite-aa-sdk';
import { config } from '../config';
import {
  AgentRole,
  AgentConfig,
  BaseAgentInstance,
  AgentMessage,
  AgentStepRecord,
  AgentActionResult,
} from './types';

/**
 * Base Agent class that all specialized agents extend
 * Handles AA SDK initialization and common functionality
 */
export abstract class BaseAgent {
  protected instance: BaseAgentInstance | null = null;
  protected config: AgentConfig;
  protected isInitialized: boolean = false;

  constructor(agentConfig: AgentConfig) {
    this.config = agentConfig;
  }

  /**
   * Get the agent's role
   */
  get role(): AgentRole {
    return this.config.role;
  }

  /**
   * Get the agent's name
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Get the agent's AA wallet address
   */
  get aaWalletAddress(): string | null {
    return this.instance?.aaWalletAddress || null;
  }

  /**
   * Get the agent's EOA address
   */
  get eoaAddress(): string | null {
    return this.instance?.eoaAddress || null;
  }

  /**
   * Check if agent is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Initialize the agent with Kite AA SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`⚠️  ${this.name} is already initialized`);
      return;
    }

    console.log(`\n🤖 Initializing ${this.name} (${this.config.role})...`);

    if (!this.config.privateKey) {
      throw new Error(`Private key not configured for ${this.name}`);
    }

    // Initialize the Kite AA SDK
    const sdk = new GokiteAASDK(
      config.network.name,
      config.network.rpcUrl,
      config.network.bundlerUrl
    );

    // Create signer from private key
    const provider = new ethers.JsonRpcProvider(config.network.rpcUrl);
    const signer = new ethers.Wallet(this.config.privateKey, provider);
    const eoaAddress = await signer.getAddress();

    // Get the Account Abstraction wallet address
    const aaWalletAddress = sdk.getAccountAddress(eoaAddress);

    // Create the signing function for user operations
    const signFunction = async (userOpHash: string): Promise<string> => {
      const signature = await signer.signMessage(ethers.getBytes(userOpHash));
      return signature;
    };

    this.instance = {
      role: this.config.role,
      name: this.config.name,
      sdk,
      signer,
      eoaAddress,
      aaWalletAddress,
      signFunction,
    };

    this.isInitialized = true;

    console.log(`✅ ${this.name} initialized`);
    console.log(`   EOA: ${eoaAddress.slice(0, 10)}...${eoaAddress.slice(-8)}`);
    console.log(`   AA:  ${aaWalletAddress.slice(0, 10)}...${aaWalletAddress.slice(-8)}`);
  }

  /**
   * Get the SDK instance
   */
  protected getSDK(): GokiteAASDK {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance.sdk;
  }

  /**
   * Get the signer instance
   */
  protected getSigner(): ethers.Wallet {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance.signer;
  }

  /**
   * Get the sign function
   */
  protected getSignFunction(): (userOpHash: string) => Promise<string> {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance.signFunction;
  }

  /**
   * Create a step record for this agent's action
   */
  protected createStepRecord(
    startTime: number,
    result: AgentActionResult,
    message?: string
  ): AgentStepRecord {
    return {
      agent: this.name,
      role: this.config.role,
      aaWallet: this.instance?.aaWalletAddress || '',
      timestamp: startTime,
      duration: Date.now() - startTime,
      result,
      message,
    };
  }

  /**
   * Sign a message to prove this agent processed it
   */
  protected async signMessage(message: string): Promise<string> {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance.signer.signMessage(message);
  }

  /**
   * Abstract method that each agent must implement
   * Processes the incoming message and returns the updated message
   */
  abstract process(message: AgentMessage): Promise<AgentMessage>;

  /**
   * Get agent info for display
   */
  getInfo(): { name: string; role: AgentRole; eoaAddress: string; aaWalletAddress: string } | null {
    if (!this.instance) return null;
    return {
      name: this.name,
      role: this.config.role,
      eoaAddress: this.instance.eoaAddress,
      aaWalletAddress: this.instance.aaWalletAddress,
    };
  }
}
