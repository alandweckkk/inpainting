"use client";

import { useState, useEffect } from "react";
import { Wand2, MessageSquare, ChevronDown, ChevronRight, Save } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { MaskEditor } from "@/components/MaskEditor";
import { PromptPanel } from "@/components/PromptPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
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

const DEVELOPER_MESSAGE_STORAGE_KEY = 'gpt-developer-message-default';

export default function InpaintingTool() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // GPT state variables
  const [gptPopoverOpen, setGptPopoverOpen] = useState(false);
  const [gptPrompt, setGptPrompt] = useState("");
  const [gptDeveloperMessage, setGptDeveloperMessage] = useState("");
  const [gptResponse, setGptResponse] = useState("");
  const [gptTextResponse, setGptTextResponse] = useState("");
  const [gptLoading, setGptLoading] = useState(false);
  const [gptGeneratedImages, setGptGeneratedImages] = useState<string[]>([]);
  const [savedMaskDataUrl, setSavedMaskDataUrl] = useState<string>("");
  const [gptAccordionOpen, setGptAccordionOpen] = useState(false);

  // Load default developer message from localStorage on mount
  useEffect(() => {
    try {
      const savedDeveloperMessage = localStorage.getItem(DEVELOPER_MESSAGE_STORAGE_KEY);
      if (savedDeveloperMessage) {
        setGptDeveloperMessage(savedDeveloperMessage);
      }
    } catch (error) {
      console.warn('Failed to load developer message from localStorage:', error);
    }
  }, []);

  const handleImageUploaded = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
    setMaskDataUrl(""); // Reset mask when new image is uploaded
    setSavedMaskDataUrl(""); // Reset saved mask when new image is uploaded
    setError(null);
  };

  const handleMaskChange = (newMaskDataUrl: string) => {
    setMaskDataUrl(newMaskDataUrl);
    setError(null);
  };

  const handleMaskSave = (savedMaskDataUrl: string) => {
    setSavedMaskDataUrl(savedMaskDataUrl);
    console.log('✅ Mask saved for GPT submission');
  };

  const handleSaveDeveloperMessage = () => {
    try {
      localStorage.setItem(DEVELOPER_MESSAGE_STORAGE_KEY, gptDeveloperMessage);
      console.log('✅ Developer message saved as default');
      // You could add a toast notification here if desired
    } catch (error) {
      console.error('Failed to save developer message to localStorage:', error);
    }
  };

  const handleGenerate = async (prompt: string) => {
    if (!uploadedImageUrl || !maskDataUrl) {
      setError("Please upload an image and create a mask first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('image_url', uploadedImageUrl);
      formData.append('prompt', prompt);
      
      // Convert mask data URL to blob
      const maskResponse = await fetch(maskDataUrl);
      const maskBlob = await maskResponse.blob();
      formData.append('mask', maskBlob, 'mask.png');

      console.log('🚀 Starting inpainting generation...');
      console.log('📝 Prompt:', prompt);
      console.log('🖼️ Image URL:', uploadedImageUrl);
      console.log('🎭 Mask size:', maskBlob.size, 'bytes');

      // Call the API
      const response = await fetch('/api/kontext-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: Failed to generate image`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success || !result.data?.imageUrl) {
        throw new Error(result.error || 'No processed image URL in response');
      }

      // Add the generated image to the results
      const newImage: GeneratedImage = {
        id: `img-${Date.now()}`,
        imageUrl: result.data.imageUrl,
        prompt: prompt,
        timestamp: new Date(),
        processingDetails: result.data.processingDetails ? {
          ...result.data.processingDetails,
          seed: result.data.seed
        } : undefined,
        apiCallData: {
          image_url: uploadedImageUrl,
          prompt: prompt,
          developer_message: gptDeveloperMessage.trim() || undefined,
          mask: savedMaskDataUrl || undefined
        }
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      console.log('✅ Image generated successfully:', result.data.imageUrl);

    } catch (error) {
      console.error('❌ Error generating image:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Function to handle GPT-4o submission
  const handleGptSubmit = async (imageUrl: string) => {
    if (!gptPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setGptLoading(true);
    setGptResponse("");
    setGptTextResponse("");
    setGptGeneratedImages([]);
    setGptAccordionOpen(false);

    try {
      // Prepare input array starting with developer message if provided
      const input = [];
      
      // Add developer message if provided
      if (gptDeveloperMessage.trim()) {
        input.push({
          role: "developer",
          content: [
            {
              type: "input_text",
              text: gptDeveloperMessage.trim()
            }
          ]
        });
      }

      // Prepare user content array with text and original image
      const userContent = [
        {
          type: "input_text",
          text: gptPrompt
        },
        {
          type: "input_image",
          image_url: imageUrl
        }
      ];

      // Add saved mask if available
      if (savedMaskDataUrl) {
        userContent.push({
          type: "input_image",
          image_url: savedMaskDataUrl
        });
      }

      // Add user message
      input.push({
        role: "user",
        content: userContent
      });

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          input: input,
          tools: [
            {
              type: "image_generation"
            }
          ]
        })
      });

      const data = await response.json();
      
      // Extract text response from the API
      let textResponse = "";
      if (data.output && data.output.length > 0) {
        const imageUrls: string[] = [];
        
        data.output.forEach((item: any) => {
          // Check for message type with content
          if (item.type === "message" && item.content) {
            item.content.forEach((contentItem: any) => {
              // Extract text content
              if (contentItem.type === "text" || contentItem.type === "input_text") {
                textResponse += contentItem.text + " ";
              }
              
              // Handle output_image with URL
              if (contentItem.type === "output_image" && contentItem.image_url) {
                imageUrls.push(contentItem.image_url);
              }
              // Handle output_image with base64 data
              if (contentItem.type === "output_image" && contentItem.image) {
                if (typeof contentItem.image === 'string' && contentItem.image.startsWith('data:image/')) {
                  imageUrls.push(contentItem.image);
                } else if (typeof contentItem.image === 'string') {
                  // Assume it's base64 without data URL prefix
                  imageUrls.push(`data:image/png;base64,${contentItem.image}`);
                }
              }
              // Also check for direct image property
              if (contentItem.type === "image") {
                if (contentItem.image_url) {
                  imageUrls.push(contentItem.image_url);
                } else if (contentItem.image && typeof contentItem.image === 'string') {
                  if (contentItem.image.startsWith('data:image/')) {
                    imageUrls.push(contentItem.image);
                  } else {
                    imageUrls.push(`data:image/png;base64,${contentItem.image}`);
                  }
                }
              }
            });
          }
          
          // Check for direct image generation call results
          if (item.type === "image_generation_call") {
            if (item.output && item.output.image_url) {
              imageUrls.push(item.output.image_url);
            } else if (item.output && item.output.image) {
              if (typeof item.output.image === 'string') {
                if (item.output.image.startsWith('data:image/')) {
                  imageUrls.push(item.output.image);
                } else {
                  imageUrls.push(`data:image/png;base64,${item.output.image}`);
                }
              }
            }
          }
          
          // Check for tool call results
          if (item.type === "tool_call_result" && item.content) {
            if (item.content.image_url) {
              imageUrls.push(item.content.image_url);
            } else if (item.content.image && typeof item.content.image === 'string') {
              if (item.content.image.startsWith('data:image/')) {
                imageUrls.push(item.content.image);
              } else {
                imageUrls.push(`data:image/png;base64,${item.content.image}`);
              }
            }
          }
        });
        
        console.log('Extracted image URLs:', imageUrls);
        console.log('Extracted text response:', textResponse.trim());
        console.log('Full response for debugging:', data);
        setGptGeneratedImages(imageUrls);
      }
      
      setGptTextResponse(textResponse.trim());
      setGptResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error calling GPT-4o:', error);
      setGptResponse(`Error: ${error}`);
    } finally {
      setGptLoading(false);
    }
  };

  const hasValidMask = maskDataUrl.length > 1000; // Simple check for mask content

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10" style={{ height: '50px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Left: GPT Button */}
          <div className="flex items-center">
            <Popover open={gptPopoverOpen} onOpenChange={setGptPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  disabled={!uploadedImageUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>GPT</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Image:</label>
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded break-all">
                      {uploadedImageUrl || "No image uploaded"}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Current Mask:</label>
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded break-all">
                      {savedMaskDataUrl ? `Saved (${Math.round(savedMaskDataUrl.length / 1024)}KB)` : "No mask saved - click Save button after creating mask"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-sm font-medium">Developer Message (Optional):</label>
                      <button
                        onClick={handleSaveDeveloperMessage}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Save as default developer message"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                    </div>
                    <textarea
                      value={gptDeveloperMessage}
                      onChange={(e) => setGptDeveloperMessage(e.target.value)}
                      placeholder="Enter developer instructions (higher priority than user prompt)..."
                      className="w-full mt-1 p-2 border rounded-lg resize-none text-xs"
                      rows={2}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Developer messages have higher authority than user prompts and are useful for technical instructions or context.
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Prompt:</label>
                    <textarea
                      value={gptPrompt}
                      onChange={(e) => setGptPrompt(e.target.value)}
                      placeholder="Enter your prompt for GPT-4o..."
                      className="w-full mt-1 p-2 border rounded-lg resize-none"
                      rows={3}
                    />
                  </div>
                  
                  <button
                    onClick={() => uploadedImageUrl && handleGptSubmit(uploadedImageUrl)}
                    disabled={!gptPrompt.trim() || !uploadedImageUrl || gptLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {gptLoading ? 'Processing...' : 'Submit to GPT-4o'}
                  </button>

                  {/* Generated Images Display */}
                  {gptGeneratedImages.length > 0 && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <label className="text-lg font-bold text-green-800 mb-3 block">🎨 Generated Images ({gptGeneratedImages.length}):</label>
                      <div className="space-y-4">
                        {gptGeneratedImages.map((imageUrl, index) => (
                          <div key={index} className="bg-white border-2 border-green-300 rounded-lg p-3 shadow-sm">
                            <div className="text-sm font-medium text-green-700 mb-2">
                              Image {index + 1}:
                            </div>
                            <div className="flex justify-center mb-3">
                              <img 
                                src={imageUrl} 
                                alt={`Generated image ${index + 1}`}
                                className="max-w-full max-h-64 rounded-lg border shadow-sm"
                                onError={(e) => {
                                  console.error('Error loading image:', imageUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded break-all font-mono">
                              {imageUrl.length > 100 ? `${imageUrl.substring(0, 100)}...` : imageUrl}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {gptResponse && (
                    <div className="space-y-3">
                      {/* Accordion for API Response */}
                      <div className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => setGptAccordionOpen(!gptAccordionOpen)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm font-medium">API Response</span>
                          {gptAccordionOpen ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        {gptAccordionOpen && (
                          <div className="border-t border-gray-200 p-3">
                            <pre className="bg-gray-100 text-xs rounded-lg overflow-auto max-h-60 p-2">
                              {gptResponse}
                            </pre>
                          </div>
                        )}
                      </div>
                      
                      {/* Parsed Model Response */}
                      <div>
                        <label className="text-sm font-medium">Model Response:</label>
                        <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                          {(() => {
                            try {
                              const parsed = JSON.parse(gptResponse);
                              
                              // Extract text from various possible response structures
                              let responseTexts: string[] = [];
                              
                              // Check for direct content in response
                              if (parsed.content && Array.isArray(parsed.content)) {
                                parsed.content.forEach((item: any) => {
                                  if (item.type === "text" && typeof item.text === "string") {
                                    responseTexts.push(item.text);
                                  }
                                });
                              }
                              
                              // Check for output array with message content
                              if (parsed.output && Array.isArray(parsed.output)) {
                                parsed.output.forEach((item: any) => {
                                  if (item.type === "message" && item.content && Array.isArray(item.content)) {
                                    item.content.forEach((contentItem: any) => {
                                      // Handle both "text" and "output_text" types
                                      if ((contentItem.type === "text" || contentItem.type === "output_text") && typeof contentItem.text === "string") {
                                        responseTexts.push(contentItem.text);
                                      }
                                    });
                                  }
                                });
                              }
                              
                              // Check for choices array (OpenAI format)
                              if (parsed.choices && Array.isArray(parsed.choices)) {
                                parsed.choices.forEach((choice: any) => {
                                  if (choice.message && typeof choice.message.content === "string") {
                                    responseTexts.push(choice.message.content);
                                  }
                                });
                              }
                              
                              // Check for direct message property
                              if (parsed.message && typeof parsed.message.content === "string") {
                                responseTexts.push(parsed.message.content);
                              }
                              
                              // Check for text property directly
                              if (typeof parsed.text === "string") {
                                responseTexts.push(parsed.text);
                              }
                              
                              // Debug: Show the structure if no text found
                              if (responseTexts.length === 0) {
                                console.log("No text found in response. Structure:", parsed);
                                return `No readable text found. Response structure: ${JSON.stringify(Object.keys(parsed), null, 2)}`;
                              }
                              
                              return responseTexts.join(" ").trim();
                              
                            } catch (error) {
                              console.error("Error parsing GPT response:", error);
                              return `Error parsing API response: ${error}`;
                            }
                          })()}
                        </div>
                      </div>
                      
                      {/* Generated Images Text Response (if different from parsed) */}
                      {gptTextResponse && gptTextResponse.trim() && (
                        <div>
                          <label className="text-sm font-medium">Additional Text Response:</label>
                          <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            {gptTextResponse}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: Title */}
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">Kontext Inpainting Tool</h1>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar - Directly under header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <PromptPanel
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            hasValidMask={hasValidMask}
            disabled={!uploadedImageUrl}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-0">
          {/* Left Column - Input (50% width) */}
          <div className="w-1/2 pr-6 space-y-6">
            {/* Upload Area */}
            <ImageUpload 
              onImageUploaded={handleImageUploaded}
              onError={handleError}
            />
            
            {/* Mask Creation Area - Only show when image is uploaded */}
            {uploadedImageUrl && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Mask</h2>
                <MaskEditor
                  imageUrl={uploadedImageUrl}
                  onMaskChange={handleMaskChange}
                  onMaskSave={handleMaskSave}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-gray-300"></div>

          {/* Right Column - Results (50% width) */}
          <div className="w-1/2 pl-6">
            <ResultsPanel
              generatedImages={generatedImages}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 