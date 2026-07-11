export default function VoidTooltip({
  step, index, size, isLastStep,
  primaryProps, skipProps, tooltipProps,
}) {
  return (
    <div
      {...tooltipProps}
      style={{
        background: 'rgba(15,15,25,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(168,85,247,0.35)',
        borderRadius: 14,
        padding: '18px 20px',
        maxWidth: 320,
        boxShadow: '0 0 32px rgba(168,85,247,0.18), 0 8px 30px rgba(0,0,0,0.5)',
        color: '#f0eeff',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <p style={{
        fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: '#8880b0', marginBottom: 8, fontFamily: 'Share Tech Mono, monospace',
      }}>
        Step {index + 1} of {size}
      </p>

      {step.title && (
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{step.title}</h4>
      )}
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#c9c4e8' }}>{step.content}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
        <button
          {...skipProps}
          style={{
            fontSize: 12, background: 'none', border: 'none', cursor: 'pointer',
            color: '#8880b0', padding: 0,
          }}
        >
          Skip tour
        </button>
        <button
          {...primaryProps}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            border: 'none', borderRadius: 9, padding: '8px 16px',
            fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          }}
        >
          {isLastStep ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  )
}
