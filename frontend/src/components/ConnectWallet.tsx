import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { kiteTestnet } from '../config';

function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== kiteTestnet.id;

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleSwitchNetwork = () => {
    switchChain({ chainId: kiteTestnet.id });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
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
            🔗
          </span>
          Connect Wallet
        </h2>
        <p style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
          Connect your wallet to place orders on Kite AI Testnet
        </p>
        <button 
          className="btn-primary" 
          onClick={handleConnect}
          disabled={isPending}
          style={{ width: '100%' }}
        >
          {isPending ? (
            <>
              <span className="spinner" style={{ display: 'inline-block', marginRight: '10px', verticalAlign: 'middle' }} />
              Connecting...
            </>
          ) : (
            '🦊 Connect MetaMask'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <span style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '10px',
          marginRight: '4px'
        }}>
          ✓
        </span>
        Wallet Connected
      </h2>
      
      {isWrongNetwork && (
        <div className="network-warning">
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Wrong Network</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Please switch to Kite AI Testnet</div>
          </div>
          <button 
            className="btn-secondary"
            onClick={handleSwitchNetwork}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            Switch
          </button>
        </div>
      )}

      <div style={{ 
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem'
          }}>
            🦊
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>
              Your Address
            </div>
            <div style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 600 }}>
              {formatAddress(address!)}
            </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Network</span>
          <span style={{ 
            fontSize: '0.85rem',
            fontWeight: 600,
            color: isWrongNetwork ? '#f87171' : '#4ade80',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isWrongNetwork ? '#f87171' : '#4ade80',
              animation: isWrongNetwork ? 'none' : 'pulse 2s infinite'
            }} />
            {chain?.name || 'Unknown'}
          </span>
        </div>
      </div>

      <button 
        className="btn-danger"
        onClick={() => disconnect()}
        style={{ width: '100%' }}
      >
        Disconnect Wallet
      </button>
    </div>
  );
}

export default ConnectWallet;
