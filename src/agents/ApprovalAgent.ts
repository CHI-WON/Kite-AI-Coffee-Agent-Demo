import { BaseAgent } from './BaseAgent';
import {
  AgentRole,
  AgentConfig,
  AgentMessage,
  OrderStatus,
} from './types';

/**
 * Approval policy configuration
 */
export interface ApprovalPolicy {
  approvalThreshold: number;  // Orders above this require approval
  maxSinglePayment: number;   // Maximum allowed per transaction
  maxDailySpending: number;   // Maximum daily spending
}

/**
 * Approval Agent - Second agent in the pipeline
 * Responsibilities:
 * - Review orders against spending policies
 * - Approve or reject orders based on rules
 * - Track daily spending
 */
export class ApprovalAgent extends BaseAgent {
  private policy: ApprovalPolicy;
  private dailySpending: number = 0;
  private lastResetTime: number = Date.now();
  private readonly DAY_IN_MS = 24 * 60 * 60 * 1000;

  constructor(privateKey: string, policy: ApprovalPolicy) {
    const agentConfig: AgentConfig = {
      role: AgentRole.APPROVAL,
      name: 'ApprovalAgent',
      privateKey,
    };
    super(agentConfig);
    this.policy = policy;
  }

  /**
   * Reset daily spending if 24 hours have passed
   */
  private checkAndResetDailySpending(): void {
    const now = Date.now();
    if (now - this.lastResetTime >= this.DAY_IN_MS) {
      console.log(`📊 [${this.name}] Resetting daily spending counter`);
      this.dailySpending = 0;
      this.lastResetTime = now;
    }
  }

  /**
   * Get current daily spending
   */
  getCurrentDailySpending(): number {
    this.checkAndResetDailySpending();
    return this.dailySpending;
  }

  /**
   * Record a payment to daily spending
   */
  recordSpending(amount: number): void {
    this.checkAndResetDailySpending();
    this.dailySpending += amount;
  }

  /**
   * Check if order meets approval criteria
   */
  private evaluateOrder(amount: number): { approved: boolean; reason?: string } {
    this.checkAndResetDailySpending();

    // Check maximum single payment limit
    if (amount > this.policy.maxSinglePayment) {
      return {
        approved: false,
        reason: `Amount ${amount} USDT exceeds maximum single payment limit of ${this.policy.maxSinglePayment} USDT`,
      };
    }

    // Check daily spending limit
    const projectedSpending = this.dailySpending + amount;
    if (projectedSpending > this.policy.maxDailySpending) {
      return {
        approved: false,
        reason: `Order would exceed daily spending limit. Current: ${this.dailySpending}, Requested: ${amount}, Limit: ${this.policy.maxDailySpending}`,
      };
    }

    // Determine if this requires special approval (above threshold but within limits)
    const requiresApproval = amount > this.policy.approvalThreshold;
    
    if (requiresApproval) {
      console.log(`⚠️  [${this.name}] High-value order (>${this.policy.approvalThreshold} USDT) - applying additional scrutiny`);
    }

    return { approved: true };
  }

  /**
   * Process order approval request
   */
  async process(message: AgentMessage): Promise<AgentMessage> {
    const startTime = Date.now();
    console.log(`\n🔍 [${this.name}] Reviewing order ${message.orderId}...`);

    if (!this.initialized) {
      throw new Error(`${this.name} is not initialized`);
    }

    // Verify order came from reception
    if (message.previousAgent !== AgentRole.RECEPTION) {
      console.log(`❌ [${this.name}] Invalid pipeline - order must come from ReceptionAgent`);
      message.status = OrderStatus.REJECTED;
      message.error = 'Invalid processing pipeline';
      message.pipeline.approval = this.createStepRecord(startTime, 'rejected', 'Invalid pipeline');
      return message;
    }

    const amount = message.order.price;

    // Log current spending stats
    console.log(`   Current daily spending: ${this.dailySpending.toFixed(4)} USDT`);
    console.log(`   Requested amount: ${amount} USDT`);
    console.log(`   Max single: ${this.policy.maxSinglePayment} USDT`);
    console.log(`   Max daily: ${this.policy.maxDailySpending} USDT`);

    // Evaluate the order
    const evaluation = this.evaluateOrder(amount);

    if (!evaluation.approved) {
      console.log(`❌ [${this.name}] Order rejected: ${evaluation.reason}`);
      
      message.status = OrderStatus.REJECTED;
      message.error = evaluation.reason;
      message.pipeline.approval = this.createStepRecord(startTime, 'rejected', evaluation.reason);
      
      return message;
    }

    // Order approved - create step record with signature
    const approvalMessage = `Order ${message.orderId} approved for ${amount} USDT at ${startTime}`;
    const stepRecord = this.createStepRecord(startTime, 'approved', 'Order approved');
    stepRecord.signature = await this.signMessage(approvalMessage);

    message.pipeline.approval = stepRecord;
    message.status = OrderStatus.APPROVED;
    message.previousAgent = AgentRole.APPROVAL;

    console.log(`✅ [${this.name}] Order approved (${stepRecord.duration}ms)`);

    return message;
  }

  /**
   * Get current policy settings
   */
  getPolicy(): ApprovalPolicy {
    return { ...this.policy };
  }
}
