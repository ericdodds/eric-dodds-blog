'use client'

import { useState } from 'react'
import Image from 'next/image'
import ImageModal from './ImageModal'

interface ClickableImageProps {
  src: string
  alt: string
  width?: number
  height?: number
}

export default function ClickableImage({ src, alt, width, height }: ClickableImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleImageClick = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  // If width and height are provided, use them
  if (width && height) {
    return (
      <>
        <div 
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleImageClick}
        >
          <Image 
            src={src}
            alt={alt} 
            width={width}
            height={height}
            className="rounded-lg" 
          />
        </div>
        <ImageModal
          src={src}
          alt={alt}
          isOpen={isModalOpen}
          onClose={closeModal}
        />
      </>
    )
  }
  
  // Otherwise, use fill for responsive images
  return (
    <>
      <div 
        className="relative w-full h-64 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleImageClick}
      >
        <Image 
          src={src}
          alt={alt} 
          className="rounded-lg object-cover"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <ImageModal
        src={src}
        alt={alt}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  )
} 