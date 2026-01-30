import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { coffeeMenu, apiConfig, kiteTestnet } from '../config';
import { OrderStatusData } from './OrderStatus';

interface OrderFormProps {
  onSubmit: (status: OrderStatusData) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

interface AgentInfo {
  walletAddress: string;
  policy: {
    maxSinglePayment: number;
    maxDailySpending: number;
  };
}

function OrderForm({ onSubmit, isSubmitting, setIsSubmitting }: OrderFormProps) {
  const { address, isConnected, chain } = useAccount();
  const [selectedItem, setSelectedItem] = useState(coffeeMenu[0].item);
  const [quantity, setQuantity] = useState(1);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCoffee = coffeeMenu.find(c => c.item === selectedItem)!;
  const totalPrice = selectedCoffee.price * quantity;
  const isWrongNetwork = chain?.id !== kiteTestnet.id;

  // Fetch agent info on mount
  useEffect(() => {
    fetchAgentInfo();
  }, []);

  const fetchAgentInfo = async () => {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/agent`);
      const data = await response.json();
      if (data.success) {
        setAgentInfo(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch agent info:', err);
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

    setError(null);
    setIsSubmitting(true);

    // Set pending status
    onSubmit({
      status: 'pending',
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

      if (data.success) {
        onSubmit({
          status: 'approved',
          order: {
            item: selectedItem,
            price: totalPrice,
            currency: 'USDT',
          },
          transactionHash: data.data?.transactionHash,
          explorerUrl: data.data?.explorerUrl,
          agentWallet: data.agentWallet,
        });
      } else {
        onSubmit({
          status: 'rejected',
          order: {
            item: selectedItem,
            price: totalPrice,
            currency: 'USDT',
          },
          reason: data.reason,
          agentWallet: data.agentWallet,
        });
      }
    } catch (err) {
      onSubmit({
        status: 'rejected',
        order: {
          item: selectedItem,
          price: totalPrice,
          currency: 'USDT',
        },
        reason: err instanceof Error ? err.message : 'Network error - is the backend running?',
      });
    }
  };

  const willExceedLimit = agentInfo && totalPrice > agentInfo.policy.maxSinglePayment;

  return (
    <div className="card">
      <h2>☕ Place Order</h2>

      {agentInfo && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          background: '#e8f4fd',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <div><strong>Agent Policy:</strong></div>
          <div>Max per order: {agentInfo.policy.maxSinglePayment} USDT</div>
          <div>Max daily: {agentInfo.policy.maxDailySpending} USDT</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Coffee</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
            disabled={isSubmitting}
          >
            {coffeeMenu.map(coffee => (
              <option key={coffee.item} value={coffee.item}>
                {coffee.item} - {coffee.price} USDT
              </option>
            ))}
          </select>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '-10px' }}>
            {selectedCoffee.description}
          </div>
        </div>

        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isSubmitting}
          />
        </div>

        <div className="price-display">
          Total: {totalPrice.toFixed(4)} USDT
          {willExceedLimit && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#dc3545',
              marginTop: '5px'
            }}>
              ⚠️ Exceeds agent limit - will be rejected
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={!isConnected || isWrongNetwork || isSubmitting}
        >
          {isSubmitting ? (
            <span>
              <span className="spinner" style={{ 
                display: 'inline-block', 
                marginRight: '8px',
                verticalAlign: 'middle'
              }} />
              Processing...
            </span>
          ) : (
            'Submit Order'
          )}
        </button>
      </form>

      {!isConnected && (
        <div style={{ 
          marginTop: '10px', 
          textAlign: 'center', 
          color: '#666',
          fontSize: '0.9rem'
        }}>
          Please connect your wallet to place orders
        </div>
      )}
    </div>
  );
}

export default OrderForm;
