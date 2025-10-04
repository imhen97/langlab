# Enhanced Video Player System

A comprehensive video player system with volume control, playback speed adjustment, and multilingual caption support for Next.js applications.

## 🎯 Features

### Core Video Player Features

- **Volume Control**: Horizontal slider (0-100%) with mute/unmute toggle
- **Playback Speed Control**: 7 speed options (0.5x to 2x) with dropdown and quick buttons
- **Enhanced Controls**: Play/pause, skip forward/backward (10s), reset, fullscreen
- **Progress Bar**: Interactive seek bar with buffering indicator
- **Responsive Design**: Works on desktop and mobile devices

### Caption System Features

- **Multi-language Support**: English, Korean, and Both modes
- **Word-level Highlighting**: Real-time synchronization with video playback
- **Interactive Transcript**: Click words/segments to seek video
- **Layout Options**: Stacked or side-by-side caption display
- **Persistence**: Caption mode preferences saved to localStorage

## 📦 Components

### 1. VideoPlayer (Basic)

Standalone video player with enhanced controls.

```tsx
import { VideoPlayer } from "@/components/VideoPlayer";

<VideoPlayer
  videoUrl="https://example.com/video.mp4"
  title="My Video"
  autoPlay={false}
  showControls={true}
  onVideoReady={() => console.log("Ready!")}
  onTimeUpdate={(time) => setCurrentTime(time)}
  onPlay={() => console.log("Playing")}
  onPause={() => console.log("Paused")}
  onEnded={() => console.log("Ended")}
/>;
```

### 2. VideoPlayerWithCaptions (Advanced)

Video player with integrated caption system.

```tsx
import { VideoPlayerWithCaptions } from "@/components/VideoPlayerWithCaptions";

<VideoPlayerWithCaptions
  videoUrl="https://example.com/video.mp4"
  englishCaptions={englishCaptions}
  koreanCaptions={koreanCaptions}
  initialCaptionMode="both"
  persistKey="my-video-captions"
  showControls={true}
  autoPlay={false}
  onWordClick={(word) => handleSeek(word.start)}
  onSegmentClick={(segment) => handleSeek(segment.start)}
/>;
```

### 3. CaptionToggle

Toggle component for switching between caption languages.

```tsx
import { CaptionToggle, useCaptionMode } from "@/components/CaptionToggle";

const { mode, setMode, isEnglish, isKorean, isBoth } = useCaptionMode("en");

<CaptionToggle
  mode={mode}
  onModeChange={setMode}
  className="my-custom-class"
  disabled={false}
  showLabels={true}
/>;
```

### 4. CaptionsRenderer

Component for rendering captions with word-level highlighting.

```tsx
import { CaptionsRenderer } from "@/components/CaptionsRenderer";

<CaptionsRenderer
  mode="both"
  englishCaptions={englishCaptions}
  koreanCaptions={koreanCaptions}
  activeWordIndex={activeWordIndex}
  activeSegmentIndex={activeSegmentIndex}
  currentTime={currentTime}
  onWordClick={handleWordClick}
  onSegmentClick={handleSegmentClick}
  showTimestamps={true}
  autoScroll={true}
/>;
```

## 🎮 Controls

### Volume Control

- **Slider**: Horizontal range input (0-1, step 0.05)
- **Display**: Real-time percentage indicator
- **Mute Toggle**: Quick mute/unmute button
- **Visual Feedback**: Red progress bar with hover effects

### Speed Control

- **Dropdown**: 7 predefined speeds (0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x)
- **Quick Buttons**: Fast access to common speeds (0.5x, 1x, 1.5x, 2x)
- **Badge Indicator**: Current speed display
- **Real-time Updates**: Instant playback rate changes

### Navigation Controls

- **Play/Pause**: Main playback control
- **Skip Forward/Backward**: 10-second jumps
- **Reset**: Return to beginning
- **Fullscreen**: Toggle fullscreen mode
- **Progress Bar**: Click to seek to specific time

## 📝 Caption Data Format

Captions should follow this structure:

```typescript
interface CaptionSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Full text of the segment
  words?: Array<{
    // Optional word-level timing
    text: string; // Individual word text
    start: number; // Word start time
    end: number; // Word end time
  }>;
}

// Example
const englishCaptions: CaptionSegment[] = [
  {
    start: 0,
    end: 3,
    text: "Hello everyone, welcome to our platform.",
    words: [
      { text: "Hello", start: 0, end: 0.5 },
      { text: "everyone,", start: 0.5, end: 1.2 },
      { text: "welcome", start: 1.2, end: 1.8 },
      { text: "to", start: 1.8, end: 2.0 },
      { text: "our", start: 2.0, end: 2.3 },
      { text: "platform.", start: 2.3, end: 3.0 },
    ],
  },
];
```

