"use client";

import { Download, Clock, Sparkles, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
  processingDetails?: {
    inferenceSteps: number;
    guidanceScale: number;
    strength: number;
    model: string;
    seed?: number;
  };
  apiCallData?: {
    image_url: string;
    prompt: string;
    developer_message?: string;
    mask?: string;
  };
}

interface ResultsPanelProps {
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
}

export function ResultsPanel({ generatedImages, isGenerating }: ResultsPanelProps) {
  const downloadImage = async (imageUrl: string, prompt: string, timestamp: Date) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create download link
      const link = document.createElement('a');
      const filename = `inpainting-${timestamp.toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  if (generatedImages.length === 0 && !isGenerating) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results yet</h3>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-gray-900">Generated Results</h2>
        {generatedImages.length > 0 && (
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {generatedImages.length} image{generatedImages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Processing indicator */}
      {isGenerating && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <div>
              <h3 className="font-medium text-orange-900">Processing with FLUX Kontext LoRA</h3>
              <p className="text-sm text-orange-700">This may take 30-60 seconds...</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated images - vertical stack */}
      <div className="space-y-6">
        {generatedImages.map((image) => (
          <div key={image.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {/* Image */}
            <div className="bg-gray-600 p-4 flex items-center justify-center min-h-[200px]">
              <div className="bg-blue-100 rounded">
                <img 
                  src={image.imageUrl} 
                  alt={`Generated: ${image.prompt}`}
                  className="block max-w-xs"
                />
              </div>
            </div>
            
            {/* Details */}
            <div className="p-4">
              <div className="space-y-3">
                {/* Prompt */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Prompt</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {image.prompt}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {image.timestamp.toLocaleString()}
                  </span>
                </div>

                {/* Processing details */}
                {image.processingDetails && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span className="font-mono">{image.processingDetails.model}</span>
                    </div>
                    {image.processingDetails.seed && (
                      <div className="flex justify-between">
                        <span>Seed:</span>
                        <span className="font-mono">{image.processingDetails.seed}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadImage(image.imageUrl, image.prompt, image.timestamp)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  
                  {/* API Call button */}
                  {image.apiCallData && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3"
                          title="View API call details"
                        >
                          <Code className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">API Call Details</h4>
                          <div className="text-xs">
                            <div className="space-y-2">
                              <div>
                                <label className="font-medium text-gray-700">Image URL:</label>
                                <div className="bg-gray-50 p-2 rounded text-gray-600 break-all font-mono">
                                  {image.apiCallData.image_url}
                                </div>
                              </div>
                              
                              {image.apiCallData.developer_message && (
                                <div>
                                  <label className="font-medium text-gray-700">Developer Message:</label>
                                  <div className="bg-blue-50 p-2 rounded text-gray-600 border border-blue-200">
                                    {image.apiCallData.developer_message}
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <label className="font-medium text-gray-700">Prompt:</label>
                                <div className="bg-gray-50 p-2 rounded text-gray-600">
                                  {image.apiCallData.prompt}
                                </div>
                              </div>
                              
                              {image.apiCallData.mask && (
                                <div>
                                  <label className="font-medium text-gray-700">Mask:</label>
                                  <div className="bg-gray-50 p-2 rounded text-gray-600 break-all font-mono">
                                    {image.apiCallData.mask.length > 100 
                                      ? `${image.apiCallData.mask.substring(0, 100)}...` 
                                      : image.apiCallData.mask
                                    }
                                  </div>
                                  <div className="text-gray-500 text-xs mt-1">
                                    Mask size: {Math.round(image.apiCallData.mask.length / 1024)}KB
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3 pt-3 border-t">
                              <label className="font-medium text-gray-700">Complete API Call Body:</label>
                              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-60 mt-1">
{JSON.stringify({
  image_url: image.apiCallData.image_url,
  prompt: image.apiCallData.prompt,
  ...(image.apiCallData.developer_message && { developer_message: image.apiCallData.developer_message }),
  ...(image.apiCallData.mask && { mask: image.apiCallData.mask })
}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 