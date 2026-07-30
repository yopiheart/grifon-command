import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ZoomOut, X } from 'lucide-react';
import Button from './Button';
import { watermarkImage } from '../../utils/watermark';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  filename?: string;
  /** Free-tier lightbox downloads carry the export watermark. Off by default. */
  watermark?: boolean;
}

const ZOOM_SCALE = 2;
const DRAG_THRESHOLD_PX = 4;

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, filename, watermark = false }) => {
  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setZoomed(false);
    setOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  if (!imageUrl) return null;

  const handleDownload = async () => {
    // watermarkImage returns the original on any failure, so the download always
    // succeeds. No-op unless the caller opted in.
    const href = watermark ? await watermarkImage(imageUrl) : imageUrl;
    const link = document.createElement('a');
    link.href = href;
    const name = filename || `generated-image-${new Date().toISOString()}.png`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetZoom = () => {
    setZoomed(false);
    setOffset({ x: 0, y: 0 });
  };

  const onImageMouseDown = (e: ReactMouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    movedRef.current = false;
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onContainerMouseMove = (e: ReactMouseEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      movedRef.current = true;
    }
    setOffset({ x: dragStartRef.current.ox + dx, y: dragStartRef.current.oy + dy });
  };

  const endDrag = () => {
    dragStartRef.current = null;
    setDragging(false);
  };

  const onImageClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    if (zoomed) {
      resetZoom();
    } else {
      setZoomed(true);
    }
  };

  const cursorClass = zoomed
    ? dragging
      ? 'cursor-grabbing'
      : 'cursor-grab'
    : 'cursor-zoom-in';

  return createPortal(
    <div
      className="fixed inset-0 bg-zinc-950 bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onMouseMove={onContainerMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-background-light p-4 rounded-lg w-full max-w-4xl max-h-full flex flex-col items-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-11 h-11 bg-zinc-950/50 text-white rounded-full flex items-center justify-center z-10 hover:bg-[#FFCC00] hover:text-zinc-950 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {zoomed && (
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            className="absolute top-2 left-2 w-11 h-11 bg-zinc-950/50 text-white rounded-full flex items-center justify-center z-10 hover:bg-[#FFCC00] hover:text-zinc-950 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        )}
        <div className="w-full flex-grow flex items-center justify-center overflow-hidden select-none">
          <img
            src={imageUrl}
            alt="Fullscreen Preview"
            draggable={false}
            onMouseDown={onImageMouseDown}
            onClick={onImageClick}
            className={`max-w-full max-h-[calc(100vh-160px)] object-contain rounded-md ${cursorClass}`}
            style={{
              transform: zoomed
                ? `scale(${ZOOM_SCALE}) translate(${offset.x / ZOOM_SCALE}px, ${offset.y / ZOOM_SCALE}px)`
                : 'scale(1)',
              transition: dragging ? 'none' : 'transform 0.2s ease',
            }}
          />
        </div>
        <div className="mt-4 flex-shrink-0 flex items-center gap-4">
          <p className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">
            {zoomed ? '// DRAG_TO_PAN · CLICK_TO_ZOOM_OUT' : '// CLICK_IMAGE_TO_ZOOM_IN'}
          </p>
          <Button onClick={handleDownload}>
            Download Image
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImageModal;