import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BodyAtlas — Free Interactive Cross-Sectional Anatomy Atlas';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 60px',
            maxWidth: '1000px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold',
              }}
            >
              BA
            </div>
            <span
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#1E293B',
                letterSpacing: '-1px',
              }}
            >
              BodyAtlas
            </span>
          </div>

          <h1
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#334155',
              textAlign: 'center',
              lineHeight: 1.3,
              margin: '0 0 16px 0',
            }}
          >
            Free Interactive Cross-Sectional Anatomy Atlas
          </h1>

          <p
            style={{
              fontSize: '22px',
              color: '#64748B',
              textAlign: 'center',
              margin: '0 0 32px 0',
              lineHeight: 1.5,
            }}
          >
            Browse labeled CT & MRI scans. Search anatomical structures instantly.
            <br />
            The best free alternative to IMAIOS e-Anatomy.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '12px 28px',
                background: '#6366F1',
                color: 'white',
                borderRadius: '12px',
                fontSize: '20px',
                fontWeight: 'bold',
              }}
            >
              $0 Forever
            </div>
            <span style={{ fontSize: '20px', color: '#94A3B8' }}>
              vs IMAIOS at $22/mo
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
