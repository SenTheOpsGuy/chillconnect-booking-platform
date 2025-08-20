import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = '/api/v1';

export interface UploadResponse {
  success: boolean;
  message: string;
  image_url?: string;
  document_url?: string;
  total_images?: number;
  remaining_images?: number;
  document_type?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  message: string;
  uploaded_images: Array<{
    original_filename: string;
    url: string;
  }>;
  errors: Array<{
    filename: string;
    error: string;
  }>;
  total_images: number;
}

export interface UserImages {
  images: string[];
}

class UploadService {
  /**
   * Upload a single profile image
   */
  async uploadProfileImage(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/uploads/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Upload failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload multiple profile images at once
   */
  async uploadBulkProfileImages(files: File[]): Promise<BulkUploadResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_BASE}/uploads/bulk-profile-images`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
      } else if (response.data.errors && response.data.errors.length > 0) {
        response.data.errors.forEach((error: any) => {
          toast.error(`${error.filename}: ${error.error}`);
        });
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Bulk upload failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Upload a verification document
   */
  async uploadVerificationDocument(
    file: File, 
    documentType: 'id_proof' | 'address_proof' | 'professional_cert' | 'other'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      const response = await axios.post(`${API_BASE}/uploads/verification-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Document upload failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a profile image by index
   */
  async deleteProfileImage(imageIndex: number): Promise<UploadResponse> {
    try {
      const response = await axios.delete(`${API_BASE}/uploads/profile-image/${imageIndex}`);
      
      if (response.data.success) {
        toast.success(response.data.message);
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Delete failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get current user's uploaded images
   */
  async getMyImages(): Promise<UserImages> {
    try {
      const response = await axios.get(`${API_BASE}/uploads/my-images`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to fetch images';
      console.error('Failed to fetch images:', errorMessage);
      return { images: [] };
    }
  }

  /**
   * Get the full URL for an uploaded image
   */
  getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http')) {
      return imagePath; // Already a full URL
    }
    
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    
    return `${window.location.origin}/${cleanPath}`;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, type: 'image' | 'document', maxSizeMB: number = 5): string | null {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    // Check file type for images
    if (type === 'image') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        return `File "${file.name}" is not a valid image. Allowed types: JPEG, PNG, WebP.`;
      }
    }

    // Check file type for documents
    if (type === 'document') {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        return `File "${file.name}" is not a valid document. Allowed types: PDF, JPEG, PNG.`;
      }
    }

    return null; // File is valid
  }

  /**
   * Create a preview URL for a file (for display before upload)
   */
  createPreviewUrl(file: File): string | null {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }

  /**
   * Clean up preview URLs to prevent memory leaks
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if file is an image
   */
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Check if file is a document
   */
  isDocument(file: File): boolean {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    return allowedTypes.includes(file.type.toLowerCase());
  }
}

export default new UploadService();