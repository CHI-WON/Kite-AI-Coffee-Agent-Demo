import express, { Request, Response } from 'express';
import cors from 'cors';
import { validateMultiAgentConfig, config, getMultiAgentConfig } from './config';
import { 
  AgentOrchestrator, 
  createOrchestrator,
  MultiAgentOrderResponse,
  OrderStatus,
} from './agents';

/**
 * HTTP Server for Multi-Agent Coffee Shop
 * Provides REST API for frontend integration
 */

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global Orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

/**
 * Order request from frontend
 */
interface OrderRequest {
  item: string;
  price: number;
  userAddress: string;
}

/**
 * Initialize the Multi-Agent System
 */
async function initializeAgents(): Promise<void> {
  console.log('🚀 Starting Multi-Agent Coffee Shop Server...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    validateMultiAgentConfig();
    const multiAgentConfig = getMultiAgentConfig();
    orchestrator = await createOrchestrator(multiAgentConfig);
    console.log('\n✅ Multi-Agent system initialized and ready');
  } catch (error) {
    console.error('❌ Failed to initialize Multi-Agent system:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', async (_req: Request, res: Response) => {
  const systemInfo = orchestrator?.getSystemInfo();
  let paymentBalance = '0';
  
  if (orchestrator) {
    try {
      paymentBalance = await orchestrator.getPaymentAgentBalance();
    } catch {
      paymentBalance = 'unknown';
    }
  }

  res.json({
    status: 'ok',
    mode: 'multi-agent',
    initialized: systemInfo?.initialized || false,
    agents: systemInfo?.agents || null,
    paymentAgentBalance: paymentBalance,
  });
});

/**
 * Get system info endpoint
 */
app.get('/agent', async (_req: Request, res: Response) => {
  if (!orchestrator) {
    res.status(503).json({
      success: false,
      reason: 'Multi-Agent system not initialized',
    });
    return;
  }

  const systemInfo = orchestrator.getSystemInfo();
  let paymentBalance = '0';
  
  try {
    paymentBalance = await orchestrator.getPaymentAgentBalance();
  } catch {
    paymentBalance = 'unknown';
  }

  res.json({
    success: true,
    mode: 'multi-agent',
    data: {
      agents: systemInfo.agents,
      policy: {
        approvalThreshold: systemInfo.policy.approvalThreshold,
        maxSinglePayment: systemInfo.policy.maxSinglePayment,
        maxDailySpending: systemInfo.policy.maxDailySpending,
        allowedCurrencies: ['USDT'],
      },
      dailySpending: systemInfo.dailySpending,
      paymentAgentBalance: paymentBalance,
    },
  });
});

/**
 * Get menu endpoint
 */
app.get('/menu', (_req: Request, res: Response) => {
  const systemInfo = orchestrator?.getSystemInfo();
  const threshold = systemInfo?.policy.approvalThreshold || 0.5;
  const maxPayment = systemInfo?.policy.maxSinglePayment || 1.0;

  const menu = [
    { 
      item: 'Espresso', 
      price: 0.02, 
      currency: 'USDT',
      note: 'Auto-approved (below threshold)'
    },
    { 
      item: 'Latte', 
      price: 0.03, 
      currency: 'USDT',
      note: 'Auto-approved (below threshold)'
    },
    { 
      item: 'Cappuccino', 
      price: 0.04, 
      currency: 'USDT',
      note: 'Auto-approved (below threshold)'
    },
    { 
      item: 'Americano', 
      price: 0.025, 
      currency: 'USDT',
      note: 'Auto-approved (below threshold)'
    },
    { 
      item: 'Special Blend', 
      price: 0.6, 
      currency: 'USDT',
      note: `Requires approval (>${threshold} USDT)`
    },
    { 
      item: 'Premium Gold Coffee', 
      price: 1.5, 
      currency: 'USDT',
      note: `Will be rejected (>${maxPayment} USDT limit)`
    },
  ];
  
  res.json({
    success: true,
    data: menu,
    policy: {
      approvalThreshold: threshold,
      maxSinglePayment: maxPayment,
    },
  });
});

/**
 * Process order endpoint - Multi-Agent Pipeline
 * POST /order
 */
app.post('/order', async (req: Request, res: Response) => {
  console.log('\n📥 Received order request from frontend');
  
  // Check if orchestrator is initialized
  if (!orchestrator) {
    const response: MultiAgentOrderResponse = {
      success: false,
      status: OrderStatus.FAILED,
      orderId: '',
      pipeline: {},
      error: 'Multi-Agent system not initialized. Please try again later.',
    };
    res.status(503).json(response);
    return;
  }

  // Validate request body
  const { item, price, userAddress } = req.body as OrderRequest;
  
  if (!item || price === undefined || !userAddress) {
    const response: MultiAgentOrderResponse = {
      success: false,
      status: OrderStatus.REJECTED,
      orderId: '',
      pipeline: {},
      error: 'Missing required fields: item, price, userAddress',
    };
    res.status(400).json(response);
    return;
  }

  console.log(`   Item: ${item}`);
  console.log(`   Price: ${price} USDT`);
  console.log(`   User: ${userAddress}`);

  try {
    // Process order through the multi-agent pipeline
    const result = await orchestrator.processOrder(
      item,
      price,
      userAddress,
      config.payment.defaultMerchantAddress
    );

    res.json(result);
  } catch (error) {
    console.error('❌ Error processing order:', error);
    const response: MultiAgentOrderResponse = {
      success: false,
      status: OrderStatus.FAILED,
      orderId: '',
      pipeline: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    res.status(500).json(response);
  }
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize the multi-agent system
    await initializeAgents();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log(`  ☕ Multi-Agent Coffee Shop Server`);
      console.log(`  Running on http://localhost:${PORT}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n📡 Available endpoints:');
      console.log(`   GET  /health - Health check with agent status`);
      console.log(`   GET  /agent  - Get multi-agent system info`);
      console.log(`   GET  /menu   - Get coffee menu with policy notes`);
      console.log(`   POST /order  - Submit order to multi-agent pipeline`);
      console.log('\n🔄 Pipeline: Reception → Approval → Payment');
      console.log('\n⏳ Waiting for requests...\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
