import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ background: '#0a0a0a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#39ff14', fontSize: '20px', fontWeight: 900, fontFamily: 'monospace' }}>
      13
    </div>,
    { ...size }
  )
}
