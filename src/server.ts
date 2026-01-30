import express, { Request, Response } from 'express';
import cors from 'cors';
import { validateConfig, config } from './config';
import { CoffeeAgent, CoffeeOrder, OrderResult } from './agent/coffeeAgent';
import { defaultPolicy } from './agent/policy';

/**
 * HTTP Server for Coffee Agent
 * Provides REST API for frontend integration
 */

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global Coffee Agent instance
let coffeeAgent: CoffeeAgent | null = null;

/**
 * Order request from frontend
 */
interface OrderRequest {
  item: string;
  price: number;
  userAddress: string;
}

/**
 * API Response structure
 */
interface ApiResponse {
  success: boolean;
  status: 'pending' | 'approved' | 'rejected';
  data?: {
    order: CoffeeOrder;
    transactionHash?: string;
    explorerUrl?: string;
  };
  reason?: string;
  agentWallet?: string;
}

/**
 * Initialize the Coffee Agent
 */
async function initializeAgent(): Promise<void> {
  console.log('🚀 Starting Coffee Agent HTTP Server...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    validateConfig();
    coffeeAgent = new CoffeeAgent(defaultPolicy);
    await coffeeAgent.initialize();
    console.log('\n✅ Coffee Agent initialized and ready for HTTP requests');
  } catch (error) {
    console.error('❌ Failed to initialize Coffee Agent:', error);
    throw error;
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    agentInitialized: coffeeAgent !== null,
    agentWallet: coffeeAgent?.getWalletAddress() || null,
  });
});

/**
 * Get agent info endpoint
 */
app.get('/agent', (_req: Request, res: Response) => {
  if (!coffeeAgent) {
    res.status(503).json({
      success: false,
      reason: 'Agent not initialized',
    });
    return;
  }

  const policy = coffeeAgent.getPolicy();
  res.json({
    success: true,
    data: {
      walletAddress: coffeeAgent.getWalletAddress(),
      policy: {
        maxSinglePayment: policy.maxSinglePayment,
        maxDailySpending: policy.maxDailySpending,
        allowedCurrencies: policy.allowedCurrencies,
      },
    },
  });
});

/**
 * Get menu endpoint
 */
app.get('/menu', (_req: Request, res: Response) => {
  const menu = [
    { item: 'Latte', price: 0.03, currency: 'USDT' },
    { item: 'Espresso', price: 0.02, currency: 'USDT' },
    { item: 'Cappuccino', price: 0.04, currency: 'USDT' },
    { item: 'Americano', price: 0.025, currency: 'USDT' },
    { item: 'Premium Gold Coffee', price: 1.5, currency: 'USDT' },
  ];
  
  res.json({
    success: true,
    data: menu,
  });
});

/**
 * Process order endpoint
 * POST /order
 */
app.post('/order', async (req: Request, res: Response) => {
  console.log('\n📥 Received order request from frontend');
  
  // Check if agent is initialized
  if (!coffeeAgent) {
    const response: ApiResponse = {
      success: false,
      status: 'rejected',
      reason: 'Agent not initialized. Please try again later.',
    };
    res.status(503).json(response);
    return;
  }

  // Validate request body
  const { item, price, userAddress } = req.body as OrderRequest;
  
  if (!item || price === undefined || !userAddress) {
    const response: ApiResponse = {
      success: false,
      status: 'rejected',
      reason: 'Missing required fields: item, price, userAddress',
    };
    res.status(400).json(response);
    return;
  }

  console.log(`   Item: ${item}`);
  console.log(`   Price: ${price} USDT`);
  console.log(`   User: ${userAddress}`);

  // Create order object
  const order: CoffeeOrder = {
    item,
    price,
    currency: 'USDT',
    merchantAddress: config.payment.defaultMerchantAddress,
  };

  try {
    // Process order through the agent
    const result: OrderResult = await coffeeAgent.processOrder(order);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        status: 'approved',
        data: {
          order: result.order,
          transactionHash: result.payment?.transactionHash,
          explorerUrl: result.payment?.explorerUrl,
        },
        agentWallet: coffeeAgent.getWalletAddress() || undefined,
      };
      console.log('✅ Order approved and processed');
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        status: 'rejected',
        data: {
          order: result.order,
        },
        reason: result.error || 'Order rejected by agent',
        agentWallet: coffeeAgent.getWalletAddress() || undefined,
      };
      console.log(`❌ Order rejected: ${result.error}`);
      res.json(response);
    }
  } catch (error) {
    console.error('❌ Error processing order:', error);
    const response: ApiResponse = {
      success: false,
      status: 'rejected',
      reason: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    res.status(500).json(response);
  }
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize the agent first
    await initializeAgent();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log(`  ☕ Coffee Agent HTTP Server`);
      console.log(`  Running on http://localhost:${PORT}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n📡 Available endpoints:');
      console.log(`   GET  /health - Health check`);
      console.log(`   GET  /agent  - Get agent info`);
      console.log(`   GET  /menu   - Get coffee menu`);
      console.log(`   POST /order  - Submit an order`);
      console.log('\n⏳ Waiting for requests...\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();