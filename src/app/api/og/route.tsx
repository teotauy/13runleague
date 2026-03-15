import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || '13 Run League'
  const subtitle = searchParams.get('subtitle') || 'MLB Probability Dashboard'

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0d1a0d 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Green accent bar at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#39ff14' }} />

        {/* Big 13 */}
        <div style={{ color: '#39ff14', fontSize: '160px', fontWeight: 900, lineHeight: 1, letterSpacing: '-4px' }}>
          13
        </div>

        {/* Title */}
        <div style={{ color: 'white', fontSize: '52px', fontWeight: 700, marginTop: '16px', lineHeight: 1.1 }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{ color: '#9ca3af', fontSize: '30px', marginTop: '20px' }}>
          {subtitle}
        </div>

        {/* URL watermark */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '80px',
          color: '#39ff14',
          fontSize: '22px',
          opacity: 0.7,
        }}>
          13runleague.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
