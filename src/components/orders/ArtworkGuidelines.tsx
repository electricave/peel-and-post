'use client';

import { useState } from 'react';

const GUIDELINES = [
  {
    icon: '📁',
    title: 'File Formats',
    detail: 'PDF, AI, or EPS preferred. PNG or JPG accepted at high resolution. SVG supported for vector artwork.',
  },
  {
    icon: '🔍',
    title: 'Resolution & DPI',
    detail: 'Minimum 300 DPI at final print size. 600 DPI preferred for small or detailed designs. Low-res files may result in blurry prints.',
  },
  {
    icon: '📐',
    title: 'Bleed & Safe Zone',
    detail: 'Add 1.5mm bleed beyond the cut line on all sides. Keep all text and important elements at least 1.5mm inside the cut line.',
  },
  {
    icon: '🎨',
    title: 'Colour Mode',
    detail: 'Set your document to CMYK colour mode. RGB files will be converted and colours may shift slightly. Pantone colours should be noted in your order.',
  },
]

export default function ArtworkGuidelines() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      marginBottom: 16,
      borderRadius: 10,
      border: '1px solid var(--cream-dark)',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--cream)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📋</span>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '1.5px',
            textTransform: 'uppercase', color: 'var(--brown)',
            fontFamily: 'Lato, sans-serif',
          }}>
            Artwork Guidelines
          </span>
        </div>
        <span style={{
          fontSize: 11, color: 'var(--brown-light)',
          transition: 'transform 0.2s',
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>
          ▼
        </span>
      </button>

      {/* Expandable content */}
      {open && (
        <div style={{
          padding: '14px 14px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: 'var(--white)',
          borderTop: '1px solid var(--cream-dark)',
        }}>
          {GUIDELINES.map(g => (
            <div key={g.title} style={{
              display: 'flex',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              background: 'var(--cream)',
              border: '1px solid var(--cream-dark)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{g.icon}</span>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--brown)',
                  fontFamily: 'Lato, sans-serif', marginBottom: 3,
                }}>
                  {g.title}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--brown-light)',
                  fontFamily: 'Lato, sans-serif', lineHeight: 1.5,
                }}>
                  {g.detail}
                </div>
              </div>
            </div>
          ))}

          {/* Download template link placeholder */}
          <div style={{
            gridColumn: '1 / -1',
            paddingTop: 10,
            borderTop: '1px solid var(--cream-dark)',
            marginTop: 4,
          }}>
            <p style={{
              margin: 0, fontSize: 12, color: 'var(--brown-light)',
              fontFamily: 'Lato, sans-serif',
            }}>
              Questions about your artwork?{' '}
              <span
                style={{
                  color: 'var(--terracotta)', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Message the studio
              </span>
              {' '}and we'll help you get print-ready.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}