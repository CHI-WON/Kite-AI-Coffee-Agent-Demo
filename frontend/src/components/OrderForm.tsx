import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiConfig, kiteTestnet } from '../config';
import { OrderStatusData } from './OrderStatus';

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
  dailySpending: number;
  paymentAgentBalance: string;
}

interface MenuItem {
  item: string;
  price: number;
  currency: string;
  note?: string;
}

const coffeeEmojis: Record<string, string> = {
  'Espresso': '☕',
  'Latte': '🥛',
  'Cappuccino': '☕',
  'Americano': '🫖',
  'Special Blend': '✨',
  'Premium Gold Coffee': '👑',
};

function OrderForm({ onSubmit, isSubmitting, setIsSubmitting }: OrderFormProps) {
  const { address, isConnected, chain } = useAccount();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCoffee = menu.find(c => c.item === selectedItem);
  const totalPrice = selectedCoffee ? selectedCoffee.price * quantity : 0;
  const isWrongNetwork = chain?.id !== kiteTestnet.id;

  useEffect(() => {
    fetchAgentInfo();
    fetchMenu();
  }, []);

  const fetchAgentInfo = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/agent`);
      const data = await response.json();
      if (data.success && data.data) {
        setAgentInfo({
          mode: data.mode,
          agents: data.data.agents,
          policy: data.data.policy,
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
      const fallbackMenu = [
        { item: 'Latte', price: 0.03, currency: 'USDT' },
        { item: 'Espresso', price: 0.02, currency: 'USDT' },
      ];
      setMenu(fallbackMenu);
      setSelectedItem(fallbackMenu[0].item);
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

    onSubmit({
      status: 'received',
      order: {
        item: selectedItem,
        price: totalPrice,
        currency: 'USDT',
      },
    });

    try {
      const response = await fetch(`${apiConfig.baseUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item: selectedItem,
          price: totalPrice,
          userAddress: address,
        }),
      });

      const data = await response.json();

      onSubmit({
        status: data.status,
        orderId: data.orderId,
        order: {
          item: selectedItem,
          price: totalPrice,
          currency: 'USDT',
        },
        pipeline: data.pipeline,
        transactionHash: data.data?.transactionHash || data.pipeline?.payment?.txHash,
        explorerUrl: data.data?.explorerUrl || data.pipeline?.payment?.explorerUrl,
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
        error: err instanceof Error ? err.message : 'Network error - is the backend running?',
      });
    }
  };

  const willExceedLimit = agentInfo?.policy && totalPrice > agentInfo.policy.maxSinglePayment;
  const requiresApproval = agentInfo?.policy && totalPrice > agentInfo.policy.approvalThreshold && !willExceedLimit;

  return (
    <div className="card">
      <h2>
        <span style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '10px',
          marginRight: '4px'
        }}>
          ☕
        </span>
        Place Your Order
      </h2>

      {/* Multi-Agent System Info */}
      {agentInfo && (
        <div className="agent-info-box">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>Multi-Agent System</span>
            <span style={{
              fontSize: '0.65rem',
              padding: '3px 8px',
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              ACTIVE
            </span>
          </div>
          
          <div className="agent-grid">
            {agentInfo.agents?.reception?.aaWallet && (
              <div className="agent-card">
                <div className="agent-card-title">📥 Reception</div>
                <div className="agent-card-address">
                  {agentInfo.agents.reception.aaWallet.slice(0, 6)}...
                </div>
              </div>
            )}
            {agentInfo.agents?.approval?.aaWallet && (
              <div className="agent-card">
                <div className="agent-card-title">🔍 Approval</div>
                <div className="agent-card-address">
                  {agentInfo.agents.approval.aaWallet.slice(0, 6)}...
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
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div>Approval: &gt;{agentInfo.policy?.approvalThreshold ?? 'N/A'} USDT</div>
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
        <div className="form-group">
          <label>Select Coffee</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
            disabled={isSubmitting || menu.length === 0}
          >
            {menu.map(coffee => (
              <option key={coffee.item} value={coffee.item}>
                {coffeeEmojis[coffee.item] || '☕'} {coffee.item} - {coffee.price} USDT
              </option>
            ))}
          </select>
          {selectedCoffee?.note && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: 'rgba(255,255,255,0.5)', 
              marginTop: '-8px',
              marginBottom: '8px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px'
            }}>
              ℹ️ {selectedCoffee.note}
            </div>
          )}
        </div>

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

        <div className="price-display">
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            Total Amount
          </div>
          <span>{totalPrice.toFixed(4)} USDT</span>
          {requiresApproval && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#fbbf24',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>⚠️</span> Requires approval (above {agentInfo?.policy?.approvalThreshold} USDT)
            </div>
          )}
          {willExceedLimit && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#f87171',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>🚫</span> Exceeds limit - will be rejected
            </div>
          )}
        </div>

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
              Processing through Agents...
            </>
          ) : (
            <>🚀 Submit Order</>
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
