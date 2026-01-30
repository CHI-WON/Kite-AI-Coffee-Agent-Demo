/**
 * AI Decision Engine
 * 
 * This is the core "AI brain" of the payment agent.
 * It evaluates user intents, analyzes context, and makes
 * transparent decisions with clear reasoning.
 * 
 * Design Philosophy:
 * - Every decision must be explainable
 * - No black-box automation
 * - Rule-based intelligence with weighted scoring
 */

import {
  AIContext,
  AIDecision,
  AIDecisionResult,
  ReasoningStep,
  RiskLevel,
  UserIntent,
} from './types';

/**
 * Configuration for the AI Decision Engine
 */
interface AIEngineConfig {
  // Thresholds
  maxSinglePayment: number;      // Max amount per transaction
  maxDailySpending: number;      // Max daily total
  maxOrdersPerHour: number;      // Rate limiting
  minAgentBalance: number;       // Minimum balance buffer
  
  // Confidence thresholds
  autoApproveThreshold: number;  // Above this → auto approve
  autoRejectThreshold: number;   // Below this → auto reject
  
  // Time-based rules (hours in 24h format)
  businessHoursStart: number;
  businessHoursEnd: number;
}

const DEFAULT_CONFIG: AIEngineConfig = {
  maxSinglePayment: 1.0,
  maxDailySpending: 10.0,
  maxOrdersPerHour: 10,
  minAgentBalance: 0.5,
  autoApproveThreshold: 0.8,
  autoRejectThreshold: 0.3,
  businessHoursStart: 6,   // 6 AM
  businessHoursEnd: 23,    // 11 PM
};

/**
 * AI Decision Engine - Makes intelligent payment decisions
 */
export class AIDecisionEngine {
  private config: AIEngineConfig;
  private orderHistory: Map<string, number[]> = new Map(); // userAddress → timestamps

