export default function Home() {
  return (
    <html>
      <body style={{ 
        margin: 0, 
        background: '#000', 
        color: '#fff', 
        fontFamily: 'monospace',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', color: '#00ffff', margin: 0 }}>
            GCOIN<span style={{ color: '#ff6600' }}>AGENT</span>
          </h1>
          <p style={{ color: '#888', fontSize: '18px' }}>🚀 LIVE</p>
        </div>
      </body>
    </html>
  );
}
