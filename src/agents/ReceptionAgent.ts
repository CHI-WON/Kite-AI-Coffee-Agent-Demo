import { BaseAgent } from './BaseAgent';
import {
  AgentRole,
  AgentConfig,
  AgentMessage,
  OrderStatus,
  CoffeeOrder,
} from './types';

/**
 * Reception Agent - First agent in the pipeline
 * Responsibilities:
 * - Receive incoming orders
 * - Validate order format and required fields
 * - Record order receipt
 */
export class ReceptionAgent extends BaseAgent {
  constructor(privateKey: string) {
    const agentConfig: AgentConfig = {
      role: AgentRole.RECEPTION,
      name: 'ReceptionAgent',
      privateKey,
    };
    super(agentConfig);
  }

  /**
   * Validate the order has all required fields
   */
  private validateOrder(order: CoffeeOrder): { valid: boolean; reason?: string } {
    if (!order.item || order.item.trim() === '') {
      return { valid: false, reason: 'Order item is required' };
    }

    if (typeof order.price !== 'number' || order.price <= 0) {
      return { valid: false, reason: 'Order price must be a positive number' };
    }

    if (!order.currency || order.currency !== 'USDT') {
      return { valid: false, reason: 'Only USDT payments are accepted' };
    }

    if (!order.userAddress || !order.userAddress.startsWith('0x')) {
      return { valid: false, reason: 'Valid user address is required' };
    }

    if (!order.merchantAddress || !order.merchantAddress.startsWith('0x')) {
      return { valid: false, reason: 'Valid merchant address is required' };
    }

    return { valid: true };
  }

  /**
   * Process incoming order - validate format and record receipt
   */
  async process(message: AgentMessage): Promise<AgentMessage> {
    const startTime = Date.now();
    console.log(`\n📥 [${this.name}] Processing order ${message.orderId}...`);

    if (!this.initialized) {
      throw new Error(`${this.name} is not initialized`);
    }

    // Update status to validating
    message.status = OrderStatus.VALIDATING;

    // Validate the order
    const validation = this.validateOrder(message.order);

    if (!validation.valid) {
      console.log(`❌ [${this.name}] Order validation failed: ${validation.reason}`);
      
      message.status = OrderStatus.REJECTED;
      message.error = validation.reason;
      message.pipeline.reception = this.createStepRecord(startTime, 'fail', validation.reason);
      
      return message;
    }

    // Order is valid - create step record
    const stepRecord = this.createStepRecord(startTime, 'pass', 'Order validated successfully');
    
    // Sign the order receipt as proof
    const receiptMessage = `Order ${message.orderId} received at ${startTime}`;
    stepRecord.signature = await this.signMessage(receiptMessage);

    message.pipeline.reception = stepRecord;
    message.status = OrderStatus.PENDING_APPROVAL;
    message.previousAgent = AgentRole.RECEPTION;

    console.log(`✅ [${this.name}] Order validated (${stepRecord.duration}ms)`);
    console.log(`   Item: ${message.order.item}`);
    console.log(`   Price: ${message.order.price} ${message.order.currency}`);

    return message;
  }
}