  constructor(config: Partial<AIEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main entry point - Evaluate a payment request
   * Returns a decision with full reasoning chain
   */
  async evaluate(context: AIContext): Promise<AIDecisionResult> {
    const startTime = Date.now();
    const reasoning: ReasoningStep[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    console.log('\n🧠 AI Decision Engine - Evaluating request...');
    console.log(`   Intent: ${context.intent}`);
    console.log(`   Amount: ${context.price} USDT`);

    // ═══════════════════════════════════════════════════════
    // Step 1: Intent Validation
    // ═══════════════════════════════════════════════════════
    const intentCheck = this.checkIntent(context);
    reasoning.push(intentCheck);
    totalScore += intentCheck.result === 'pass' ? intentCheck.weight : 
                  intentCheck.result === 'warn' ? intentCheck.weight * 0.5 : 0;
    totalWeight += intentCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Step 2: Amount Validation
    // ═══════════════════════════════════════════════════════
    const amountCheck = this.checkAmount(context);
    reasoning.push(amountCheck);
    totalScore += amountCheck.result === 'pass' ? amountCheck.weight : 
                  amountCheck.result === 'warn' ? amountCheck.weight * 0.5 : 0;
    totalWeight += amountCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Step 3: Daily Limit Check
    // ═══════════════════════════════════════════════════════
    const dailyCheck = this.checkDailyLimit(context);
    reasoning.push(dailyCheck);
    totalScore += dailyCheck.result === 'pass' ? dailyCheck.weight : 
                  dailyCheck.result === 'warn' ? dailyCheck.weight * 0.5 : 0;
    totalWeight += dailyCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Step 4: Balance Sufficiency
    // ═══════════════════════════════════════════════════════
    const balanceCheck = this.checkBalance(context);
    reasoning.push(balanceCheck);
    totalScore += balanceCheck.result === 'pass' ? balanceCheck.weight : 0;
    totalWeight += balanceCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Step 5: Rate Limiting (Frequency Check)
    // ═══════════════════════════════════════════════════════
    const rateCheck = this.checkOrderFrequency(context);
    reasoning.push(rateCheck);
    totalScore += rateCheck.result === 'pass' ? rateCheck.weight : 
                  rateCheck.result === 'warn' ? rateCheck.weight * 0.5 : 0;
    totalWeight += rateCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Step 6: Time-based Rules
    // ═══════════════════════════════════════════════════════
    const timeCheck = this.checkBusinessHours(context);
    reasoning.push(timeCheck);
    totalScore += timeCheck.result === 'pass' ? timeCheck.weight : 
                  timeCheck.result === 'warn' ? timeCheck.weight * 0.5 : 0;
    totalWeight += timeCheck.weight;

    // ═══════════════════════════════════════════════════════
    // Calculate Final Decision
    // ═══════════════════════════════════════════════════════
    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
    const riskLevel = this.assessRisk(reasoning, confidence);
    const decision = this.makeDecision(reasoning, confidence, context);
    const summary = this.generateSummary(decision, reasoning, context);
    const suggestions = this.generateSuggestions(decision, reasoning);

    const result: AIDecisionResult = {
      decision,
      confidence: Math.round(confidence * 100) / 100,
      riskLevel,
      reasoning,
      summary,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      processingTime: Date.now() - startTime,
      timestamp: Date.now(),
    };

    // Log the decision
    this.logDecision(result);

    return result;
  }

  /**
   * Check if the user intent is valid and reasonable
   */
  private checkIntent(context: AIContext): ReasoningStep {
    const { intent } = context;
    
    // Cancel orders can't proceed
    if (intent === UserIntent.CANCEL_ORDER) {
      return {
        check: 'Intent Validation',
        result: 'fail',
        detail: 'Cancel requests cannot proceed to payment',
        weight: 1.0,
      };
    }

    // Bulk orders need extra scrutiny
    if (intent === UserIntent.BULK_ORDER && context.quantity > 5) {
      return {
        check: 'Intent Validation',
        result: 'warn',
        detail: `Bulk order with ${context.quantity} items requires review`,
        weight: 0.8,
      };
    }

    // Normal intents pass
    return {
      check: 'Intent Validation',
      result: 'pass',
      detail: `Intent "${intent}" is valid for payment processing`,
      weight: 0.8,
    };
  }

  /**
   * Check if the payment amount is within acceptable limits
   */
  private checkAmount(context: AIContext): ReasoningStep {
    const { price } = context;
    const { maxSinglePayment } = this.config;

    if (price <= 0) {
      return {
        check: 'Amount Validation',
        result: 'fail',
        detail: 'Payment amount must be positive',
        weight: 1.0,
      };
    }

    if (price > maxSinglePayment) {
      return {
        check: 'Amount Validation',
        result: 'fail',
        detail: `Amount ${price} USDT exceeds limit of ${maxSinglePayment} USDT`,
        weight: 1.0,
      };
    }

    if (price > maxSinglePayment * 0.8) {
      return {
        check: 'Amount Validation',
        result: 'warn',
        detail: `Amount ${price} USDT is close to limit (${maxSinglePayment} USDT)`,
        weight: 0.9,
      };
    }

    return {
      check: 'Amount Validation',
      result: 'pass',
      detail: `Amount ${price} USDT is within acceptable range`,
      weight: 0.9,
    };
  }

  /**
   * Check if daily spending limit would be exceeded
   */
  private checkDailyLimit(context: AIContext): ReasoningStep {
    const { price, totalDailySpending } = context;
    const { maxDailySpending } = this.config;
    const projectedTotal = totalDailySpending + price;

    if (projectedTotal > maxDailySpending) {
      return {
        check: 'Daily Limit Check',
        result: 'fail',
        detail: `Would exceed daily limit: ${projectedTotal.toFixed(2)}/${maxDailySpending} USDT`,
        weight: 0.9,
      };
    }

    if (projectedTotal > maxDailySpending * 0.9) {
      return {
        check: 'Daily Limit Check',
        result: 'warn',
        detail: `Approaching daily limit: ${projectedTotal.toFixed(2)}/${maxDailySpending} USDT`,
        weight: 0.7,
      };
    }

    return {
      check: 'Daily Limit Check',
      result: 'pass',
      detail: `Daily spending OK: ${projectedTotal.toFixed(2)}/${maxDailySpending} USDT`,
      weight: 0.7,
    };
  }

  /**
   * Check if agent has sufficient balance
   */
  private checkBalance(context: AIContext): ReasoningStep {
    const { price, agentBalance } = context;
    const { minAgentBalance } = this.config;
    const remainingAfter = agentBalance - price;

    if (agentBalance < price) {
      return {
        check: 'Balance Check',
        result: 'fail',
        detail: `Insufficient balance: ${agentBalance.toFixed(2)} USDT < ${price} USDT needed`,
        weight: 1.0,
      };
    }

    if (remainingAfter < minAgentBalance) {
      return {
        check: 'Balance Check',
        result: 'warn',
        detail: `Low balance warning: ${remainingAfter.toFixed(2)} USDT remaining after payment`,
        weight: 0.8,
      };
    }

    return {
      check: 'Balance Check',
      result: 'pass',
      detail: `Sufficient balance: ${agentBalance.toFixed(2)} USDT available`,
      weight: 0.8,
    };
  }

  /**
   * Check order frequency to prevent abuse
   */
  private checkOrderFrequency(context: AIContext): ReasoningStep {
    const { userAddress, recentOrderCount } = context;
    const { maxOrdersPerHour } = this.config;

    // Track this request
    this.recordOrder(userAddress);

    if (recentOrderCount >= maxOrdersPerHour) {
      return {
        check: 'Rate Limit Check',
        result: 'fail',
        detail: `Too many orders: ${recentOrderCount}/${maxOrdersPerHour} per hour`,
        weight: 0.7,
      };
    }

    if (recentOrderCount >= maxOrdersPerHour * 0.7) {
      return {
        check: 'Rate Limit Check',
        result: 'warn',
        detail: `High order frequency: ${recentOrderCount}/${maxOrdersPerHour} per hour`,
        weight: 0.5,
      };
    }

    return {
      check: 'Rate Limit Check',
      result: 'pass',
      detail: `Order frequency OK: ${recentOrderCount}/${maxOrdersPerHour} per hour`,
      weight: 0.5,
    };
  }

  /**
   * Check if order is during business hours
   */
  private checkBusinessHours(context: AIContext): ReasoningStep {
    const hour = new Date(context.currentTime).getHours();
    const { businessHoursStart, businessHoursEnd } = this.config;

    if (hour < businessHoursStart || hour >= businessHoursEnd) {
      return {
        check: 'Business Hours Check',
        result: 'warn',
        detail: `Order placed outside business hours (${businessHoursStart}:00-${businessHoursEnd}:00)`,
        weight: 0.3,
      };
    }

    return {
      check: 'Business Hours Check',
      result: 'pass',
      detail: `Order placed during business hours`,
      weight: 0.3,
    };
  }

  /**
   * Assess overall risk level based on reasoning
   */
  private assessRisk(reasoning: ReasoningStep[], confidence: number): RiskLevel {
    const failCount = reasoning.filter(r => r.result === 'fail').length;
    const warnCount = reasoning.filter(r => r.result === 'warn').length;

    if (failCount > 0) return RiskLevel.CRITICAL;
    if (warnCount >= 3) return RiskLevel.HIGH;
    if (warnCount >= 1) return RiskLevel.MEDIUM;
    if (confidence < 0.7) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Make the final decision based on all checks
   */
  private makeDecision(
    reasoning: ReasoningStep[], 
    confidence: number,
    context: AIContext
  ): AIDecision {
    const { autoApproveThreshold, autoRejectThreshold } = this.config;
    
    // Any critical failure → reject
    const hasCriticalFail = reasoning.some(r => 
      r.result === 'fail' && r.weight >= 0.9
    );
    if (hasCriticalFail) {
      return AIDecision.REJECT;
    }

    // Cancel intent → reject (gracefully)
    if (context.intent === UserIntent.CANCEL_ORDER) {
      return AIDecision.REJECT;
    }

    // High confidence → approve
    if (confidence >= autoApproveThreshold) {
      return AIDecision.APPROVE;
    }

    // Low confidence → reject
    if (confidence < autoRejectThreshold) {
      return AIDecision.REJECT;
    }

    // Multiple warnings → ask for confirmation
    const warnCount = reasoning.filter(r => r.result === 'warn').length;
    if (warnCount >= 2) {
      return AIDecision.CONFIRM;
    }

    // Medium confidence → approve with caution
    return AIDecision.APPROVE;
  }

  /**
   * Generate human-readable summary of the decision
   */
  private generateSummary(
    decision: AIDecision, 
    reasoning: ReasoningStep[],
    context: AIContext
  ): string {
    const passCount = reasoning.filter(r => r.result === 'pass').length;
    const failCount = reasoning.filter(r => r.result === 'fail').length;
    const warnCount = reasoning.filter(r => r.result === 'warn').length;

    switch (decision) {
      case AIDecision.APPROVE:
        return `✅ Payment APPROVED: ${context.item} for ${context.price} USDT. ` +
               `Passed ${passCount}/${reasoning.length} checks with ${warnCount} warning(s).`;
      
      case AIDecision.REJECT:
        const failReasons = reasoning
          .filter(r => r.result === 'fail')
          .map(r => r.detail)
          .join('; ');
        return `❌ Payment REJECTED: ${failReasons}`;
      
      case AIDecision.CONFIRM:
        return `⚠️ CONFIRMATION REQUIRED: ${warnCount} warning(s) detected. ` +
               `Please review before proceeding with ${context.price} USDT payment.`;
      
      case AIDecision.DELAY:
        return `⏳ Payment DELAYED: Suggest waiting before processing this order.`;
      
      default:
        return `Decision: ${decision}`;
    }
  }

  /**
   * Generate suggestions for rejected or needs-confirmation decisions
   */
  private generateSuggestions(
    decision: AIDecision, 
    reasoning: ReasoningStep[]
  ): string[] {
    if (decision === AIDecision.APPROVE) return [];

    const suggestions: string[] = [];
    
    for (const step of reasoning) {
      if (step.result === 'fail') {
        if (step.check.includes('Amount')) {
          suggestions.push('Try a smaller order amount');
        }
        if (step.check.includes('Daily')) {
          suggestions.push('Wait until tomorrow for daily limit reset');
        }
        if (step.check.includes('Balance')) {
          suggestions.push('Fund the payment agent with more USDT');
        }
        if (step.check.includes('Rate')) {
          suggestions.push('Wait a few minutes before ordering again');
        }
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Record an order for rate limiting
   */
  private recordOrder(userAddress: string): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const history = this.orderHistory.get(userAddress) || [];
    const recentHistory = history.filter(t => t > oneHourAgo);
    recentHistory.push(now);
    
    this.orderHistory.set(userAddress, recentHistory);
  }

  /**
   * Get recent order count for a user
   */
  getRecentOrderCount(userAddress: string): number {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const history = this.orderHistory.get(userAddress) || [];
    return history.filter(t => t > oneHourAgo).length;
  }

  /**
   * Log the decision for transparency
   */
  private logDecision(result: AIDecisionResult): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  🧠 AI Decision Result');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n  Decision: ${result.decision.toUpperCase()}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`  Risk Level: ${result.riskLevel}`);
    console.log(`\n  Reasoning:`);
    
    for (const step of result.reasoning) {
      const icon = step.result === 'pass' ? '✓' : step.result === 'warn' ? '⚠' : '✗';
      console.log(`    ${icon} [${step.check}] ${step.detail}`);
    }
    
    console.log(`\n  Summary: ${result.summary}`);
    
    if (result.suggestions && result.suggestions.length > 0) {
      console.log(`\n  Suggestions:`);
      result.suggestions.forEach(s => console.log(`    → ${s}`));
    }
    
    console.log(`\n  Processing Time: ${result.processingTime}ms`);
    console.log('═══════════════════════════════════════════════════════\n');
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<AIEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIEngineConfig {
    return { ...this.config };
  }
}

// Export singleton instance for convenience
export const aiEngine = new AIDecisionEngine();
