# Enhanced YouTube Caption Extraction System

This system provides comprehensive YouTube caption extraction with advanced cleaning, deduplication, and LLM post-processing capabilities.

## Features

### 🎬 Multiple Extraction Methods

- **yt-dlp**: Extracts auto-generated captions (most reliable)
- **YouTube Data API v3**: Uses official YouTube API for manual captions
- **YouTube timedtext**: Fallback method for public captions
- **Automatic fallback**: Tries multiple methods automatically

### 🧹 Advanced Cleaning

- **Remove timestamps**: Strips VTT/SRT timestamp formatting
- **Remove HTML tags**: Cleans `<c>`, `<c.colorXXXXXX>`, `</c>` tags
- **Deduplicate overlapping segments**: Merges identical or overlapping text
- **Merge adjacent segments**: Combines segments with small time gaps
- **Normalize whitespace**: Fixes spacing and formatting issues
- **Split long segments**: Breaks up segments longer than 5 minutes

### 🤖 LLM Post-Processing

- **Natural sentence formatting**: Improves punctuation and grammar
- **Remove broken segments**: Fixes word-by-word caption artifacts
- **Improve readability**: Makes transcripts flow naturally
- **Preserve timing**: Maintains accurate timestamps

## API Endpoints

### POST `/api/captions/extract`

Extract and clean YouTube captions.

**Request Body:**

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "language": "en",
  "cleanOptions": {
    "removeTimestamps": true,
    "removeTags": true,
    "mergeSegments": true,
    "deduplicate": true,
    "maxSegmentLength": 300
  },
  "useLLM": false,
  "outputFormat": "segments"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "segments": [
      {
        "start": 0.0,
        "end": 4.5,
        "text": "Hello everyone, welcome to today's lesson."
      }
    ],
    "plainText": "Hello everyone, welcome to today's lesson...",
    "statistics": {
      "originalCount": 150,
      "cleanedCount": 45,
      "totalDuration": 1800,
      "extractionMethod": "yt-dlp"
    }
  }
}
```

### GET `/api/captions/extract?url=VIDEO_URL`

Simple GET endpoint for testing caption extraction.

## Usage Examples

### Basic Usage

```typescript
import { fetchCaptions, cleanTranscript } from "@/lib/captions";

// Fetch raw captions
const rawCaptions = await fetchCaptions(
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
);

// Clean the captions
const cleanCaptions = cleanTranscript(rawCaptions, {
  removeTimestamps: true,
  removeTags: true,
  mergeSegments: true,
  deduplicate: true,
});
```

### With LLM Post-Processing

```typescript
import { postProcessTranscriptWithLLM } from "@/lib/captions";

const processedCaptions = await postProcessTranscriptWithLLM(cleanCaptions, {
  preserveTiming: true,
  temperature: 0.2,
});
```

### Convert to Plain Text

```typescript
import { segmentsToPlainText } from "@/lib/captions";

const plainText = segmentsToPlainText(processedCaptions, {
  includeTimestamps: false,
  separator: " ",
  maxLength: 10000,
});
```

## Integration with Lesson Generation

The enhanced caption system is automatically integrated into the lesson generation API (`/api/lesson/generate`). It will:

1. Extract captions using multiple methods
2. Clean and deduplicate the transcript
3. Optionally apply LLM post-processing
4. Generate Korean translations
5. Create structured lesson content

## Testing

Visit `/test-captions` to test the caption extraction system with a user-friendly interface.

## Requirements

### Environment Variables

- `YOUTUBE_API_KEY`: YouTube Data API v3 key (optional)
- `OPENAI_API_KEY`: OpenAI API key for LLM post-processing (optional)

### System Dependencies

- `yt-dlp`: For auto-generated caption extraction
  ```bash
  pip install yt-dlp
  ```

## Error Handling

The system includes comprehensive error handling:

- **Graceful fallbacks**: Tries multiple extraction methods
- **Detailed logging**: Console logs for debugging
- **User-friendly errors**: Clear error messages in API responses
- **Timeout protection**: Prevents hanging requests

## Performance Optimizations

- **Parallel processing**: Multiple extraction methods run independently
- **Caching**: VTT files are cached during processing
- **Memory management**: Temporary files are cleaned up automatically
- **Rate limiting**: Respects YouTube API limits
- **Batch processing**: Efficient handling of large transcripts

## Common Issues and Solutions

### "yt-dlp not found"

- Install yt-dlp: `pip install yt-dlp`
- Ensure it's in your system PATH
- Check the yt-dlp paths in the code

### "No captions found"

- Video may not have captions
- Try different languages (en, ko, ja, etc.)
- Check if video is age-restricted or region-blocked

### "LLM processing failed"

- Check OpenAI API key configuration
- Ensure sufficient API credits
- Try without LLM processing first

### "HTTP 429: Too Many Requests"

- YouTube API rate limit exceeded
- Wait and retry
- Use yt-dlp method instead

## Sample YouTube URLs for Testing

- English: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Korean: `https://www.youtube.com/watch?v=9bZkp7q19f0`
- Educational: `https://www.youtube.com/watch?v=kBdfcR-8hEY`
- Shorts: `https://www.youtube.com/shorts/VIDEO_ID`

## Contributing

When adding new features:

1. Add comprehensive error handling
2. Include detailed logging
3. Write unit tests for new functions
4. Update this documentation
5. Test with various YouTube URLs



