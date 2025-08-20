import React, { useRef, useState } from 'react';
import { PhotoIcon, DocumentIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  uploadType: 'image' | 'document';
  disabled?: boolean;
  currentFiles?: string[]; // URLs of currently uploaded files
  onFileRemove?: (index: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "image/*",
  multiple = false,
  maxFiles = 5,
  maxFileSize = 5, // 5MB default
  uploadType,
  disabled = false,
  currentFiles = [],
  onFileRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxFileSize}MB.`;
    }

    // Check file type for images
    if (uploadType === 'image' && !file.type.startsWith('image/')) {
      return `File "${file.name}" is not a valid image file.`;
    }

    // Check file type for documents
    if (uploadType === 'document') {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return `File "${file.name}" is not a valid document. Allowed types: PDF, JPEG, PNG.`;
      }
    }

    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const totalFiles = currentFiles.length + selectedFiles.length + fileArray.length;

    // Check total file limit
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed. You currently have ${currentFiles.length + selectedFiles.length} files.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    // Show errors
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
    }

    // Add valid files
    if (validFiles.length > 0) {
      const newSelectedFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
      setSelectedFiles(newSelectedFiles);
      onFileSelect(newSelectedFiles);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-sensual-red bg-sensual-red/5'
            : disabled
            ? 'border-gray-600 bg-gray-800/50'
            : 'border-gray-600 hover:border-sensual-red bg-gray-800/30 hover:bg-gray-800/50'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
        />

        <div className="text-center">
          <div className="mx-auto h-16 w-16 mb-4">
            {uploadType === 'image' ? (
              <PhotoIcon className="h-16 w-16 text-gray-400 mx-auto" />
            ) : (
              <DocumentIcon className="h-16 w-16 text-gray-400 mx-auto" />
            )}
          </div>
          
          <div className="text-gray-300">
            <p className="text-lg font-medium mb-2">
              {disabled ? 'Upload disabled' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-gray-400 mb-2">
              {uploadType === 'image' 
                ? 'Upload images (JPEG, PNG, WebP)' 
                : 'Upload documents (PDF, JPEG, PNG)'}
            </p>
            <p className="text-xs text-gray-500">
              Max {maxFileSize}MB per file • Up to {maxFiles} files total
            </p>
            {currentFiles.length > 0 && (
              <p className="text-xs text-gray-500">
                {currentFiles.length} files already uploaded
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Currently Uploaded Files */}
      {currentFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Currently Uploaded</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {currentFiles.map((fileUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={fileUrl}
                    alt={`Uploaded file ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.png';
                    }}
                  />
                </div>
                {onFileRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(index);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Files (not yet uploaded) */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Selected Files</h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  {file.type.startsWith('image/') ? (
                    <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getFilePreview(file) || ''}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <DocumentIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeSelectedFile(index)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;