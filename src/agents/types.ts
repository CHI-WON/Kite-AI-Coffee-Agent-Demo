import { ethers } from 'ethers';
import { GokiteAASDK } from 'gokite-aa-sdk';

/**
 * Agent roles in the multi-agent system
 */
export enum AgentRole {
  RECEPTION = 'reception',
  APPROVAL = 'approval',
  PAYMENT = 'payment',
}

/**
 * Order processing status through the multi-agent pipeline
 */
export enum OrderStatus {
  RECEIVED = 'received',
  VALIDATING = 'validating',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Result of an agent's action
 */
export type AgentActionResult = 'pass' | 'fail' | 'approved' | 'rejected' | 'success' | 'failed';

/**
 * Coffee order structure
 */
export interface CoffeeOrder {
  id: string;
  item: string;
  price: number;
  currency: string;
  merchantAddress: string;
  userAddress: string;
  timestamp: number;
}

/**
 * Agent processing step record
 */
export interface AgentStepRecord {
  agent: string;
  role: AgentRole;
  aaWallet: string;
  timestamp: number;
  duration: number;
  result: AgentActionResult;
  message?: string;
  signature?: string;
}

/**
 * Pipeline tracking all agent steps
 */
export interface ProcessingPipeline {
  reception?: AgentStepRecord;
  approval?: AgentStepRecord;
  payment?: AgentStepRecord & {
    txHash?: string;
    explorerUrl?: string;
  };
}

/**
 * Message passed between agents
 */
export interface AgentMessage {
  orderId: string;
  order: CoffeeOrder;
  status: OrderStatus;
  pipeline: ProcessingPipeline;
  previousAgent?: AgentRole;
  error?: string;
}

/**
 * Multi-agent order response for API
 */
export interface MultiAgentOrderResponse {
  success: boolean;
  status: OrderStatus;
  orderId: string;
  pipeline: ProcessingPipeline;
  data?: {
    order: CoffeeOrder;
    transactionHash?: string;
    explorerUrl?: string;
  };
  error?: string;
}

/**
 * Base agent instance interface
 */
export interface BaseAgentInstance {
  role: AgentRole;
  name: string;
  sdk: GokiteAASDK;
  signer: ethers.Wallet;
  eoaAddress: string;
  aaWalletAddress: string;
  signFunction: (userOpHash: string) => Promise<string>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  role: AgentRole;
  name: string;
  privateKey: string;
}

/**
 * Multi-agent system configuration
 */
export interface MultiAgentConfig {
  reception: AgentConfig;
  approval: AgentConfig;
  payment: AgentConfig;
  approvalThreshold: number; // Orders above this amount require approval
  maxSinglePayment: number;  // Maximum amount per transaction
  maxDailySpending: number;  // Maximum daily spending limit
}

/**
 * Generate a unique order ID
 */
export function generateOrderId(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/**
 * Format agent step for logging
 */
export function formatAgentStep(step: AgentStepRecord): string {
  const status = step.result === 'pass' || step.result === 'approved' || step.result === 'success' 
    ? '✓' 
    : '✗';
  return `[${step.role.toUpperCase()}] ${status} (${step.duration}ms)`;
}
