"use client";

import { useState } from "react";
import { Wand2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PromptPanelProps {
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
  hasValidMask: boolean;
  disabled?: boolean;
}

export function PromptPanel({ onGenerate, isGenerating, hasValidMask, disabled = false }: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!prompt.trim()) {
      return;
    }
    onGenerate(prompt.trim());
  };

  const canGenerate = prompt.trim().length > 0 && hasValidMask && !isGenerating && !disabled;

  return (
    <div className="flex items-start gap-6">
      {/* Prompt Section - Takes up most space */}
      <div className="flex-1">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to inpaint in the masked area..."
          className="min-h-[120px] resize-none text-sm"
          disabled={isGenerating || disabled}
          maxLength={500}
        />
      </div>

      {/* Model Parameters - Compact */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 min-w-[200px]">
        <h4 className="font-semibold text-sm text-gray-900">Model Settings</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-mono">FLUX.1 Kontext LoRA</span>
          </div>
          <div className="flex justify-between">
            <span>Inference Steps:</span>
            <span className="font-mono">30</span>
          </div>
          <div className="flex justify-between">
            <span>Guidance Scale:</span>
            <span className="font-mono">2.5</span>
          </div>
          <div className="flex justify-between">
            <span>Strength:</span>
            <span className="font-mono">0.88</span>
          </div>
          <div className="flex justify-between">
            <span>Output Format:</span>
            <span className="font-mono">PNG</span>
          </div>
        </div>
      </div>

      {/* Generate Button - Fixed width */}
      <div className="flex flex-col items-center">
        <Button
          onClick={handleSubmit}
          disabled={!canGenerate}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-8"
          size="lg"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>

        {/* Status Messages */}
        <div className="mt-2 text-xs text-center max-w-[150px]">
          {!hasValidMask && !disabled ? (
            <span className="text-gray-500">Upload an image to get started</span>
          ) : !prompt.trim() && hasValidMask ? (
            <span className="text-gray-500">Enter a prompt to describe the changes</span>
          ) : canGenerate ? (
            <span className="text-green-600">Ready to generate!</span>
          ) : disabled ? (
            <span className="text-gray-500">Upload an image to get started</span>
          ) : null}
        </div>
      </div>
    </div>
  );
} 