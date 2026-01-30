import { ethers } from 'ethers';

/**
 * Payment policy configuration for the Coffee Agent
 * Defines spending limits and rules
 */
export interface PaymentPolicy {
  // Maximum amount per single transaction (in token units, e.g., USDT)
  maxSinglePayment: number;
  // Maximum daily spending limit (in token units)
  maxDailySpending: number;
  // Allowed currencies
  allowedCurrencies: string[];
  // Time window for spending rules (in seconds)
  timeWindowSeconds: number;
}

/**
 * Default payment policy for the coffee shop agent
 */
export const defaultPolicy: PaymentPolicy = {
  maxSinglePayment: 1.0,      // Max 1 USDT per transaction
  maxDailySpending: 10.0,     // Max 10 USDT per day
  allowedCurrencies: ['USDT'], // Only USDT is allowed
  timeWindowSeconds: 86400,   // 24 hours
};

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Spending tracker to monitor daily spending
 */
class SpendingTracker {
  private dailySpending: number = 0;
  private lastResetTime: number = Date.now();
  private timeWindowMs: number;

  constructor(timeWindowSeconds: number) {
    this.timeWindowMs = timeWindowSeconds * 1000;
  }

  /**
   * Reset spending if time window has passed
   */
  private checkAndReset(): void {
    const now = Date.now();
    if (now - this.lastResetTime >= this.timeWindowMs) {
      this.dailySpending = 0;
      this.lastResetTime = now;
      console.log('📊 Spending tracker reset for new time window');
    }
  }

  /**
   * Get current daily spending
   */
  getCurrentSpending(): number {
    this.checkAndReset();
    return this.dailySpending;
  }

  /**
   * Add to daily spending
   */
  addSpending(amount: number): void {
    this.checkAndReset();
    this.dailySpending += amount;
  }
}

// Global spending tracker instance
const spendingTracker = new SpendingTracker(defaultPolicy.timeWindowSeconds);

/**
 * Validate a payment against the policy
 * @param amount - The payment amount
 * @param currency - The payment currency
 * @param policy - The payment policy to validate against
 * @returns Validation result with reason if invalid
 */
export function validatePayment(
  amount: number,
  currency: string,
  policy: PaymentPolicy = defaultPolicy
): PolicyValidationResult {
  console.log('\n🔍 Validating payment against policy...');
  console.log(`   Amount: ${amount} ${currency}`);
  console.log(`   Max single payment: ${policy.maxSinglePayment} ${currency}`);

  // Check if currency is allowed
  if (!policy.allowedCurrencies.includes(currency)) {
    return {
      isValid: false,
      reason: `Currency ${currency} is not allowed. Allowed currencies: ${policy.allowedCurrencies.join(', ')}`,
    };
  }

  // Check single payment limit
  if (amount > policy.maxSinglePayment) {
    return {
      isValid: false,
      reason: `Payment amount ${amount} ${currency} exceeds maximum single payment limit of ${policy.maxSinglePayment} ${currency}`,
    };
  }

  // Check if amount is positive
  if (amount <= 0) {
    return {
      isValid: false,
      reason: 'Payment amount must be greater than 0',
    };
  }

  // Check daily spending limit
  const currentSpending = spendingTracker.getCurrentSpending();
  const projectedSpending = currentSpending + amount;
  
  console.log(`   Current daily spending: ${currentSpending} ${currency}`);
  console.log(`   Projected spending after payment: ${projectedSpending} ${currency}`);
  console.log(`   Max daily spending: ${policy.maxDailySpending} ${currency}`);

  if (projectedSpending > policy.maxDailySpending) {
    return {
      isValid: false,
      reason: `Payment would exceed daily spending limit. Current: ${currentSpending}, Requested: ${amount}, Limit: ${policy.maxDailySpending}`,
    };
  }

  console.log('✅ Payment validation passed');
  return { isValid: true };
}

/**
 * Record a successful payment in the spending tracker
 * @param amount - The payment amount to record
 */
export function recordPayment(amount: number): void {
  spendingTracker.addSpending(amount);
  console.log(`📝 Recorded payment of ${amount}. Total daily spending: ${spendingTracker.getCurrentSpending()}`);
}

/**
 * Get spending rules for on-chain configuration
 * Returns the spending rules in a format compatible with the Kite SDK
 */
export function getSpendingRulesForChain(policy: PaymentPolicy = defaultPolicy) {
  const startTimestamp = BigInt(Math.floor(Date.now() / 1000));
  
  return [
    {
      timeWindow: BigInt(policy.timeWindowSeconds),
      budget: ethers.parseUnits(policy.maxDailySpending.toString(), 18),
      initialWindowStartTime: startTimestamp,
      targetProviders: [] as string[],
    },
  ];
}

/**
 * Display current policy settings
 */
export function displayPolicy(policy: PaymentPolicy = defaultPolicy): void {
  console.log('\n📋 Current Payment Policy:');
  console.log(`   Max single payment: ${policy.maxSinglePayment} USDT`);
  console.log(`   Max daily spending: ${policy.maxDailySpending} USDT`);
  console.log(`   Allowed currencies: ${policy.allowedCurrencies.join(', ')}`);
  console.log(`   Time window: ${policy.timeWindowSeconds / 3600} hours`);
}
