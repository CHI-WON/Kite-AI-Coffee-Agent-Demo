import { AgentInstance, createAgent, displayAgentInfo } from './createAgent';
import { validatePayment, recordPayment, displayPolicy, PaymentPolicy, defaultPolicy } from './policy';
import { payWithAgent, PaymentResult } from '../payment/payWithAgent';
import { config } from '../config';

/**
 * Coffee order structure
 */
export interface CoffeeOrder {
  item: string;
  price: number;
  currency: string;
  merchantAddress: string;
}

/**
 * Order processing result
 */
export interface OrderResult {
  success: boolean;
  order: CoffeeOrder;
  payment?: PaymentResult;
  error?: string;
}

/**
 * Coffee Shop AI Agent
 * Handles order processing and payment execution
 */
export class CoffeeAgent {
  private agent: AgentInstance | null = null;
  private policy: PaymentPolicy;
  private isInitialized: boolean = false;

  constructor(policy: PaymentPolicy = defaultPolicy) {
    this.policy = policy;
  }

  /**
   * Initialize the Coffee Agent
   */
  async initialize(): Promise<void> {
    console.log('\n☕ Initializing Coffee Shop AI Agent...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Display policy settings
    displayPolicy(this.policy);
    
    // Create the underlying AA agent
    this.agent = await createAgent();
    
    // Display agent info
    await displayAgentInfo(this.agent);
    
    this.isInitialized = true;
    console.log('\n✅ Coffee Agent is ready to process orders!');
  }

  /**
   * Process a coffee order
   * @param order - The coffee order to process
   * @returns Order processing result
   */
  async processOrder(order: CoffeeOrder): Promise<OrderResult> {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 New Order Received');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Item: ${order.item}`);
    console.log(`   Price: ${order.price} ${order.currency}`);
    console.log(`   Merchant: ${order.merchantAddress}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check if agent is initialized
    if (!this.isInitialized || !this.agent) {
      return {
        success: false,
        order,
        error: 'Coffee Agent is not initialized. Call initialize() first.',
      };
    }

    // Validate merchant address
    if (!order.merchantAddress || order.merchantAddress === '0xYourMerchantAddressHere') {
      // Use default merchant address from config
      if (config.payment.defaultMerchantAddress && 
          config.payment.defaultMerchantAddress !== '0xYourMerchantAddressHere') {
        order.merchantAddress = config.payment.defaultMerchantAddress;
        console.log(`ℹ️  Using default merchant address: ${order.merchantAddress}`);
      } else {
        return {
          success: false,
          order,
          error: 'Invalid merchant address. Please set MERCHANT_ADDRESS in .env',
        };
      }
    }

    // Validate payment against policy
    const validation = validatePayment(order.price, order.currency, this.policy);
    
    if (!validation.isValid) {
      console.log('\n❌ Order rejected by policy');
      console.log(`   Reason: ${validation.reason}`);
      
      return {
        success: false,
        order,
        error: validation.reason,
      };
    }

    console.log('\n✅ Order validated, proceeding with payment...');

    // Execute payment
    const paymentResult = await payWithAgent(this.agent, {
      recipientAddress: order.merchantAddress,
      amount: order.price,
    });

    if (paymentResult.success) {
      // Record the payment in spending tracker
      recordPayment(order.price);
      
      console.log('\n🎉 Order processed successfully!');
      console.log(`   ${order.item} - PAID`);
      
      return {
        success: true,
        order,
        payment: paymentResult,
      };
    } else {
      console.log('\n❌ Payment failed');
      
      return {
        success: false,
        order,
        payment: paymentResult,
        error: paymentResult.error,
      };
    }
  }

  /**
   * Get the agent's wallet address
   */
  getWalletAddress(): string | null {
    return this.agent?.aaWalletAddress || null;
  }

  /**
   * Get the current policy
   */
  getPolicy(): PaymentPolicy {
    return this.policy;
  }

  /**
   * Update the payment policy
   */
  updatePolicy(newPolicy: Partial<PaymentPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
    console.log('📋 Policy updated');
    displayPolicy(this.policy);
  }
}

/**
 * Create a pre-configured Coffee Agent
 */
export async function createCoffeeAgent(policy?: PaymentPolicy): Promise<CoffeeAgent> {
  const agent = new CoffeeAgent(policy);
  await agent.initialize();
  return agent;
}
