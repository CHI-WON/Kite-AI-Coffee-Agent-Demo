import express, { Request, Response } from 'express';
import cors from 'cors';
import { validateMultiAgentConfig, config, getMultiAgentConfig } from './config';
import { 
  AgentOrchestrator, 
  createOrchestrator,
  OrderStatus,
} from './agents';
import {
  UserIntent,
  IntentOrderRequest,
  AIEnhancedOrderResponse,
} from './ai';

/**
 * HTTP Server for AI-Enhanced Multi-Agent Coffee Shop
 * 
 * Features:
 * - AI Decision Layer with transparent reasoning
 * - Multi-Agent Pipeline (Reception → Approval → Payment)
 * - Intent-based order processing
 */

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global Orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

/**
 * Order request with intent from frontend
 */
interface OrderRequest {
  intent: UserIntent;
  item: string;
  price: number;
  quantity?: number;
  userAddress: string;
  confirmed?: boolean;  // User confirmed after AI asked
  metadata?: {
    simulateHighPrice?: boolean;
    simulateLowBalance?: boolean;
    customMessage?: string;
  };
}

/**
 * Initialize the Multi-Agent System
 */
async function initializeAgents(): Promise<void> {
  console.log('🚀 Starting AI-Enhanced Multi-Agent Coffee Shop Server...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    validateMultiAgentConfig();
    const multiAgentConfig = getMultiAgentConfig();
    orchestrator = await createOrchestrator(multiAgentConfig);
    console.log('\n✅ Multi-Agent system initialized and ready');
    console.log('🧠 AI Decision Engine: ACTIVE');
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
    mode: 'ai-enhanced-multi-agent',
    aiEnabled: systemInfo?.aiEnabled || false,
    initialized: systemInfo?.initialized || false,
    agents: systemInfo?.agents || null,
    paymentAgentBalance: paymentBalance,
  });
});

/**
 * Get system info endpoint - includes AI configuration
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
    mode: 'ai-enhanced-multi-agent',
    data: {
      agents: systemInfo.agents,
      policy: {
        approvalThreshold: systemInfo.policy.approvalThreshold,
        maxSinglePayment: systemInfo.policy.maxSinglePayment,
        maxDailySpending: systemInfo.policy.maxDailySpending,
        allowedCurrencies: ['USDT'],
      },
      aiConfig: systemInfo.aiConfig,
      dailySpending: systemInfo.dailySpending,
      paymentAgentBalance: paymentBalance,
    },
  });
});

/**
 * Get available intents
 */
app.get('/intents', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      intents: [
        { 
          id: UserIntent.BUY_COFFEE, 
          label: 'Buy Coffee', 
          description: 'Standard coffee purchase',
          icon: '☕',
        },
        { 
          id: UserIntent.URGENT_ORDER, 
          label: 'Urgent Order', 
          description: 'Time-sensitive order, processed with priority',
          icon: '⚡',
        },
        { 
          id: UserIntent.BULK_ORDER, 
          label: 'Bulk Order', 
          description: 'Multiple items (may require review)',
          icon: '📦',
        },
        { 
          id: UserIntent.REPEAT_ORDER, 
          label: 'Repeat Last Order', 
          description: 'Repeat your previous order',
          icon: '🔄',
        },
        { 
          id: UserIntent.CUSTOM_TIP, 
          label: 'Add Tip', 
          description: 'Add a tip to your order',
          icon: '💰',
        },
      ],
      scenarios: [
        {
          id: 'normal',
          label: 'Normal Order',
          description: 'Standard flow - should be approved',
        },
        {
          id: 'high_price',
          label: 'Simulate High Price',
          description: 'Test rejection for exceeding limits',
        },
        {
          id: 'rapid_orders',
          label: 'Rapid Orders',
          description: 'Test rate limiting detection',
        },
      ],
    },
  });
});

/**
 * Get menu endpoint with AI decision hints
 */
app.get('/menu', (_req: Request, res: Response) => {
  const systemInfo = orchestrator?.getSystemInfo();
  const threshold = systemInfo?.policy.approvalThreshold || 0.5;
  const maxPayment = systemInfo?.policy.maxSinglePayment || 1.0;
  const aiThreshold = systemInfo?.aiConfig?.autoApproveThreshold || 0.8;

  const menu = [
    { 
      item: 'Espresso', 
      price: 0.02, 
      currency: 'USDT',
      aiHint: '✅ Auto-approved (high confidence)',
      expectedDecision: 'approve',
    },
    { 
      item: 'Latte', 
      price: 0.03, 
      currency: 'USDT',
      aiHint: '✅ Auto-approved (high confidence)',
      expectedDecision: 'approve',
    },
    { 
      item: 'Cappuccino', 
      price: 0.04, 
      currency: 'USDT',
      aiHint: '✅ Auto-approved (high confidence)',
      expectedDecision: 'approve',
    },
    { 
      item: 'Americano', 
      price: 0.025, 
      currency: 'USDT',
      aiHint: '✅ Auto-approved (high confidence)',
      expectedDecision: 'approve',
    },
    { 
      item: 'Special Blend', 
      price: 0.6, 
      currency: 'USDT',
      aiHint: `⚠️ May need confirmation (>${threshold} USDT)`,
      expectedDecision: 'confirm',
    },
    { 
      item: 'Premium Gold Coffee', 
      price: 1.5, 
      currency: 'USDT',
      aiHint: `❌ Will be rejected (>${maxPayment} USDT limit)`,
      expectedDecision: 'reject',
    },
  ];
  
  res.json({
    success: true,
    data: menu,
    policy: {
      approvalThreshold: threshold,
      maxSinglePayment: maxPayment,
    },
    aiInfo: {
      autoApproveThreshold: aiThreshold,
      message: 'AI evaluates each order based on amount, frequency, balance, and time',
    },
  });
});

