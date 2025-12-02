"use client"

import { useEffect, useState } from 'react'

export default function ImageModalEnhancer({ children }) {
  const [modalSrc, setModalSrc] = useState<string | null>(null)

  useEffect(() => {
    const images = document.querySelectorAll('.prose img')
    images.forEach(img => {
      const image = img as HTMLImageElement;
      image.style.cursor = 'zoom-in'
      image.onclick = () => setModalSrc(image.src)
    })
    // Add Escape key support
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalSrc(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      images.forEach(img => {
        const image = img as HTMLImageElement;
        image.onclick = null
      })
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      {children}
      {modalSrc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setModalSrc(null)}
        >
          {/* Close button */}
          <button
            style={{
              position: 'absolute',
              top: 24,
              right: 32,
              color: 'white',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              fontSize: '1.1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              zIndex: 1001,
            }}
            onClick={e => {
              e.stopPropagation();
              setModalSrc(null);
            }}
            aria-label="Close image modal"
          >
            Close (or Esc)
          </button>
          <img
            src={modalSrc}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
            }}
            alt=""
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
} 