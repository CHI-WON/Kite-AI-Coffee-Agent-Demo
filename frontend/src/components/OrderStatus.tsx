export interface OrderStatusData {
  status: 'pending' | 'approved' | 'rejected';
  order: {
    item: string;
    price: number;
    currency: string;
  };
  transactionHash?: string;
  explorerUrl?: string;
  reason?: string;
  agentWallet?: string;
}

interface OrderStatusProps {
  status: OrderStatusData;
  onNewOrder: () => void;
}

function OrderStatus({ status, onNewOrder }: OrderStatusProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Processing';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
    }
  };

  return (
    <div className="card">
      <h2>📋 Order Status</h2>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
          {getStatusIcon()}
        </div>
        <span className={`status-badge status-${status.status}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Item</span>
        <span className="info-value">{status.order.item}</span>
      </div>

      <div className="info-row">
        <span className="info-label">Price</span>
        <span className="info-value">
          {status.order.price} {status.order.currency}
        </span>
      </div>

      {status.agentWallet && (
        <div className="info-row">
          <span className="info-label">Agent Wallet</span>
          <span className="info-value" style={{ fontSize: '0.75rem' }}>
            {status.agentWallet.slice(0, 10)}...{status.agentWallet.slice(-8)}
          </span>
        </div>
      )}

      {status.status === 'pending' && (
        <div className="loading">
          <div className="spinner" />
          <span>Agent is processing your order...</span>
        </div>
      )}

      {status.status === 'approved' && status.transactionHash && (
        <div className="success-message">
          <div style={{ marginBottom: '8px' }}>
            <strong>🎉 Payment Successful!</strong>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <div>Transaction Hash:</div>
            <a 
              href={status.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="tx-link"
            >
              {status.transactionHash}
            </a>
          </div>
        </div>
      )}

      {status.status === 'approved' && !status.transactionHash && (
        <div className="success-message">
          <strong>✅ Order approved by Agent</strong>
          <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>
            Payment was processed (no tx hash returned - agent may need USDT)
          </div>
        </div>
      )}

      {status.status === 'rejected' && (
        <div className="error-message">
          <div style={{ marginBottom: '8px' }}>
            <strong>Order Rejected by Agent</strong>
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            <strong>Reason:</strong> {status.reason || 'Unknown reason'}
          </div>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onNewOrder}
        style={{ width: '100%', marginTop: '15px' }}
      >
        Place New Order
      </button>
    </div>
  );
}

export default OrderStatus;
