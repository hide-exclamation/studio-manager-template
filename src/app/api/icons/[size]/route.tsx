import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params
  const size = parseInt(sizeParam, 10) || 192

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: size * 0.5,
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F1E8',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          borderRadius: size * 0.15,
        }}
      >
        h!
      </div>
    ),
    {
      width: size,
      height: size,
    }
  )
}
