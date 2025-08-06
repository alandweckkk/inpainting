"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Brush, Eraser, RotateCcw, Eye, EyeOff, Download, Save } from "lucide-react";
import { ReactSketchCanvas } from "react-sketch-canvas";

interface MaskEditorProps {
  imageUrl: string;
  onMaskChange: (maskDataUrl: string) => void;
  onMaskSave?: (savedMaskDataUrl: string) => void;
  className?: string;
}

export function MaskEditor({ imageUrl, onMaskChange, onMaskSave, className = "" }: MaskEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sketchRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [brushSize, setBrushSize] = useState(40);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [drawingMode, setDrawingMode] = useState(true); // Always in drawing mode
  const [hasMaskContent, setHasMaskContent] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [maskDataUrl, setMaskDataUrl] = useState<string>("");
  const [showMaskOverlay, setShowMaskOverlay] = useState(false);



  // Function to scale mask from display size to natural size
  const scaleMaskToNaturalSize = useCallback(async (displayMaskDataUrl: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(displayMaskDataUrl);
          return;
        }

        // Set canvas to natural image dimensions
        canvas.width = naturalDimensions.width;
        canvas.height = naturalDimensions.height;

        // Draw the display-sized mask scaled up to natural dimensions
        ctx.drawImage(img, 0, 0, naturalDimensions.width, naturalDimensions.height);

        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = displayMaskDataUrl;
    });
  }, [naturalDimensions]);

  // Function to create a proper binary mask
  const createBinaryMask = useCallback(async (rawDataUrl: string) => {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }

        // Canvas should already be at natural dimensions since ReactSketchCanvas is now set to natural dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        console.log('🎯 Mask dimensions match original:', {
          maskWidth: canvas.width,
          maskHeight: canvas.height,
          originalImageNaturalWidth: naturalDimensions.width,
          originalImageNaturalHeight: naturalDimensions.height,
          dimensionsMatch: canvas.width === naturalDimensions.width && canvas.height === naturalDimensions.height
        });

        // Draw the image
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to binary: if any pixel has any opacity, make it pure white, otherwise black
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha > 0) {
            // Any non-transparent pixel becomes pure white
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
            data[i + 3] = 255; // A
          } else {
            // Transparent pixels become pure black
            data[i] = 0;       // R
            data[i + 1] = 0;   // G
            data[i + 2] = 0;   // B
            data[i + 3] = 255; // A (opaque black)
          }
        }

        // Put the processed data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = rawDataUrl;
    });
  }, []);

  const generateMaskDataUrl = useCallback(async () => {
    if (!sketchRef.current || naturalDimensions.width === 0) return;
    
    try {
      // Export the drawing as PNG at display dimensions
      const rawDataUrl = await sketchRef.current.exportImage('png');
      
      // Scale the mask from display dimensions to natural dimensions
      const scaledMaskDataUrl = await scaleMaskToNaturalSize(rawDataUrl);
      
      // Convert to proper binary mask
      const binaryMaskDataUrl = await createBinaryMask(scaledMaskDataUrl);
      
      console.log('🎨 Natural image dimensions:', naturalDimensions);
      console.log('🎨 Display dimensions:', imageDimensions);
      console.log('🎨 Scale factors:', {
        scaleX: naturalDimensions.width / imageDimensions.width,
        scaleY: naturalDimensions.height / imageDimensions.height
      });
      console.log('🎨 Raw mask data URL length:', rawDataUrl.length);
      console.log('🎨 Scaled mask data URL length:', scaledMaskDataUrl.length);
      console.log('🎨 Binary mask data URL length:', binaryMaskDataUrl.length);
      
      setMaskDataUrl(binaryMaskDataUrl);
      onMaskChange(binaryMaskDataUrl);
      
      // Check if there's actual content
      const hasContent = binaryMaskDataUrl.length > 5000;
      console.log('🎨 Mask has content:', hasContent);
      setHasMaskContent(hasContent);
    } catch (error) {
      console.error('Error generating mask:', error);
    }
  }, [onMaskChange, createBinaryMask, naturalDimensions, imageDimensions]);

  // Handle image load to get dimensions and calculate display size
  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      
      // Store natural dimensions
      setNaturalDimensions({ 
        width: img.naturalWidth, 
        height: img.naturalHeight 
      });
      
      // Calculate the displayed dimensions while maintaining aspect ratio
      const containerWidth = containerRef.current.clientWidth || 800; // fallback
      const maxWidth = Math.min(containerWidth - 32, 800); // 32px for padding, max 800px
      const maxHeight = 550; // max height constraint
      
      const naturalAspectRatio = img.naturalWidth / img.naturalHeight;
      
      let displayWidth = img.naturalWidth;
      let displayHeight = img.naturalHeight;
      
      // Scale down if needed while maintaining aspect ratio
      if (displayWidth > maxWidth) {
        displayWidth = maxWidth;
        displayHeight = displayWidth / naturalAspectRatio;
      }
      
      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * naturalAspectRatio;
      }
      
      // Set the calculated dimensions
      setImageDimensions({ 
        width: Math.round(displayWidth), 
        height: Math.round(displayHeight) 
      });
    }
  };

  // Generate mask data URL whenever the sketch changes
  const handleStrokeEnd = useCallback(() => {
    generateMaskDataUrl();
  }, [generateMaskDataUrl]);

  const clearMask = async () => {
    if (!sketchRef.current) return;
    try {
      await sketchRef.current.clearCanvas();
      setHasMaskContent(false);
      setMaskDataUrl("");
      onMaskChange("");
    } catch (error) {
      console.error('Error clearing mask:', error);
    }
  };



  const downloadMask = () => {
    if (!maskDataUrl) return;
    
    // Create download link
    const link = document.createElement('a');
    link.download = `mask-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = maskDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveMask = () => {
    if (!maskDataUrl || !onMaskSave) return;
    
    // Save the current mask and notify parent component
    onMaskSave(maskDataUrl);
    console.log('💾 Mask saved for GPT submission');
  };

  // Set eraser mode when tool changes
  useEffect(() => {
    if (sketchRef.current && drawingMode) {
      sketchRef.current.eraseMode(tool === 'eraser');
    }
  }, [tool, drawingMode]);

  // Recalculate dimensions when container size changes
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && naturalDimensions.width > 0) {
        handleImageLoad();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [naturalDimensions]);

  const canvasStyle = {
    border: 'none',
    borderRadius: '0px',
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Drawing Tools - Two column layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Green bordered editing tools */}
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-green-500">
          {/* Icons on top row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setTool('brush')}
                className={`p-2 rounded-lg ${tool === 'brush' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-500 hover:text-white transition-colors`}
                title="Brush tool (paint green areas to inpaint)"
              >
                <Brush className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-500 hover:text-white transition-colors`}
                title="Eraser tool (remove mask areas)"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={clearMask}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Clear mask"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Brush size below */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Size:</label>
            <input
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm w-8 font-mono">{brushSize}px</span>
          </div>
        </div>

        {/* Right Column - Preview and Save buttons */}
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border">
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
            title="Preview mask overlay (not yet functional)"
          >
            <Eye className="w-4 h-4" />
            Preview Mask
          </button>
          
          <button
            onClick={saveMask}
            disabled={!maskDataUrl || !onMaskSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            title="Save current mask for GPT submission"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

              {/* Container to measure available width */}
        <div ref={containerRef} className="w-full">
          {/* Image Container - Same styling as upload area */}
          <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-600 shadow-sm p-4 flex items-center justify-center min-h-[400px]">
            <div className="bg-blue-100 rounded relative">
              <div 
                style={{ 
                  width: imageDimensions.width > 0 ? `${imageDimensions.width}px` : 'auto',
                  height: imageDimensions.height > 0 ? `${imageDimensions.height}px` : 'auto'
                }}
              >
                              {/* Background image - ALWAYS display size, never changes */}
                <img 
                  ref={imageRef}
                  src={imageUrl} 
                  alt="Source" 
                  className="block"
                  style={{ 
                    width: imageDimensions.width > 0 ? `${imageDimensions.width}px` : 'auto',
                    height: imageDimensions.height > 0 ? `${imageDimensions.height}px` : 'auto',
                    display: 'block',
                    maxHeight: '550px',
                    maxWidth: 'none'
                  }}
                  onLoad={handleImageLoad}
                />

                {/* Sketch canvas overlay - Only show when in drawing mode */}
                {drawingMode && imageDimensions.width > 0 && (
                  <div 
                    className="absolute top-0 left-0 pointer-events-auto"
                    style={{ 
                      width: imageDimensions.width, 
                      height: imageDimensions.height 
                    }}
                  >
                    <ReactSketchCanvas
                      ref={sketchRef}
                      style={canvasStyle}
                      width={`${imageDimensions.width}px`}
                      height={`${imageDimensions.height}px`}
                      strokeWidth={brushSize}
                      strokeColor="rgba(34, 197, 94, 0.5)"
                      canvasColor="transparent"
                      allowOnlyPointerType="all"
                      onStroke={handleStrokeEnd}
                    />
                  </div>
                )}

                {/* Mask overlay for visualization - Only show when showMaskOverlay is true */}
                {showMaskOverlay && maskDataUrl && !drawingMode && (
                  <div 
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ 
                      width: imageDimensions.width, 
                      height: imageDimensions.height 
                    }}
                  >
                    <img 
                      src={maskDataUrl}
                      alt="Binary mask visualization"
                      className="object-contain opacity-70"
                      style={{ 
                        width: `${imageDimensions.width}px`,
                        height: `${imageDimensions.height}px`,
                        mixBlendMode: 'multiply',
                        filter: 'hue-rotate(240deg) saturate(1.5)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
        </div>
      </div>


    </div>
  );
} 