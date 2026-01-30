import { ReceptionAgent } from './ReceptionAgent';
import { ApprovalAgent, ApprovalPolicy } from './ApprovalAgent';
import { PaymentAgent } from './PaymentAgent';
import {
  AgentRole,
  AgentMessage,
  CoffeeOrder,
  OrderStatus,
  MultiAgentOrderResponse,
  MultiAgentConfig,
  generateOrderId,
  formatAgentStep,
} from './types';

/**
 * Agent Orchestrator - Coordinates the multi-agent pipeline
 * 
 * Flow: Reception → Approval → Payment
 * 
 * Each agent processes sequentially, and the orchestrator
 * tracks the pipeline state and handles errors.
 */
export class AgentOrchestrator {
  private receptionAgent: ReceptionAgent;
  private approvalAgent: ApprovalAgent;
  private paymentAgent: PaymentAgent;
  private isInitialized: boolean = false;
  private config: MultiAgentConfig;

  constructor(config: MultiAgentConfig) {
    this.config = config;

    // Create agent instances
    this.receptionAgent = new ReceptionAgent(config.reception.privateKey);
    
    const approvalPolicy: ApprovalPolicy = {
      approvalThreshold: config.approvalThreshold,
      maxSinglePayment: config.maxSinglePayment,
      maxDailySpending: config.maxDailySpending,
    };
    this.approvalAgent = new ApprovalAgent(config.approval.privateKey, approvalPolicy);
    
    this.paymentAgent = new PaymentAgent(config.payment.privateKey);
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🤖 Multi-Agent Coffee Shop System');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\nInitializing agents...\n');

    // Initialize all agents in parallel
    await Promise.all([
      this.receptionAgent.initialize(),
      this.approvalAgent.initialize(),
      this.paymentAgent.initialize(),
    ]);