## 🎨 Styling

### CSS Classes

The system includes custom CSS classes for enhanced styling:

```css
/* Volume slider */
.slider {
  /* Custom slider styling */
}

/* Video overlay */
.video-overlay {
  /* Smooth overlay transitions */
}

/* Caption highlighting */
.caption-highlight {
  /* Pulse animation for active words */
}
```

### TailwindCSS Integration

All components use TailwindCSS classes and are fully customizable:

```tsx
<VideoPlayer
  className="my-custom-video-player"
  // Custom styling through className prop
/>
```

## 🔧 Hooks

### useCaptionMode

Hook for managing caption mode state with persistence.

```tsx
import { useCaptionMode } from "@/hooks/useCaptionMode";

const {
  mode, // Current mode: "en" | "ko" | "both"
  setMode, // Function to change mode
  resetToDefault, // Reset to initial mode
  isEnglish, // Boolean: isEnglish mode
  isKorean, // Boolean: isKorean mode
  isBoth, // Boolean: isBoth mode
  isMultiLanguage, // Boolean: isMultiLanguage mode
} = useCaptionMode("en", "persist-key");
```

### useCaptionData

Hook for managing caption data.

```tsx
import { useCaptionData } from "@/hooks/useCaptionMode";

const {
  data, // Caption data: { english: [], korean: [] }
  loading, // Loading state
  error, // Error state
  setEnglishCaptions, // Set English captions
  setKoreanCaptions, // Set Korean captions
  setBothCaptions, // Set both languages
  clearCaptions, // Clear all captions
  hasEnglish, // Boolean: has English captions
  hasKorean, // Boolean: has Korean captions
  hasAny, // Boolean: has any captions
  hasBoth, // Boolean: has both languages
} = useCaptionData();
```

## 📱 Responsive Design

The video player system is fully responsive:

- **Desktop**: Full controls with labels and descriptions
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Compact controls with essential functions
- **Fullscreen**: Immersive experience with overlay controls

## 🚀 Usage Examples

### Basic Implementation

```tsx
"use client";

import React, { useState } from "react";
import { VideoPlayer } from "@/components/VideoPlayer";

export default function MyVideoPage() {
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className="container mx-auto p-4">
      <VideoPlayer
        videoUrl="https://example.com/video.mp4"
        title="My Educational Video"
        onTimeUpdate={setCurrentTime}
      />
    </div>
  );
}
```

### Advanced Implementation with Captions

```tsx
"use client";

import React, { useState } from "react";
import { VideoPlayerWithCaptions } from "@/components/VideoPlayerWithCaptions";

export default function LessonPage() {
  const [englishCaptions, setEnglishCaptions] = useState([]);
  const [koreanCaptions, setKoreanCaptions] = useState([]);

  return (
    <div className="container mx-auto p-4">
      <VideoPlayerWithCaptions
        videoUrl="https://example.com/lesson.mp4"
        englishCaptions={englishCaptions}
        koreanCaptions={koreanCaptions}
        initialCaptionMode="both"
        persistKey="lesson-captions"
        onWordClick={(word) => {
          // Handle word click - could show definition, translation, etc.
          console.log("Word clicked:", word.text);
        }}
      />
    </div>
  );
}
```

## 🧪 Testing

Test pages are available at:

- `/test-video-player` - Test basic video player functionality
- `/test-caption-toggle` - Test caption system and toggles

## 🔄 State Management

The system provides several ways to manage state:

1. **Component State**: Built-in state management for video controls
2. **Persistence**: Caption mode preferences saved to localStorage
3. **Callbacks**: Event handlers for external state management
4. **Hooks**: Custom hooks for reusable state logic

## 🎯 Best Practices

1. **Performance**: Use `useCallback` for event handlers in parent components
2. **Accessibility**: All controls are keyboard accessible
3. **Error Handling**: Implement proper error boundaries for video loading
4. **Mobile**: Test touch interactions on mobile devices
5. **Loading States**: Show loading indicators while video is loading

## 🔮 Future Enhancements

- YouTube integration for automatic caption extraction
- Audio visualization during playback
- Picture-in-picture support
- Keyboard shortcuts for all controls
- Custom playback speed presets
- Caption styling customization
- Multi-track audio support

## 📄 License

This video player system is part of the LangLab project and follows the same licensing terms.



