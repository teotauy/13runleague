import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ background: '#0a0a0a', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <div style={{ color: '#39ff14', fontSize: '80px', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>13</div>
      <div style={{ color: '#9ca3af', fontSize: '22px', fontFamily: 'monospace' }}>RUN</div>
    </div>,
    { ...size }
  )
}
