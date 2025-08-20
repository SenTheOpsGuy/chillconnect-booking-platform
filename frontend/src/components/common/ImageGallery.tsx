import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ImageGalleryProps {
  images: string[];
  onImageRemove?: (index: number) => void;
  allowRemove?: boolean;
  maxImages?: number;
  className?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onImageRemove,
  allowRemove = false,
  maxImages = 5,
  className = ""
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-700 p-8 text-center ${className}`}>
        <p className="text-gray-400">No images uploaded yet</p>
      </div>
    );
  }

  const openModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1;
    } else {
      newIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0;
    }
    setSelectedImageIndex(newIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    
    if (e.key === 'ArrowLeft') {
      navigateImage('prev');
    } else if (e.key === 'ArrowRight') {
      navigateImage('next');
    } else if (e.key === 'Escape') {
      closeModal();
    }
  };

  return (
    <div className={className}>
      {/* Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <div 
              className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => openModal(index)}
            >
              <img
                src={image}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                }}
              />
            </div>
            
            {allowRemove && onImageRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onImageRemove(index);
                }}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Remove image"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}

            {index === 0 && (
              <div className="absolute bottom-2 left-2 bg-sensual-red text-white text-xs px-2 py-1 rounded-full">
                Main
              </div>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {images.length < maxImages && Array.from({ length: maxImages - images.length }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
            <span className="text-gray-500 text-sm">Empty</span>
          </div>
        ))}
      </div>

      {/* Full-screen Modal */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <XMarkIcon className="w-8 h-8" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeftIcon className="w-10 h-10" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRightIcon className="w-10 h-10" />
                </button>
              </>
            )}

            {/* Main image */}
            <img
              src={images[selectedImageIndex]}
              alt={`Image ${selectedImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
              {selectedImageIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;