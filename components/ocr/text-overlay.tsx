'use client';

import { useState, useRef, useEffect } from 'react';
import type { PageTextBlock } from '@/lib/schema';

interface TextOverlayProps {
  imageUrl: string;
  textBlocks: PageTextBlock[];
  imageWidth?: number;
  imageHeight?: number;
  onTextClick?: (block: PageTextBlock) => void;
}

export function TextOverlay({
  imageUrl,
  textBlocks,
  imageWidth: propImageWidth,
  imageHeight: propImageHeight,
  onTextClick,
}: TextOverlayProps) {
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleBlockClick = (block: PageTextBlock) => {
    setSelectedBlock(block.id);
    onTextClick?.(block);
  };

  // Track actual displayed image size and handle cached images
  useEffect(() => {
    const updateSize = () => {
      if (imgRef.current) {
        setDisplayedSize({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
        });
        // Also set natural size if image is already loaded (cached)
        if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
          setNaturalSize({
            width: imgRef.current.naturalWidth,
            height: imgRef.current.naturalHeight,
          });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleImageLoad = () => {
    if (imgRef.current) {
      setDisplayedSize({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
      setNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  const imageWidth = propImageWidth || naturalSize?.width || 1;
  const imageHeight = propImageHeight || naturalSize?.height || 1;

  // Calculate scale factor between original image and displayed size
  const scaleX = displayedSize ? displayedSize.width / imageWidth : 1;
  const scaleY = displayedSize ? displayedSize.height / imageHeight : 1;

  return (
    <div ref={containerRef} className="relative inline-block">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Comic page"
        className="max-w-full h-auto"
        style={{ display: 'block' }}
        onLoad={handleImageLoad}
      />
      {displayedSize && naturalSize && textBlocks.length > 0 && (
        <div 
          className="absolute top-0 left-0"
          style={{ 
            width: displayedSize.width, 
            height: displayedSize.height,
          }}
        >
          {textBlocks.map((block) => {
            const vertices = block.boundingBox.vertices;
            if (vertices.length < 4) return null;

            // Calculate bounding box from vertices
            const minX = Math.min(...vertices.map(v => v.x)) * scaleX;
            const minY = Math.min(...vertices.map(v => v.y)) * scaleY;
            const maxX = Math.max(...vertices.map(v => v.x)) * scaleX;
            const maxY = Math.max(...vertices.map(v => v.y)) * scaleY;

            const isHovered = hoveredBlock === block.id;
            const isSelected = selectedBlock === block.id;

            return (
              <div
                key={block.id}
                className="absolute cursor-pointer transition-all duration-200"
                style={{
                  left: minX,
                  top: minY,
                  width: maxX - minX,
                  height: maxY - minY,
                  backgroundColor: isSelected 
                    ? 'rgba(59, 130, 246, 0.3)' 
                    : isHovered 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'transparent',
                  border: isSelected 
                    ? '2px solid #3b82f6' 
                    : isHovered 
                      ? '2px solid #60a5fa' 
                      : '1px solid transparent',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={() => setHoveredBlock(block.id)}
                onMouseLeave={() => setHoveredBlock(null)}
                onClick={() => handleBlockClick(block)}
              />
            );
          })}
        </div>
      )}
      {hoveredBlock && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm z-10">
          {textBlocks.find((b) => b.id === hoveredBlock)?.text}
        </div>
      )}
    </div>
  );
}
