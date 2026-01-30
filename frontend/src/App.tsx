import { useState, useEffect } from 'react';
import ConnectWallet from './components/ConnectWallet';
import OrderForm from './components/OrderForm';
import OrderStatus, { OrderStatusData } from './components/OrderStatus';

// Floating coffee beans background
function CoffeeBeans() {
  const beans = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 15 + Math.random() * 10,
  }));

  return (
    <div className="coffee-beans">
      {beans.map(bean => (
        <span
          key={bean.id}
          className="bean"
          style={{
            left: `${bean.left}%`,
            animationDelay: `${bean.delay}s`,
            animationDuration: `${bean.duration}s`,
          }}
        >
          ☕
        </span>
      ))}
    </div>
  );
}

function App() {
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOrderSubmit = (status: OrderStatusData) => {
    setOrderStatus(status);
    setIsSubmitting(false);
  };

  const handleNewOrder = () => {
    setOrderStatus(null);
  };

  return (
    <>
      <CoffeeBeans />
      
      <div className="container" style={{ opacity: mounted ? 1 : 0 }}>
        <div className="header">
          <h1>☕ Kite AI Coffee</h1>
          <p>Multi-Agent Payment System on Kite Testnet</p>
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
        marginTop: '30px', 
        color: 'rgba(255,255,255,0.3)', 
        fontSize: '0.75rem',
        textAlign: 'center',
        fontWeight: 500,
      }}>
        Built for Kite AI Hackathon • Powered by Account Abstraction
      </div>
    </>
  );
}

export default App;
