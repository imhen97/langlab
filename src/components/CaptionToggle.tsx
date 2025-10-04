"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CaptionMode = "en" | "ko" | "both";

interface CaptionToggleProps {
  mode: CaptionMode;
  onModeChange: (mode: CaptionMode) => void;
  className?: string;
  disabled?: boolean;
  showLabels?: boolean;
}

interface ToggleOption {
  mode: CaptionMode;
  label: string;
  emoji: string;
  description: string;
}

const toggleOptions: ToggleOption[] = [
  {
    mode: "en",
    label: "English",
    emoji: "🇺🇸",
    description: "English subtitles only"
  },
  {
    mode: "ko", 
    label: "Korean",
    emoji: "🇰🇷",
    description: "Korean subtitles only"
  },
  {
    mode: "both",
    label: "Both",
    emoji: "🌍",
    description: "Both English and Korean subtitles"
  }
];

export function CaptionToggle({
  mode,
  onModeChange,
  className = "",
  disabled = false,
  showLabels = true,
}: CaptionToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm font-medium text-gray-700 mr-2">
        Subtitles:
      </span>
      
      <div className="flex items-center gap-1">
        {toggleOptions.map((option) => (
          <Button
            key={option.mode}
            variant={mode === option.mode ? "default" : "outline"}
            size="sm"
            onClick={() => !disabled && onModeChange(option.mode)}
            disabled={disabled}
            className={cn(
              "transition-all duration-200",
              mode === option.mode && "bg-green-600 hover:bg-green-700 text-white shadow-md",
              mode !== option.mode && "hover:bg-gray-50"
            )}
            title={option.description}
          >
            <span className="mr-1">{option.emoji}</span>
            {showLabels && (
              <span className="text-xs font-medium">
                {option.label}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Active Mode Indicator */}
      <Badge 
        variant={mode === "both" ? "default" : "secondary"}
        className={cn(
          "text-xs",
          mode === "both" && "bg-blue-100 text-blue-700"
        )}
      >
        {mode.toUpperCase()}
      </Badge>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CaptionToggleCompact({
  mode,
  onModeChange,
  className = "",
  disabled = false,
}: Omit<CaptionToggleProps, 'showLabels'>) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {toggleOptions.map((option) => (
        <Button
          key={option.mode}
          variant={mode === option.mode ? "default" : "ghost"}
          size="sm"
          onClick={() => !disabled && onModeChange(option.mode)}
          disabled={disabled}
          className={cn(
            "h-8 w-8 p-0 transition-all duration-200",
            mode === option.mode && "bg-green-600 hover:bg-green-700 text-white",
            mode !== option.mode && "hover:bg-gray-100"
          )}
          title={`${option.emoji} ${option.description}`}
        >
          {option.emoji}
        </Button>
      ))}
    </div>
  );
}

/**
 * Hook for managing caption mode state
 */
export function useCaptionMode(initialMode: CaptionMode = "en") {
  const [mode, setMode] = React.useState<CaptionMode>(initialMode);

  const handleModeChange = React.useCallback((newMode: CaptionMode) => {
    setMode(newMode);
  }, []);

  const isEnglish = mode === "en";
  const isKorean = mode === "ko";
  const isBoth = mode === "both";

  return {
    mode,
    setMode: handleModeChange,
    isEnglish,
    isKorean,
    isBoth,
  };
}



