import AgentPipeline, { PipelineData } from './AgentPipeline';

/**
 * Order status data structure - updated for multi-agent
 */
export interface OrderStatusData {
  status: string;
  orderId?: string;
  order: {
    item: string;
    price: number;
    currency: string;
  };
  pipeline?: PipelineData;
  transactionHash?: string;
  explorerUrl?: string;
  reason?: string;
  error?: string;
}

interface OrderStatusProps {
  status: OrderStatusData;
  onNewOrder: () => void;
}

const coffeeEmojis: Record<string, string> = {
  'Espresso': '☕',
  'Latte': '🥛',
  'Cappuccino': '☕',
  'Americano': '🫖',
  'Special Blend': '✨',
  'Premium Gold Coffee': '👑',
};

function OrderStatus({ status, onNewOrder }: OrderStatusProps) {
  const isSuccess = status.status === 'completed';
  const isFailed = status.status === 'rejected' || status.status === 'failed';
  const isPending = !isSuccess && !isFailed;

  const getStatusIcon = () => {
    if (isSuccess) return '🎉';
    if (isFailed) return '😔';
    return '⏳';
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'received': return 'Order Received';
      case 'validating': return 'Validating...';
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'processing': return 'Processing Payment';
      case 'completed': return 'Completed!';
      case 'rejected': return 'Rejected';
      case 'failed': return 'Failed';
      default: return status.status;
    }
  };

  const getStatusClass = () => {
    if (isSuccess) return 'status-approved';
    if (isFailed) return 'status-rejected';
    return 'status-pending';
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
          background: isSuccess 
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
            : isFailed 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
          borderRadius: '10px',
          marginRight: '4px'
        }}>
          📋
        </span>
        Order Status
      </h2>

      {/* Order ID */}
      {status.orderId && (
        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '16px',
          fontFamily: 'monospace',
          background: 'rgba(255,255,255,0.03)',
          padding: '8px 12px',
          borderRadius: '8px',
        }}>
          Order ID: {status.orderId}
        </div>
      )}

      {/* Status icon and badge */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '24px',
        padding: '24px',
        background: isSuccess 
          ? 'rgba(34, 197, 94, 0.1)' 
          : isFailed 
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(139, 92, 246, 0.1)',
        borderRadius: '16px',
        border: `1px solid ${isSuccess 
          ? 'rgba(34, 197, 94, 0.2)' 
          : isFailed 
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(139, 92, 246, 0.2)'}`,
      }}>
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: '12px',
          animation: isPending ? 'pulse 2s infinite' : 'none',
        }}>
          {getStatusIcon()}
        </div>
        <span className={`status-badge ${getStatusClass()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Multi-Agent Pipeline Visualization */}
      {status.pipeline && (
        <AgentPipeline 
          pipeline={status.pipeline} 
          currentStatus={status.status}
        />
      )}

      {/* Order details */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.4)', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}>
          Order Details
        </div>
        
        <div className="info-row">
          <span className="info-label">Item</span>
          <span className="info-value">
            {coffeeEmojis[status.order.item] || '☕'} {status.order.item}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">Price</span>
          <span className="info-value" style={{ color: '#a78bfa', fontWeight: 700 }}>
            {status.order.price} {status.order.currency}
          </span>
        </div>
      </div>

      {/* Pending state */}
      {isPending && (
        <div className="loading" style={{ 
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div className="spinner" />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            {status.status === 'validating' && '📥 Reception Agent validating order...'}
            {status.status === 'pending_approval' && '🔍 Approval Agent reviewing order...'}
            {status.status === 'approved' && '💳 Payment Agent preparing transfer...'}
            {status.status === 'processing' && '🚀 Executing on-chain transfer...'}
            {status.status === 'received' && '🤖 Starting multi-agent pipeline...'}
          </span>
        </div>
      )}

      {/* Success state */}
      {isSuccess && (
        <div className="success-message">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '12px' 
          }}>
            <span style={{ fontSize: '1.5rem' }}>🎉</span>
            <strong style={{ fontSize: '1rem' }}>Order Completed!</strong>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '12px' }}>
            Your coffee order was processed successfully through all 3 agents.
          </div>
          {status.transactionHash && (
            <div style={{ 
              background: 'rgba(0,0,0,0.2)',
              padding: '12px',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '0.75rem', marginBottom: '6px', opacity: 0.7 }}>
                Transaction Hash
              </div>
              <a 
                href={status.explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="tx-link"
                style={{ fontSize: '0.85rem' }}
              >
                {status.transactionHash.slice(0, 20)}...{status.transactionHash.slice(-16)}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Failed state */}
      {isFailed && (
        <div className="error-message">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '8px' 
          }}>
            <span style={{ fontSize: '1.2rem' }}>❌</span>
            <strong>
              {status.status === 'rejected' ? 'Order Rejected by Agent' : 'Order Failed'}
            </strong>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            <strong>Reason:</strong> {status.error || status.reason || 'Unknown reason'}
          </div>
        </div>
      )}

      <button
        className={isSuccess ? "btn-primary" : "btn-secondary"}
        onClick={onNewOrder}
        style={{ width: '100%' }}
      >
        {isSuccess ? '☕ Order Another Coffee' : '← Place New Order'}
      </button>
    </div>
  );
}

export default OrderStatus;
