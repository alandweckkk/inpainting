"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { put } from '@vercel/blob';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onError: (error: string) => void;
}

export function ImageUpload({ onImageUploaded, onError }: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file (PNG, JPG, GIF, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('Image file size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Vercel blob storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `upload-${timestamp}-${file.name}`;
      
      console.log('📤 Uploading image to blob storage...');
      const blob = await put(filename, file, {
        access: 'public',
        contentType: file.type,
        token: 'vercel_blob_rw_7YXIAVL6dTSbQNIt_domZhqYOsTgdiuYNt4SSHd8zUKiG44',
      });

      console.log('✅ Image uploaded successfully:', blob.url);
      setUploadedImageUrl(blob.url);
      onImageUploaded(blob.url);
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setUploadedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  return (
    <div className="space-y-4">
      {/* Show uploaded image if present */}
      {uploadedImageUrl && (
        <div className="relative">
          <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-600 shadow-sm p-4 flex items-center justify-center min-h-[400px]">
            <div className="bg-blue-100 rounded">
              <img 
                src={uploadedImageUrl} 
                alt="Uploaded image" 
                className="block"
                style={{ maxHeight: '550px', maxWidth: 'none' }}
              />
            </div>
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors z-10"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Always show dropzone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Uploading image...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                Drop an image here or click to select
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 