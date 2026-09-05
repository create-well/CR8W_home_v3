export function AuthGate() {
  return (
    <div data-testid="auth-gate" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)', padding: 16,
    }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <img
          src="/create-well-wordmark.png"
          alt="Create Well"
          style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 12px' }}
        />
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
          Dashboard access is temporarily disabled.
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: '0.9rem' }}>
          Authenticated routes require a server-issued session before this dashboard can be re-enabled.
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 0, fontSize: '0.9rem' }}>
          Access will remain closed until that session flow is implemented.
        </p>
      </div>
    </div>
  );
}
