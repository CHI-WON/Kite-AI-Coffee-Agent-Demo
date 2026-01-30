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
  ProcessingPipeline,
  generateOrderId,
  formatAgentStep,
} from './types';
import {
  AIDecisionEngine,
  AIContext,
  AIDecision,
  AIDecisionResult,
  UserIntent,
  IntentOrderRequest,
  AIEnhancedOrderResponse,
} from '../ai';

/**
 * Agent Orchestrator - Coordinates the multi-agent pipeline
 * 
 * Enhanced with AI Decision Engine for transparent decision-making.
 * 
 * Flow: AI Decision → Reception → Approval → Payment
 * 
 * The AI layer evaluates the request FIRST, providing:
 * - Risk assessment
 * - Clear reasoning
 * - Approve/Reject/Confirm decision
 */
export class AgentOrchestrator {
  private receptionAgent: ReceptionAgent;
  private approvalAgent: ApprovalAgent;
  private paymentAgent: PaymentAgent;
  private aiEngine: AIDecisionEngine;
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

    // Initialize AI Decision Engine with matching config
    this.aiEngine = new AIDecisionEngine({
      maxSinglePayment: config.maxSinglePayment,
      maxDailySpending: config.maxDailySpending,
    });
  }

  /**
   * Initialize all agents
   */
  async initialize(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🤖 AI-Enhanced Multi-Agent Coffee Shop System');
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
    console.log('  🧠 AI Decision Engine: ACTIVE');
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
    console.log('\n🧠 AI Decision Engine Settings:');
    const aiConfig = this.aiEngine.getConfig();
    console.log(`   Auto-approve confidence: >${(aiConfig.autoApproveThreshold * 100).toFixed(0)}%`);
    console.log(`   Auto-reject confidence: <${(aiConfig.autoRejectThreshold * 100).toFixed(0)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Process an order with AI decision layer
   * This is the NEW main entry point that includes AI reasoning
   */
  async processOrderWithAI(
    request: IntentOrderRequest,
    merchantAddress: string
  ): Promise<AIEnhancedOrderResponse> {
    if (!this.isInitialized) {
      return {
        success: false,
        orderId: '',
        aiDecision: this.createFailedAIDecision('Orchestrator not initialized'),
        error: 'Orchestrator not initialized',
      };
    }

    const orderId = generateOrderId();
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  📋 New AI-Enhanced Order: ${orderId}`);
    console.log(`  Intent: ${request.intent}`);
    console.log('═══════════════════════════════════════════════════════');

    // Get agent balance for AI context
    let agentBalance = 0;
    try {
      agentBalance = parseFloat(await this.paymentAgent.getUSDTBalance());
    } catch {
      console.log('⚠️ Could not fetch agent balance, using 0');
    }

    // ═══════════════════════════════════════════════════════
    // Step 0: AI Decision - Evaluate before any agent processing
    // ═══════════════════════════════════════════════════════
    console.log('\n📍 Step 0/3: AI Decision Layer');
    
    const aiContext: AIContext = {
      userAddress: request.userAddress,
      intent: request.intent,
      item: request.item,
      price: request.price,
      quantity: request.quantity || 1,
      recentOrderCount: this.aiEngine.getRecentOrderCount(request.userAddress),
      totalDailySpending: this.approvalAgent.getCurrentDailySpending(),
      agentBalance,
      currentTime: Date.now(),
      metadata: request.metadata,
    };

    const aiDecision = await this.aiEngine.evaluate(aiContext);

    // If AI rejects, don't proceed to agent pipeline
    if (aiDecision.decision === AIDecision.REJECT) {
      return {
        success: false,
        orderId,
        aiDecision,
        error: aiDecision.summary,
      };
    }

    // If AI requests confirmation, return for user confirmation
    if (aiDecision.decision === AIDecision.CONFIRM) {
      return {
        success: false,
        orderId,
        aiDecision,
        error: 'Confirmation required',
      };
    }

    // AI approved - proceed to agent pipeline
    // ═══════════════════════════════════════════════════════
    // Continue with existing agent pipeline
    // ═══════════════════════════════════════════════════════
    
    const order: CoffeeOrder = {
      id: orderId,
      item: request.item,
      price: request.price,
      currency: 'USDT',
      merchantAddress,
      userAddress: request.userAddress,
      timestamp: Date.now(),
    };

    let message: AgentMessage = {
      orderId,
      order,
      status: OrderStatus.RECEIVED,
      pipeline: {},
    };

    try {
      // Step 1: Reception Agent
      console.log('\n📍 Step 1/3: Reception');
      message = await this.receptionAgent.process(message);
      
      if (message.status === OrderStatus.REJECTED) {
        return this.createEnhancedResponse(message, aiDecision);
      }

      // Step 2: Approval Agent
      console.log('\n📍 Step 2/3: Approval');
      message = await this.approvalAgent.process(message);
      
      if (message.status === OrderStatus.REJECTED) {
        return this.createEnhancedResponse(message, aiDecision);
      }

      // Step 3: Payment Agent
      console.log('\n📍 Step 3/3: Payment');
      message = await this.paymentAgent.process(message);

      // Record spending if successful
      if (message.status === OrderStatus.COMPLETED) {
        this.approvalAgent.recordSpending(order.price);
      }

      return this.createEnhancedResponse(message, aiDecision);

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      message.status = OrderStatus.FAILED;
      message.error = error instanceof Error ? error.message : 'Unknown error';
      return this.createEnhancedResponse(message, aiDecision);
    }
  }

  /**
   * Legacy method - Process order without AI (kept for backward compatibility)
   */
  async processOrder(
    item: string,
    price: number,
    userAddress: string,
    merchantAddress: string
  ): Promise<MultiAgentOrderResponse> {
    // Convert to new format and use AI-enhanced method
    const request: IntentOrderRequest = {
      intent: UserIntent.BUY_COFFEE,
      item,
      price,
      userAddress,
    };

    const aiResponse = await this.processOrderWithAI(request, merchantAddress);
    
    // Convert to legacy response format
    return {
      success: aiResponse.success,
      status: aiResponse.transaction?.status === 'confirmed' 
        ? OrderStatus.COMPLETED 
        : aiResponse.error ? OrderStatus.REJECTED : OrderStatus.FAILED,
      orderId: aiResponse.orderId,
      pipeline: (aiResponse.pipeline || {}) as ProcessingPipeline,
      data: aiResponse.transaction ? {
        order: {
          id: aiResponse.orderId,
          item,
          price,
          currency: 'USDT',
          merchantAddress,
          userAddress,
          timestamp: Date.now(),
        },
        transactionHash: aiResponse.transaction.hash,
        explorerUrl: aiResponse.transaction.explorerUrl,
      } : undefined,
      error: aiResponse.error,
    };
  }

  /**
   * Create enhanced response with AI decision
   */
  private createEnhancedResponse(
    message: AgentMessage,
    aiDecision: AIDecisionResult
  ): AIEnhancedOrderResponse {
    const response: AIEnhancedOrderResponse = {
      success: message.status === OrderStatus.COMPLETED,
      orderId: message.orderId,
      aiDecision,
      pipeline: {
        reception: message.pipeline.reception,
        approval: message.pipeline.approval,
        payment: message.pipeline.payment,
      },
      error: message.error,
    };

    // Add transaction details if available
    if (message.pipeline.payment?.txHash) {
      response.transaction = {
        hash: message.pipeline.payment.txHash,
        explorerUrl: message.pipeline.payment.explorerUrl || '',
        status: message.status === OrderStatus.COMPLETED ? 'confirmed' : 'failed',
      };
    }

    // Log summary
    this.logEnhancedSummary(message, aiDecision);

    return response;
  }

  /**
   * Create a failed AI decision result
   */
  private createFailedAIDecision(reason: string): AIDecisionResult {
    return {
      decision: AIDecision.REJECT,
      confidence: 0,
      riskLevel: 'critical' as any,
      reasoning: [{
        check: 'System Check',
        result: 'fail',
        detail: reason,
        weight: 1,
      }],
      summary: `❌ System Error: ${reason}`,
      processingTime: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Log enhanced summary with AI decision
   */
  private logEnhancedSummary(message: AgentMessage, aiDecision: AIDecisionResult): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📊 AI-Enhanced Pipeline Summary');
    console.log('═══════════════════════════════════════════════════════');
    
    console.log(`\n  🧠 AI Decision: ${aiDecision.decision.toUpperCase()}`);
    console.log(`     Confidence: ${(aiDecision.confidence * 100).toFixed(0)}%`);
    console.log(`     Risk: ${aiDecision.riskLevel}`);
    
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

    if (steps.length > 0) {
      console.log(`\n  Pipeline: ${steps.join(' → ')}`);
    }
    
    console.log(`\n  Final Status: ${message.status.toUpperCase()}`);
    
    if (message.pipeline.payment?.txHash) {
      console.log(`  TX: ${message.pipeline.payment.txHash}`);
    }
    
    if (message.error) {
      console.log(`  Error: ${message.error}`);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
  }

  /**
   * Get system information including AI engine status
   */
  getSystemInfo(): {
    initialized: boolean;
    aiEnabled: boolean;
    agents: {
      reception: { name: string; aaWallet: string } | null;
      approval: { name: string; aaWallet: string } | null;
      payment: { name: string; aaWallet: string } | null;
    };
    policy: ApprovalPolicy;
    aiConfig: {
      maxSinglePayment: number;
      maxDailySpending: number;
      autoApproveThreshold: number;
      autoRejectThreshold: number;
    };
    dailySpending: number;
  } {
    const aiConfig = this.aiEngine.getConfig();
    return {
      initialized: this.isInitialized,
      aiEnabled: true,
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
      aiConfig: {
        maxSinglePayment: aiConfig.maxSinglePayment,
        maxDailySpending: aiConfig.maxDailySpending,
        autoApproveThreshold: aiConfig.autoApproveThreshold,
        autoRejectThreshold: aiConfig.autoRejectThreshold,
      },
      dailySpending: this.approvalAgent.getCurrentDailySpending(),
    };
  }

  /**
   * Get the payment agent's USDT balance
   */
  async getPaymentAgentBalance(): Promise<string> {
    return this.paymentAgent.getUSDTBalance();
  }

  /**
   * Get the AI Decision Engine instance
   */
  getAIEngine(): AIDecisionEngine {
    return this.aiEngine;
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
