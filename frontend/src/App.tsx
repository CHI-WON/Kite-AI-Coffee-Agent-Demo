import { useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import OrderForm from './components/OrderForm';
import OrderStatus, { OrderStatusData } from './components/OrderStatus';

function App() {
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOrderSubmit = (status: OrderStatusData) => {
    setOrderStatus(status);
    setIsSubmitting(false);
  };

  const handleNewOrder = () => {
    setOrderStatus(null);
  };

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>☕ Kite AI Coffee Shop</h1>
          <p>Powered by Kite Account Abstraction</p>
        </div>

        <ConnectWallet />

        <div className="divider" />

        {orderStatus ? (
          <OrderStatus 
            status={orderStatus} 
            onNewOrder={handleNewOrder} 
          />
        ) : (
          <OrderForm 
            onSubmit={handleOrderSubmit}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        )}
      </div>

      <div style={{ 
        marginTop: '20px', 
        color: 'rgba(255,255,255,0.7)', 
        fontSize: '0.8rem',
        textAlign: 'center'
      }}>
        Kite AI Hackathon Demo | Agent-based Payment System
      </div>
    </>
  );
}

export default App;