    this.isInitialized = true;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ All agents initialized');
    console.log('═══════════════════════════════════════════════════════');
    this.displayAgentInfo();
  }

  /**
   * Display information about all agents
   */
  displayAgentInfo(): void {
    console.log('\n📋 Agent Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const agents = [
      this.receptionAgent.getInfo(),
      this.approvalAgent.getInfo(),
      this.paymentAgent.getInfo(),
    ];

    agents.forEach((info, index) => {
      if (info) {
        console.log(`\n  ${index + 1}. ${info.name} (${info.role})`);
        console.log(`     EOA: ${info.eoaAddress}`);
        console.log(`     AA:  ${info.aaWalletAddress}`);
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Policy Settings:');
    const policy = this.approvalAgent.getPolicy();
    console.log(`   Approval threshold: ${policy.approvalThreshold} USDT`);
    console.log(`   Max single payment: ${policy.maxSinglePayment} USDT`);
    console.log(`   Max daily spending: ${policy.maxDailySpending} USDT`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Process an order through the multi-agent pipeline
   */
  async processOrder(
    item: string,
    price: number,
    userAddress: string,
    merchantAddress: string
  ): Promise<MultiAgentOrderResponse> {
    if (!this.isInitialized) {
      return {
        success: false,
        status: OrderStatus.FAILED,
        orderId: '',
        pipeline: {},
        error: 'Orchestrator not initialized',
      };
    }

    const orderId = generateOrderId();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  📋 New Order: ${orderId}`);
    console.log('═══════════════════════════════════════════════════════');

    // Create the order
    const order: CoffeeOrder = {
      id: orderId,
      item,
      price,
      currency: 'USDT',
      merchantAddress,
      userAddress,
      timestamp: Date.now(),
    };

    // Initialize the message
    let message: AgentMessage = {
      orderId,
      order,
      status: OrderStatus.RECEIVED,
      pipeline: {},
    };

    try {
      // Step 1: Reception Agent - Validate order
      console.log('\n📍 Step 1/3: Reception');
      message = await this.receptionAgent.process(message);
      
      if (message.status === OrderStatus.REJECTED) {
        return this.createResponse(message);
      }

      // Step 2: Approval Agent - Check policies
      console.log('\n📍 Step 2/3: Approval');
      message = await this.approvalAgent.process(message);
      
      if (message.status === OrderStatus.REJECTED) {
        return this.createResponse(message);
      }

      // Step 3: Payment Agent - Execute transfer
      console.log('\n📍 Step 3/3: Payment');
      message = await this.paymentAgent.process(message);

      // Record spending if successful
      if (message.status === OrderStatus.COMPLETED) {
        this.approvalAgent.recordSpending(order.price);
      }

      return this.createResponse(message);

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      message.status = OrderStatus.FAILED;
      message.error = error instanceof Error ? error.message : 'Unknown error';
      return this.createResponse(message);
    }
  }

  /**
   * Create API response from message
   */
  private createResponse(message: AgentMessage): MultiAgentOrderResponse {
    const response: MultiAgentOrderResponse = {
      success: message.status === OrderStatus.COMPLETED,
      status: message.status,
      orderId: message.orderId,
      pipeline: message.pipeline,
      error: message.error,
    };

    // Add transaction data if available
    if (message.pipeline.payment?.txHash) {
      response.data = {
        order: message.order,
        transactionHash: message.pipeline.payment.txHash,
        explorerUrl: message.pipeline.payment.explorerUrl,
      };
    } else {
      response.data = {
        order: message.order,
      };
    }

    // Log pipeline summary
    this.logPipelineSummary(message);

    return response;
  }

  /**
   * Log a summary of the pipeline execution
   */
  private logPipelineSummary(message: AgentMessage): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📊 Pipeline Summary');
    console.log('═══════════════════════════════════════════════════════');
    
    const steps: string[] = [];
    
    if (message.pipeline.reception) {
      steps.push(formatAgentStep(message.pipeline.reception));
    }
    if (message.pipeline.approval) {
      steps.push(formatAgentStep(message.pipeline.approval));
    }
    if (message.pipeline.payment) {
      steps.push(formatAgentStep(message.pipeline.payment));
    }

    console.log(`\n  ${steps.join(' → ')}`);
    console.log(`\n  Status: ${message.status.toUpperCase()}`);
    
    if (message.pipeline.payment?.txHash) {
      console.log(`  TX: ${message.pipeline.payment.txHash}`);
    }
    
    if (message.error) {
      console.log(`  Error: ${message.error}`);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
  }

  /**
   * Get system information
   */
  getSystemInfo(): {
    initialized: boolean;
    agents: {
      reception: { name: string; aaWallet: string } | null;
      approval: { name: string; aaWallet: string } | null;
      payment: { name: string; aaWallet: string } | null;
    };
    policy: ApprovalPolicy;
    dailySpending: number;
  } {
    return {
      initialized: this.isInitialized,
      agents: {
        reception: this.receptionAgent.getInfo() 
          ? { name: this.receptionAgent.name, aaWallet: this.receptionAgent.aaWalletAddress! }
          : null,
        approval: this.approvalAgent.getInfo()
          ? { name: this.approvalAgent.name, aaWallet: this.approvalAgent.aaWalletAddress! }
          : null,
        payment: this.paymentAgent.getInfo()
          ? { name: this.paymentAgent.name, aaWallet: this.paymentAgent.aaWalletAddress! }
          : null,
      },
      policy: this.approvalAgent.getPolicy(),
      dailySpending: this.approvalAgent.getCurrentDailySpending(),
    };
  }

  /**
   * Get the payment agent's USDT balance
   */
  async getPaymentAgentBalance(): Promise<string> {
    return this.paymentAgent.getUSDTBalance();
  }
}

/**
 * Create and initialize an orchestrator with the given config
 */
export async function createOrchestrator(config: MultiAgentConfig): Promise<AgentOrchestrator> {
  const orchestrator = new AgentOrchestrator(config);
  await orchestrator.initialize();
  return orchestrator;
}
