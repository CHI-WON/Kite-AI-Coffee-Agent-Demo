/**
 * AI Decision Engine Types
 * 
 * This module defines the types for the AI-driven decision layer
 * that evaluates user intents and determines payment actions.
 */

/**
 * User intent types - what the user wants to do
 */
export enum UserIntent {
  BUY_COFFEE = 'buy_coffee',           // Normal purchase
  URGENT_ORDER = 'urgent_order',        // Time-sensitive order
  BULK_ORDER = 'bulk_order',            // Multiple items
  CANCEL_ORDER = 'cancel_order',        // Cancel previous
  REPEAT_ORDER = 'repeat_order',        // Repeat last order
  CUSTOM_TIP = 'custom_tip',            // Add tip to order
}

/**
 * AI Decision outcomes
 */
export enum AIDecision {
  APPROVE = 'approve',                  // Proceed with transaction
  REJECT = 'reject',                    // Deny the transaction
  CONFIRM = 'confirm',                  // Ask user for confirmation
  DELAY = 'delay',                      // Suggest waiting
}

/**
 * Risk level assessment
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Context provided to the AI for decision-making
 */
export interface AIContext {
  // User information
  userAddress: string;
  
  // Order details
  intent: UserIntent;
  item: string;
  price: number;
  quantity: number;
  
  // Historical context
  recentOrderCount: number;           // Orders in last hour
  totalDailySpending: number;         // Today's spending
  lastOrderTimestamp?: number;        // When was last order
  
  // System state
  agentBalance: number;               // Payment agent USDT balance
  currentTime: number;                // For time-based decisions
  
  // Optional metadata
  metadata?: Record<string, unknown>;
}

/**
 * Individual reasoning step - explains part of the decision
 */
export interface ReasoningStep {
  check: string;                      // What was checked
  result: 'pass' | 'fail' | 'warn';   // Check result
  detail: string;                     // Human-readable explanation
  weight: number;                     // Importance (0-1)
}

/**
 * Complete AI decision with reasoning
 */
export interface AIDecisionResult {
  // The final decision
  decision: AIDecision;
  
  // Confidence score (0-1)
  confidence: number;
  
  // Risk assessment
  riskLevel: RiskLevel;
  
  // Step-by-step reasoning (transparent AI)
  reasoning: ReasoningStep[];
  
  // Human-readable summary
  summary: string;
  
  // Suggestions if not approved
  suggestions?: string[];
  
  // Processing metadata
  processingTime: number;
  timestamp: number;
}

/**
 * Order request with intent
 */
export interface IntentOrderRequest {
  intent: UserIntent;
  item: string;
  price: number;
  quantity?: number;
  userAddress: string;
  metadata?: {
    simulateHighPrice?: boolean;
    simulateLowBalance?: boolean;
    customMessage?: string;
    userConfirmed?: boolean;
  };
}

/**
 * Enhanced order response with AI decision
 * Pipeline uses 'unknown' to allow flexibility with agent types
 */
export interface AIEnhancedOrderResponse {
  success: boolean;
  orderId: string;
  
  // AI Decision details (transparent)
  aiDecision: AIDecisionResult;
  
  // Transaction details (if approved)
  transaction?: {
    hash: string;
    explorerUrl: string;
    status: 'pending' | 'confirmed' | 'failed';
  };
  
  // Pipeline details - using any for flexibility with ProcessingPipeline
  pipeline?: {
    reception?: unknown;
    approval?: unknown;
    payment?: unknown;
  };
  
  // Error if any
  error?: string;
}
