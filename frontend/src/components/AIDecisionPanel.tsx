/**
 * AI Decision Panel Component
 * 
 * Displays the AI's decision-making process transparently:
 * - Final decision (approve/reject/confirm)
 * - Confidence score
 * - Risk level
 * - Step-by-step reasoning
 * - Suggestions if rejected
 */

interface ReasoningStep {
  check: string;
  result: 'pass' | 'fail' | 'warn';
  detail: string;
  weight: number;
}

interface AIDecisionResult {
  decision: string;
  confidence: number;
  riskLevel: string;
  reasoning: ReasoningStep[];
  summary: string;
  suggestions?: string[];
  processingTime: number;
}

interface AIDecisionPanelProps {
  decision: AIDecisionResult;
  compact?: boolean;
}

function AIDecisionPanel({ decision, compact = false }: AIDecisionPanelProps) {
  const getDecisionColor = () => {
    switch (decision.decision) {
      case 'approve': return { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80' };
      case 'reject': return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' };
      case 'confirm': return { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      default: return { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa' };
    }
  };

  const getDecisionIcon = () => {
    switch (decision.decision) {
      case 'approve': return '✅';
      case 'reject': return '❌';
      case 'confirm': return '⚠️';
      default: return '🤔';
    }
  };

  const getRiskColor = () => {
    switch (decision.riskLevel) {
      case 'low': return '#4ade80';
      case 'medium': return '#fbbf24';
      case 'high': return '#f97316';
      case 'critical': return '#ef4444';
      default: return '#a78bfa';
    }
  };

  const colors = getDecisionColor();

  if (compact) {
    return (
      <div style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{getDecisionIcon()}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: colors.text, textTransform: 'uppercase', fontSize: '0.85rem' }}>
            AI: {decision.decision}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
            {Math.round(decision.confidence * 100)}% confidence
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      overflow: 'hidden',
      marginBottom: '20px',
    }}>
      {/* Header */}
      <div style={{
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '2rem' }}>🧠</span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: 800, 
            fontSize: '1.1rem', 
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            AI Decision: 
            <span style={{ color: colors.text, textTransform: 'uppercase' }}>
              {decision.decision}
            </span>
            <span>{getDecisionIcon()}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {decision.summary}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{ background: 'rgba(20,20,30,0.8)', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Confidence
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: colors.text }}>
            {Math.round(decision.confidence * 100)}%
          </div>
        </div>
        <div style={{ background: 'rgba(20,20,30,0.8)', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Risk Level
          </div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: getRiskColor(),
            textTransform: 'uppercase',
          }}>
            {decision.riskLevel}
          </div>
        </div>
        <div style={{ background: 'rgba(20,20,30,0.8)', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Process Time
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a78bfa' }}>
            {decision.processingTime}ms
          </div>
        </div>
      </div>

      {/* Reasoning Steps */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'rgba(255,255,255,0.5)', 
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}>
          AI Reasoning Chain
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {decision.reasoning.map((step, index) => (
            <div 
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                background: step.result === 'pass' 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : step.result === 'warn'
                  ? 'rgba(251, 191, 36, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: `1px solid ${
                  step.result === 'pass' 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : step.result === 'warn'
                    ? 'rgba(251, 191, 36, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)'
                }`,
              }}
            >
              <span style={{ fontSize: '1rem' }}>
                {step.result === 'pass' ? '✓' : step.result === 'warn' ? '⚠' : '✗'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  color: step.result === 'pass' 
                    ? '#4ade80' 
                    : step.result === 'warn'
                    ? '#fbbf24'
                    : '#f87171',
                }}>
                  {step.check}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  {step.detail}
                </div>
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: 'rgba(255,255,255,0.4)',
                background: 'rgba(0,0,0,0.2)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                w:{step.weight.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {decision.suggestions && decision.suggestions.length > 0 && (
        <div style={{ 
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(251, 191, 36, 0.05)',
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#fbbf24', 
            marginBottom: '8px',
            fontWeight: 600,
          }}>
            💡 Suggestions
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.85rem',
          }}>
            {decision.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AIDecisionPanel;
