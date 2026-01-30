import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiConfig, kiteTestnet } from '../config';
import { OrderStatusData } from './OrderStatus';

/**
 * User intent types - what action the user wants to take
 */
enum UserIntent {
  BUY_COFFEE = 'buy_coffee',
  URGENT_ORDER = 'urgent_order',
  BULK_ORDER = 'bulk_order',
  REPEAT_ORDER = 'repeat_order',
  CUSTOM_TIP = 'custom_tip',
}

interface OrderFormProps {
  onSubmit: (status: OrderStatusData) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

interface AgentInfo {
  mode: string;
  agents: {
    reception: { name: string; aaWallet: string } | null;
    approval: { name: string; aaWallet: string } | null;
    payment: { name: string; aaWallet: string } | null;
  };
  policy: {
    approvalThreshold: number;
    maxSinglePayment: number;
    maxDailySpending: number;
  };
  aiConfig?: {
    autoApproveThreshold: number;
    autoRejectThreshold: number;
  };
  dailySpending: number;
  paymentAgentBalance: string;
}

interface MenuItem {
  item: string;
  price: number;
  currency: string;
  aiHint?: string;
  expectedDecision?: string;
}

interface IntentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const defaultIntents: IntentOption[] = [
  { id: UserIntent.BUY_COFFEE, label: 'Buy Coffee', description: 'Standard purchase', icon: '☕' },
  { id: UserIntent.URGENT_ORDER, label: 'Urgent', description: 'Priority order', icon: '⚡' },
  { id: UserIntent.BULK_ORDER, label: 'Bulk Order', description: 'Multiple items', icon: '📦' },
];

function OrderForm({ onSubmit, isSubmitting, setIsSubmitting }: OrderFormProps) {
  const { address, isConnected, chain } = useAccount();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [intents, setIntents] = useState<IntentOption[]>(defaultIntents);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<string>(UserIntent.BUY_COFFEE);
  const [quantity, setQuantity] = useState(1);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<string | null>(null);

  const selectedCoffee = menu.find(c => c.item === selectedItem);
  const totalPrice = selectedCoffee ? selectedCoffee.price * quantity : 0;
  const isWrongNetwork = chain?.id !== kiteTestnet.id;

  useEffect(() => {
    fetchAgentInfo();
    fetchMenu();
    fetchIntents();
  }, []);

  // Update AI preview when selection changes
  useEffect(() => {
    if (selectedCoffee) {
      setAiPreview(selectedCoffee.aiHint || null);
    }
  }, [selectedCoffee, quantity]);

  const fetchAgentInfo = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/agent`);
      const data = await response.json();
      if (data.success && data.data) {
        setAgentInfo({
          mode: data.mode,
          agents: data.data.agents,
          policy: data.data.policy,
          aiConfig: data.data.aiConfig,
          dailySpending: data.data.dailySpending,
          paymentAgentBalance: data.data.paymentAgentBalance,
        });
      }
    } catch (err) {
      console.error('Failed to fetch agent info:', err);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/menu`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setMenu(data.data);
        setSelectedItem(data.data[0].item);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      const fallbackMenu: MenuItem[] = [
        { item: 'Latte', price: 0.03, currency: 'USDT', aiHint: '✅ Auto-approved' },
        { item: 'Espresso', price: 0.02, currency: 'USDT', aiHint: '✅ Auto-approved' },
      ];
      setMenu(fallbackMenu);
      setSelectedItem(fallbackMenu[0].item);
    }
  };

  const fetchIntents = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/intents`);
      const data = await response.json();
      if (data.success && data.data.intents) {
        setIntents(data.data.intents);
      }
    } catch (err) {
      console.error('Failed to fetch intents:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (isWrongNetwork) {
      setError('Please switch to Kite AI Testnet');
      return;
    }

    if (!selectedCoffee) {
      setError('Please select a coffee');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Initial pending state
    onSubmit({
      status: 'received',
      order: {
        item: selectedItem,
        price: totalPrice,
        currency: 'USDT',
      },
      intent: selectedIntent,
    });

    try {
      const response = await fetch(`${apiConfig.baseUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: selectedIntent,
          item: selectedItem,
          price: totalPrice,
          quantity,
          userAddress: address,
        }),
      });

      const data = await response.json();

      // Build order status with AI decision
      onSubmit({
        status: data.success ? 'completed' : (data.aiDecision?.decision === 'reject' ? 'rejected' : 'failed'),
        orderId: data.orderId,
        order: {
          item: selectedItem,
          price: totalPrice,
          currency: 'USDT',
        },
        intent: selectedIntent,
        aiDecision: data.aiDecision,
        pipeline: data.pipeline,
        transactionHash: data.transaction?.hash,
        explorerUrl: data.transaction?.explorerUrl,
        error: data.error,
      });
    } catch (err) {
      onSubmit({
        status: 'failed',
        order: {
          item: selectedItem,
          price: totalPrice,
          currency: 'USDT',
        },
        intent: selectedIntent,
        error: err instanceof Error ? err.message : 'Network error - is the backend running?',
      });
    }
  };

  const getExpectedDecisionBadge = () => {
    if (!selectedCoffee?.expectedDecision) return null;
    
    const decision = selectedCoffee.expectedDecision;
    const colors = {
      approve: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', icon: '✅' },
      reject: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', icon: '❌' },
      confirm: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', icon: '⚠️' },
    }[decision] || { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', icon: '🤔' };

    return (
      <span style={{
        background: colors.bg,
        color: colors.text,
        padding: '2px 8px',
        borderRadius: '8px',
        fontSize: '0.7rem',
        fontWeight: 600,
        marginLeft: '8px',
      }}>
        {colors.icon} AI: {decision}
      </span>
    );
  };

  return (
    <div className="card">
      <h2>
        <span style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
          borderRadius: '10px',
          marginRight: '4px'
        }}>
          🧠
        </span>
        AI Payment Agent
      </h2>

      {/* AI-Enhanced System Info */}
      {agentInfo && (
        <div className="agent-info-box">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>AI-Enhanced System</span>
            <span style={{
              fontSize: '0.65rem',
              padding: '3px 8px',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              AI ACTIVE
            </span>
          </div>
          
          <div className="agent-grid">
            <div className="agent-card">
              <div className="agent-card-title">🧠 AI Engine</div>
              <div className="agent-card-address" style={{ color: '#a78bfa' }}>
                Decision Layer
              </div>
            </div>
            {agentInfo.agents?.reception?.aaWallet && (
              <div className="agent-card">
                <div className="agent-card-title">📥 Reception</div>
                <div className="agent-card-address">
                  {agentInfo.agents.reception.aaWallet.slice(0, 6)}...
                </div>
              </div>
            )}
            {agentInfo.agents?.payment?.aaWallet && (
              <div className="agent-card">
                <div className="agent-card-title">💳 Payment</div>
                <div className="agent-card-address">
                  {agentInfo.agents.payment.aaWallet.slice(0, 6)}...
                </div>
              </div>
            )}
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '8px',
          }}>
            <div>Auto-approve: &gt;{((agentInfo.aiConfig?.autoApproveThreshold || 0.8) * 100).toFixed(0)}%</div>
            <div>Max: {agentInfo.policy?.maxSinglePayment ?? 'N/A'} USDT</div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span style={{ marginRight: '8px' }}>❌</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Intent Selection */}
        <div className="form-group">
          <label>Your Intent</label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px',
            marginBottom: '16px',
          }}>
            {intents.slice(0, 3).map(intent => (
              <button
                key={intent.id}
                type="button"
                onClick={() => setSelectedIntent(intent.id)}
                disabled={isSubmitting}
                style={{
                  padding: '12px 8px',
                  background: selectedIntent === intent.id 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(244, 114, 182, 0.3) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: selectedIntent === intent.id 
                    ? '2px solid #8b5cf6'
                    : '2px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{intent.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{intent.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Coffee Selection */}
        <div className="form-group">
          <label>Select Coffee {getExpectedDecisionBadge()}</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
            disabled={isSubmitting || menu.length === 0}
          >
            {menu.map(coffee => (
              <option key={coffee.item} value={coffee.item}>
                {coffee.item} - {coffee.price} USDT
              </option>
            ))}
          </select>
          
          {/* AI Hint */}
          {aiPreview && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.6)', 
              marginTop: '8px',
              padding: '10px 12px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>🧠</span>
              <span>AI Prediction: {aiPreview}</span>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label>Quantity</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '12px 18px' }}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={isSubmitting || quantity <= 1}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              disabled={isSubmitting}
              style={{ textAlign: 'center', marginBottom: 0 }}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '12px 18px' }}
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              disabled={isSubmitting || quantity >= 10}
            >
              +
            </button>
          </div>
        </div>

        {/* Price Display */}
        <div className="price-display">
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            Total Amount
          </div>
          <span>{totalPrice.toFixed(4)} USDT</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={!isConnected || isWrongNetwork || isSubmitting || menu.length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" style={{ 
                display: 'inline-block', 
                marginRight: '10px',
                verticalAlign: 'middle'
              }} />
              AI Evaluating...
            </>
          ) : (
            <>🧠 Submit to AI Agent</>
          )}
        </button>
      </form>

      {!isConnected && (
        <div style={{ 
          marginTop: '16px', 
          textAlign: 'center', 
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem'
        }}>
          👆 Connect your wallet above to place orders
        </div>
      )}
    </div>
  );
}

export default OrderForm;
