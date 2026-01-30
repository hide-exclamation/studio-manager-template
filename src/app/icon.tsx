import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#0A0A0A',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F1E8',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          borderRadius: 6,
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
