import React from 'react';
import Button from './Button';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  filename?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose, filename }) => {
  if (!imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const name = filename || `generated-image-${new Date().toISOString()}.png`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 bg-zinc-950 bg-opacity-80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative bg-background-light p-4 rounded-lg w-full max-w-4xl max-h-full flex flex-col items-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-11 h-11 bg-zinc-950/50 text-white rounded-full flex items-center justify-center text-2xl font-bold z-10 hover:bg-brand-primary transition-colors"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="w-full flex-grow flex items-center justify-center overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Fullscreen Preview" 
              className="max-w-full max-h-[calc(100vh-120px)] object-contain rounded-md"
            />
        </div>
        <div className="mt-4 flex-shrink-0">
          <Button onClick={handleDownload}>
            Download Image
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;