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
        <h2>🔗 Connect Wallet</h2>
        <p style={{ marginBottom: '15px', color: '#666' }}>
          Connect your wallet to place orders on Kite AI Testnet
        </p>
        <button 
          className="btn-primary" 
          onClick={handleConnect}
          disabled={isPending}
          style={{ width: '100%' }}
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>🔗 Wallet Connected</h2>
      
      {isWrongNetwork && (
        <div className="network-warning">
          ⚠️ Please switch to Kite AI Testnet to place orders
          <button 
            className="btn-secondary"
            onClick={handleSwitchNetwork}
            style={{ marginTop: '10px', width: '100%' }}
          >
            Switch to Kite Testnet
          </button>
        </div>
      )}

      <div className="info-row">
        <span className="info-label">Address</span>
        <span className="info-value">{formatAddress(address!)}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Network</span>
        <span className="info-value" style={{ 
          color: isWrongNetwork ? '#dc3545' : '#28a745' 
        }}>
          {chain?.name || 'Unknown'}
        </span>
      </div>

      <button 
        className="btn-danger"
        onClick={() => disconnect()}
        style={{ marginTop: '15px', width: '100%' }}
      >
        Disconnect
      </button>
    </div>
  );
}

export default ConnectWallet;
