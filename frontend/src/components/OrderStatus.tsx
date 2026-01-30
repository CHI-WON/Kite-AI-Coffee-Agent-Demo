import AgentPipeline, { PipelineData } from './AgentPipeline';
import AIDecisionPanel from './AIDecisionPanel';

/**
 * AI Decision result structure
 */
interface AIDecisionResult {
  decision: string;
  confidence: number;
  riskLevel: string;
  reasoning: Array<{
    check: string;
    result: 'pass' | 'fail' | 'warn';
    detail: string;
    weight: number;
  }>;
  summary: string;
  suggestions?: string[];
  processingTime: number;
}

/**
 * Order status data structure - enhanced with AI decision
 */
export interface OrderStatusData {
  status: string;
  orderId?: string;
  order: {
    item: string;
    price: number;
    currency: string;
  };
  intent?: string;
  aiDecision?: AIDecisionResult;
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

const intentLabels: Record<string, string> = {
  'buy_coffee': '☕ Buy Coffee',
  'urgent_order': '⚡ Urgent Order',
  'bulk_order': '📦 Bulk Order',
  'repeat_order': '🔄 Repeat Order',
  'custom_tip': '💰 Custom Tip',
};

function OrderStatus({ status, onNewOrder }: OrderStatusProps) {
  const isSuccess = status.status === 'completed';
  const isFailed = status.status === 'rejected' || status.status === 'failed';
  const isPending = !isSuccess && !isFailed;

  const getStatusText = () => {
    switch (status.status) {
      case 'received': return 'AI Evaluating...';
      case 'validating': return 'Validating...';
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'processing': return 'Processing Payment';
      case 'completed': return 'Completed!';
      case 'rejected': return 'Rejected by AI';
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
          🧠
        </span>
        AI Decision Result
      </h2>

      {/* Order ID and Intent */}
      {(status.orderId || status.intent) && (
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '16px',
          background: 'rgba(255,255,255,0.03)',
          padding: '8px 12px',
          borderRadius: '8px',
        }}>
          {status.orderId && (
            <span style={{ fontFamily: 'monospace' }}>ID: {status.orderId}</span>
          )}
          {status.intent && (
            <span style={{ color: '#a78bfa' }}>{intentLabels[status.intent] || status.intent}</span>
          )}
        </div>
      )}

      {/* AI Decision Panel - THE KEY FEATURE */}
      {status.aiDecision && (
        <AIDecisionPanel decision={status.aiDecision} />
      )}

      {/* Status Badge (for pending states) */}
      {isPending && !status.aiDecision && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '24px',
          padding: '24px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '16px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '12px',
            animation: 'pulse 2s infinite',
          }}>
            🧠
          </div>
          <span className={`status-badge ${getStatusClass()}`}>
            {getStatusText()}
          </span>
          <div style={{ marginTop: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            AI is analyzing your order...
          </div>
        </div>
      )}

      {/* Multi-Agent Pipeline Visualization */}
      {status.pipeline && Object.keys(status.pipeline).length > 0 && (
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
          <span className="info-value">☕ {status.order.item}</span>
        </div>

        <div className="info-row">
          <span className="info-label">Amount</span>
          <span className="info-value" style={{ color: '#a78bfa', fontWeight: 700 }}>
            {status.order.price} {status.order.currency}
          </span>
        </div>
      </div>

      {/* Success state with transaction */}
      {isSuccess && status.transactionHash && (
        <div className="success-message">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '12px' 
          }}>
            <span style={{ fontSize: '1.5rem' }}>🎉</span>
            <strong style={{ fontSize: '1rem' }}>AI Approved & Transaction Complete!</strong>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '12px' }}>
            The AI evaluated your order and approved it. The payment was processed through the agent pipeline.
          </div>
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
        </div>
      )}

      {/* Failed state */}
      {isFailed && !status.aiDecision && (
        <div className="error-message">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            marginBottom: '8px' 
          }}>
            <span style={{ fontSize: '1.2rem' }}>❌</span>
            <strong>
              {status.status === 'rejected' ? 'AI Rejected Order' : 'Order Failed'}
            </strong>
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            <strong>Reason:</strong> {status.error || status.reason || 'Unknown reason'}
          </div>
        </div>
      )}

      {/* Pending loader */}
      {isPending && (
        <div className="loading" style={{ 
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div className="spinner" />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            {status.status === 'received' && '🧠 AI evaluating your intent...'}
            {status.status === 'validating' && '📥 Reception Agent validating...'}
            {status.status === 'pending_approval' && '🔍 Approval Agent reviewing...'}
            {status.status === 'approved' && '💳 Payment Agent preparing...'}
            {status.status === 'processing' && '🚀 Executing on-chain transfer...'}
          </span>
        </div>
      )}

      <button
        className={isSuccess ? "btn-primary" : "btn-secondary"}
        onClick={onNewOrder}
        style={{ width: '100%' }}
      >
        {isSuccess ? '🧠 Try Another Order' : '← New Order'}
      </button>
    </div>
  );
}

export default OrderStatus;
