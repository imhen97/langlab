import {
  getVideoId,
  parseVttToCues,
  dedupeCues,
  decodeHtmlEntities,
  parseTimeToSeconds,
} from "../youtube";

describe("YouTube utility functions", () => {
  describe("getVideoId", () => {
    it("should extract video ID from youtube.com/watch URL", () => {
      const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      expect(getVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from youtu.be URL", () => {
      const url = "https://youtu.be/dQw4w9WgXcQ";
      expect(getVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from embed URL", () => {
      const url = "https://www.youtube.com/embed/dQw4w9WgXcQ";
      expect(getVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from YouTube Shorts URL", () => {
      const url = "https://www.youtube.com/shorts/XXtm29NLYuU";
      expect(getVideoId(url)).toBe("XXtm29NLYuU");
    });

    it("should extract video ID from YouTube Shorts URL with additional parameters", () => {
      const url = "https://www.youtube.com/shorts/XXtm29NLYuU?si=abc123";
      expect(getVideoId(url)).toBe("XXtm29NLYuU");
    });

    it("should extract video ID from URL with additional parameters", () => {
      const url =
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PLrAXtmRdnEQy6nuLMOVlR7jQ";
      expect(getVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should handle URL without protocol", () => {
      const url = "youtube.com/watch?v=dQw4w9WgXcQ";
      expect(getVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should throw error for invalid YouTube URL", () => {
      const url = "https://www.google.com";
      expect(() => getVideoId(url)).toThrow("Must be a valid YouTube URL");
    });

    it("should throw error for URL without video ID", () => {
      const url = "https://www.youtube.com/watch";
      expect(() => getVideoId(url)).toThrow(
        "Could not extract video ID from YouTube URL"
      );
    });
  });

  describe("parseTimeToSeconds", () => {
    it("should parse HH:MM:SS.mmm format", () => {
      expect(parseTimeToSeconds("1:23:45.678")).toBe(5025.678);
    });

    it("should parse MM:SS.mmm format", () => {
      expect(parseTimeToSeconds("23:45.678")).toBe(1425.678);
    });

    it("should parse SS.mmm format", () => {
      expect(parseTimeToSeconds("45.678")).toBe(45.678);
    });

    it("should parse integer seconds", () => {
      expect(parseTimeToSeconds("45")).toBe(45);
    });

    it("should round to 3 decimal places", () => {
      expect(parseTimeToSeconds("45.123456789")).toBe(45.123);
    });
  });

  describe("parseVttToCues", () => {
    it("should parse basic VTT content", () => {
      const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:02.000
Hello world

2
00:00:02.000 --> 00:00:04.000
This is a test`;

      const cues = parseVttToCues(vttContent);

      expect(cues).toHaveLength(2);
      expect(cues[0]).toEqual({
        start: 0,
        end: 2,
        text: "Hello world",
      });
      expect(cues[1]).toEqual({
        start: 2,
        end: 4,
        text: "This is a test",
      });
    });

    it("should handle multi-line cue text", () => {
      const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:03.000
Hello world
This is line two`;

      const cues = parseVttToCues(vttContent);

      expect(cues).toHaveLength(1);
      expect(cues[0].text).toBe("Hello world This is line two");
    });

    it("should remove HTML tags from cue text", () => {
      const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:02.000
<b>Bold text</b> and <i>italic text</i>`;

      const cues = parseVttToCues(vttContent);

      expect(cues[0].text).toBe("Bold text and italic text");
    });

    it("should normalize whitespace in cue text", () => {
      const vttContent = `WEBVTT

1
00:00:00.000 --> 00:00:02.000
Hello    world    with   spaces`;

      const cues = parseVttToCues(vttContent);

      expect(cues[0].text).toBe("Hello world with spaces");
    });

    it("should handle empty VTT content", () => {
      const cues = parseVttToCues("");
      expect(cues).toHaveLength(0);
    });

    it("should handle VTT with only header", () => {
      const vttContent = "WEBVTT\n\nNOTE Some note\n";
      const cues = parseVttToCues(vttContent);
      expect(cues).toHaveLength(0);
    });
  });

  describe("dedupeCues", () => {
    it("should remove duplicate adjacent cues", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2, end: 4, text: "Hello world" }, // Duplicate
        { start: 4, end: 6, text: "Different text" },
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(2);
      expect(deduped[0]).toEqual({ start: 0, end: 4, text: "Hello world" });
      expect(deduped[1]).toEqual({ start: 4, end: 6, text: "Different text" });
    });

    it("should merge overlapping cues with same text", () => {
      const cues = [
        { start: 0, end: 3, text: "Hello world" },
        { start: 2.5, end: 5, text: "Hello world" }, // Overlapping
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(1);
      expect(deduped[0]).toEqual({ start: 0, end: 5, text: "Hello world" });
    });

    it("should merge cues with small gaps", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2.1, end: 4, text: "Hello world" }, // Small gap
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(1);
      expect(deduped[0]).toEqual({ start: 0, end: 4, text: "Hello world" });
    });

    it("should remove zero-length cues", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2, end: 2, text: "Zero length" }, // Zero length
        { start: 2, end: 4, text: "Valid cue" },
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(2);
      expect(deduped[0].text).toBe("Hello world");
      expect(deduped[1].text).toBe("Valid cue");
    });

    it("should preserve different text cues", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2, end: 4, text: "Different text" },
        { start: 4, end: 6, text: "Another different text" },
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(3);
      expect(deduped).toEqual(cues);
    });

    it("should handle case-insensitive text comparison", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2, end: 4, text: "HELLO WORLD" }, // Different case
      ];

      const deduped = dedupeCues(cues);

      expect(deduped).toHaveLength(1);
      expect(deduped[0]).toEqual({ start: 0, end: 4, text: "Hello world" }); // Keeps original text
    });

    it("should handle empty cues array", () => {
      const deduped = dedupeCues([]);
      expect(deduped).toHaveLength(0);
    });

    it("should handle partial text overlaps", () => {
      const cues = [
        { start: 0, end: 3, text: "Hello" },
        { start: 2, end: 5, text: "Hello world" },
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello world"); // Should use longer text
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(5);
    });

    it("should handle subset overlaps intelligently", () => {
      const cues = [
        { start: 0, end: 4, text: "Hello world" },
        { start: 2, end: 5, text: "Hello" },
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Hello world"); // Should keep original longer text
      expect(result[0].end).toBe(5); // Should extend end time
    });

    it("should adjust timing to remove minor overlaps", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello" },
        { start: 1.9, end: 4, text: "World" },
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(2);
      expect(result[1].start).toBe(2); // Should be adjusted to remove overlap
      expect(result[1].end).toBe(4);
    });

    it("should merge significant overlaps", () => {
      const cues = [
        { start: 0, end: 2, text: "Short" },
        { start: 0.5, end: 5, text: "Much longer text here" }, // 75% overlap
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe("Much longer text here"); // Should use longer text
      expect(result[0].start).toBe(0);
      expect(result[0].end).toBe(5);
    });

    it("should sort cues by start time", () => {
      const cues = [
        { start: 4, end: 6, text: "Last" },
        { start: 0, end: 2, text: "First" },
        { start: 2, end: 4, text: "Middle" },
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe("First");
      expect(result[1].text).toBe("Middle");
      expect(result[2].text).toBe("Last");
    });

    it("should remove empty text cues", () => {
      const cues = [
        { start: 0, end: 2, text: "Hello world" },
        { start: 2, end: 4, text: "" },
        { start: 4, end: 6, text: "   " },
        { start: 6, end: 8, text: "Goodbye world" },
      ];
      const result = dedupeCues(cues);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("Hello world");
      expect(result[1].text).toBe("Goodbye world");
    });
  });

  describe("decodeHtmlEntities", () => {
    it("should decode common HTML entities", () => {
      expect(decodeHtmlEntities("Hello &amp; world")).toBe("Hello & world");
      expect(decodeHtmlEntities("&lt;tag&gt;")).toBe("<tag>");
      expect(decodeHtmlEntities("&quot;quoted&quot;")).toBe('"quoted"');
      expect(decodeHtmlEntities("Don&apos;t")).toBe("Don't");
      expect(decodeHtmlEntities("Non&nbsp;breaking")).toBe("Non breaking");
    });

    it("should handle multiple entities in one string", () => {
      expect(decodeHtmlEntities("&lt;b&gt;bold&amp;italic&lt;/b&gt;")).toBe(
        "<b>bold&italic</b>"
      );
    });

    it("should leave unknown entities unchanged", () => {
      expect(decodeHtmlEntities("&unknown;")).toBe("&unknown;");
    });

    it("should handle empty string", () => {
      expect(decodeHtmlEntities("")).toBe("");
    });

    it("should handle string without entities", () => {
      expect(decodeHtmlEntities("Hello world")).toBe("Hello world");
    });
  });
});
