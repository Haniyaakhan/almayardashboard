'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{error.message}</p>
      <button onClick={reset} style={{
        padding: '8px 20px', borderRadius: 8, border: 'none',
        background: 'var(--orange, #ff6b2b)', color: '#fff',
        fontWeight: 600, cursor: 'pointer',
      }}>Try Again</button>
    </div>
  );
}
