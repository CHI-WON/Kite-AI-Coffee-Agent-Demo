/**
 * Agent step data from backend
 */
export interface AgentStep {
  agent: string;
  role: string;
  aaWallet: string;
  timestamp: number;
  duration: number;
  result: string;
  message?: string;
  txHash?: string;
  explorerUrl?: string;
}

/**
 * Pipeline data from backend response
 */
export interface PipelineData {
  reception?: AgentStep;
  approval?: AgentStep;
  payment?: AgentStep & {
    txHash?: string;
    explorerUrl?: string;
  };
}

interface AgentPipelineProps {
  pipeline: PipelineData;
  currentStatus: string;
}

function AgentPipeline({ pipeline, currentStatus }: AgentPipelineProps) {
  const steps = [
    { key: 'reception', label: 'Reception', icon: '📥', data: pipeline.reception },
    { key: 'approval', label: 'Approval', icon: '🔍', data: pipeline.approval },
    { key: 'payment', label: 'Payment', icon: '💳', data: pipeline.payment },
  ];

  const getStepStatus = (stepKey: string, stepData?: AgentStep) => {
    if (!stepData) {
      if (currentStatus === 'received' && stepKey === 'reception') return 'active';
      if (currentStatus === 'validating' && stepKey === 'reception') return 'active';
      if (currentStatus === 'pending_approval' && stepKey === 'approval') return 'active';
      if (currentStatus === 'approved' && stepKey === 'payment') return 'active';
      if (currentStatus === 'processing' && stepKey === 'payment') return 'active';
      return 'pending';
    }

    const successResults = ['pass', 'approved', 'success'];
    if (successResults.includes(stepData.result)) return 'success';
    return 'failed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'active': return '';
      default: return '';
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'success': return { bg: '#22c55e', border: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' };
      case 'failed': return { bg: '#ef4444', border: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' };
      case 'active': return { bg: '#8b5cf6', border: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.6)' };
      default: return { bg: 'transparent', border: 'rgba(255,255,255,0.2)', glow: 'none' };
    }
  };

  return (
    <div className="pipeline-container" style={{ marginBottom: '20px' }}>
      <div style={{ 
        fontSize: '0.85rem', 
        color: 'rgba(255,255,255,0.5)', 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>🔄</span>
        <span style={{ fontWeight: 600 }}>Multi-Agent Pipeline</span>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'relative',
        padding: '0 20px',
      }}>
        {/* Connection lines */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '70px',
          right: '70px',
          height: '3px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          zIndex: 0,
        }}>
          {/* Progress indicator */}
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #22c55e, #8b5cf6)',
            borderRadius: '2px',
            width: pipeline.payment?.result === 'success' ? '100%' :
                   pipeline.approval ? '66%' :
                   pipeline.reception ? '33%' : '0%',
            transition: 'width 0.5s ease',
          }} />
        </div>

        {steps.map((step) => {
          const status = getStepStatus(step.key, step.data);
          const colors = getStatusColors(status);
          
          return (
            <div 
              key={step.key}
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 1,
                flex: 1,
              }}
            >
              {/* Step circle */}
              <div 
                className={status === 'active' ? 'pipeline-step active' : 'pipeline-step'}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: status === 'pending' ? 'rgba(20,20,30,0.8)' : colors.bg,
                  border: `3px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: status === 'pending' ? 'rgba(255,255,255,0.3)' : 'white',
                  fontWeight: 'bold',
                  fontSize: status === 'active' ? '1.2rem' : '1rem',
                  marginBottom: '10px',
                  boxShadow: status !== 'pending' ? `0 0 20px ${colors.glow}` : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {status === 'active' ? (
                  <div className="spinner" style={{ 
                    width: '20px', 
                    height: '20px',
                    borderWidth: '3px',
                  }} />
                ) : status === 'pending' ? (
                  <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                ) : (
                  getStatusIcon(status)
                )}
              </div>

              {/* Step label */}
              <div style={{ 
                fontSize: '0.8rem',
                fontWeight: 600,
                color: status === 'pending' ? 'rgba(255,255,255,0.3)' : '#fff',
                marginBottom: '4px',
                textAlign: 'center',
              }}>
                {step.label}
              </div>

              {/* Duration if available */}
              {step.data && (
                <div style={{ 
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: 'monospace',
                }}>
                  {step.data.duration}ms
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status summary */}
      <div style={{
        marginTop: '20px',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
          Status
        </div>
        <div style={{ 
          fontWeight: 700,
          fontSize: '0.85rem',
          color: currentStatus === 'completed' ? '#4ade80' : 
                 currentStatus === 'rejected' || currentStatus === 'failed' ? '#f87171' : 
                 '#a78bfa',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {currentStatus.replace('_', ' ')}
        </div>
      </div>
      
      {pipeline.payment?.txHash && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
            Transaction Hash
          </div>
          <a 
            href={pipeline.payment.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tx-link"
            style={{ fontSize: '0.8rem' }}
          >
            {pipeline.payment.txHash.slice(0, 16)}...{pipeline.payment.txHash.slice(-12)}
          </a>
        </div>
      )}
    </div>
  );
}

export default AgentPipeline;
