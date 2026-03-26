import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

const svg = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <polygon points="16,2 4,9 28,9" fill="#2C2926"/>
  <rect x="4" y="9" width="24" height="2.5" fill="#2C2926"/>
  <rect x="5" y="11.5" width="2.5" height="10" fill="#2C2926"/>
  <rect x="10" y="11.5" width="2.5" height="10" fill="#2C2926"/>
  <rect x="14.75" y="11.5" width="2.5" height="10" fill="#2C2926"/>
  <rect x="19.5" y="11.5" width="2.5" height="10" fill="#2C2926"/>
  <rect x="24.5" y="11.5" width="2.5" height="10" fill="#2C2926"/>
  <rect x="3" y="21.5" width="26" height="2" fill="#2C2926"/>
  <rect x="1.5" y="23.5" width="29" height="2" fill="#2C2926"/>
  <rect x="0" y="25.5" width="32" height="2.5" fill="#2C2926"/>
</svg>`

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#F5F0E8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`}
          width={320}
          height={320}
          alt=""
        />
      </div>
    ),
    { width: 512, height: 512 },
  )
}
