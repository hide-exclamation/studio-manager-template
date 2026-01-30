import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F1E8',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          borderRadius: 32,
        }}
      >
        h!
      </div>
    ),
    {
      ...size,
    }
  )
}