/**
 * Process order with AI decision layer
 * POST /order
 * 
 * This is the main endpoint that demonstrates AI decision-making
 */
app.post('/order', async (req: Request, res: Response) => {
  console.log('\n📥 Received AI-enhanced order request');
  
  if (!orchestrator) {
    const response: AIEnhancedOrderResponse = {
      success: false,
      orderId: '',
      aiDecision: {
        decision: 'reject' as any,
        confidence: 0,
        riskLevel: 'critical' as any,
        reasoning: [{ check: 'System', result: 'fail', detail: 'System not ready', weight: 1 }],
        summary: '❌ System not initialized',
        processingTime: 0,
        timestamp: Date.now(),
      },
      error: 'AI-Enhanced system not initialized. Please try again later.',
    };
    res.status(503).json(response);
    return;
  }

  // Validate request body
  const { 
    intent = UserIntent.BUY_COFFEE, 
    item, 
    price, 
    quantity = 1,
    userAddress,
    confirmed = false,
    metadata,
  } = req.body as OrderRequest;
  
  if (!item || price === undefined || !userAddress) {
    const response: AIEnhancedOrderResponse = {
      success: false,
      orderId: '',
      aiDecision: {
        decision: 'reject' as any,
        confidence: 1,
        riskLevel: 'high' as any,
        reasoning: [{ 
          check: 'Input Validation', 
          result: 'fail', 
          detail: 'Missing required fields', 
          weight: 1 
        }],
        summary: '❌ Missing required fields: item, price, userAddress',
        processingTime: 0,
        timestamp: Date.now(),
      },
      error: 'Missing required fields: item, price, userAddress',
    };
    res.status(400).json(response);
    return;
  }

  console.log(`   Intent: ${intent}`);
  console.log(`   Item: ${item}`);
  console.log(`   Price: ${price} USDT`);
  console.log(`   Quantity: ${quantity}`);
  console.log(`   User: ${userAddress}`);
  console.log(`   Confirmed: ${confirmed}`);

  try {
    // Build intent order request
    const intentRequest: IntentOrderRequest = {
      intent: intent as UserIntent,
      item,
      price,
      quantity,
      userAddress,
      metadata: {
        ...metadata,
        userConfirmed: confirmed,
      },
    };

    // Process through AI-enhanced pipeline
    const result = await orchestrator.processOrderWithAI(
      intentRequest,
      config.payment.defaultMerchantAddress
    );

    // Return full AI decision with reasoning
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error processing order:', error);
    const response: AIEnhancedOrderResponse = {
      success: false,
      orderId: '',
      aiDecision: {
        decision: 'reject' as any,
        confidence: 0,
        riskLevel: 'critical' as any,
        reasoning: [{ 
          check: 'System', 
          result: 'fail', 
          detail: error instanceof Error ? error.message : 'Unknown error', 
          weight: 1 
        }],
        summary: `❌ System Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime: 0,
        timestamp: Date.now(),
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    res.status(500).json(response);
  }
});

/**
 * Get AI decision explanation for a hypothetical order
 * POST /ai/evaluate
 * 
 * Useful for previewing what the AI would decide without executing
 */
app.post('/ai/evaluate', async (req: Request, res: Response) => {
  if (!orchestrator) {
    res.status(503).json({
      success: false,
      error: 'System not initialized',
    });
    return;
  }

  const { intent, item, price, quantity = 1, userAddress } = req.body;

  if (!item || price === undefined || !userAddress) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
    });
    return;
  }

  const aiEngine = orchestrator.getAIEngine();
  let agentBalance = 0;
  
  try {
    agentBalance = parseFloat(await orchestrator.getPaymentAgentBalance());
  } catch {
    // Use 0 if balance fetch fails
  }

  const systemInfo = orchestrator.getSystemInfo();

  const context = {
    userAddress,
    intent: intent || UserIntent.BUY_COFFEE,
    item,
    price,
    quantity,
    recentOrderCount: aiEngine.getRecentOrderCount(userAddress),
    totalDailySpending: systemInfo.dailySpending,
    agentBalance,
    currentTime: Date.now(),
  };

  try {
    const decision = await aiEngine.evaluate(context);
    res.json({
      success: true,
      preview: true,
      aiDecision: decision,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Evaluation failed',
    });
  }
});

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    await initializeAgents();

    app.listen(PORT, () => {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log(`  ☕ AI-Enhanced Multi-Agent Coffee Shop`);
      console.log(`  Running on http://localhost:${PORT}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n📡 Available endpoints:');
      console.log(`   GET  /health     - Health check with AI status`);
      console.log(`   GET  /agent      - Get system info + AI config`);
      console.log(`   GET  /intents    - Get available user intents`);
      console.log(`   GET  /menu       - Get menu with AI hints`);
      console.log(`   POST /order      - Submit order (AI-enhanced)`);
      console.log(`   POST /ai/evaluate - Preview AI decision`);
      console.log('\n🧠 AI Pipeline: Evaluate → Reception → Approval → Payment');
      console.log('\n⏳ Waiting for requests...\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
