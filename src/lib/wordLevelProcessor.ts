// import { YouTubeTranscript } from "./youtube";

export interface WordLevelTranscript {
  text: string;
  start: number;
  end: number;
  words: { text: string; start: number; end: number }[];
}

export interface YouTubeTranscript {
  text: string;
  start: number;
  end: number;
}

/**
 * YouTube 자막을 단어 레벨로 분할합니다
 */
export function convertChunksToWordLevel(
  transcriptChunks: Array<{ start: number; end: number; text: string }>
): WordLevelTranscript[] {
  const wordLevelTranscript: WordLevelTranscript[] = [];

  transcriptChunks.forEach((chunk) => {
    // 문장을 단어로 분할
    const words = chunk.text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (words.length === 0) return;

    // 각 단어에 시간 할당
    const chunkDuration = chunk.end - chunk.start;
    const wordDuration = chunkDuration / words.length;

    words.forEach((word, index) => {
      const wordStart = chunk.start + index * wordDuration;
      const wordEnd = chunk.start + (index + 1) * wordDuration;

      const wordObj = {
        text: word.replace(/[^\w\s]/g, ""), // 특수문자 제거
        start: Math.round(wordStart * 100) / 100, // 소수점 2자리로 반올림
        end: Math.round(wordEnd * 100) / 100,
      };

      wordLevelTranscript.push({
        text: wordObj.text,
        start: wordObj.start,
        end: wordObj.end,
        words: [wordObj],
      });
    });
  });

  return wordLevelTranscript;
}

/**
 * 기존 YouTube 자막을 단어 레벨로 변환합니다
 */
export function convertYouTubeTranscriptToWordLevel(
  transcript: YouTubeTranscript[]
): WordLevelTranscript[] {
  return convertChunksToWordLevel(
    transcript.map((item) => ({
      start: item.start,
      end: item.end,
      text: item.text,
    }))
  );
}

/**
 * 단어 레벨 자막을 구문 단위로 그룹화합니다
 */
export function groupWordsIntoPhrases(
  words: WordLevelTranscript[],
  phraseLength: number = 3
): Array<{
  words: WordLevelTranscript[];
  start: number;
  end: number;
  text: string;
}> {
  const phrases: Array<{
    words: WordLevelTranscript[];
    start: number;
    end: number;
    text: string;
  }> = [];

  for (let i = 0; i < words.length; i += phraseLength) {
    const phraseWords = words.slice(i, i + phraseLength);

    if (phraseWords.length === 0) continue;

    const start = phraseWords[0].start;
    const end = phraseWords[phraseWords.length - 1].end;
    const text = phraseWords.map((w) => w.text).join(" ");

    phrases.push({
      words: phraseWords,
      start,
      end,
      text,
    });
  }

  return phrases;
}

/**
 * 자막 데이터를 정리하고 중복을 제거합니다
 */
export function cleanTranscriptData(
  transcript: WordLevelTranscript[]
): WordLevelTranscript[] {
  // 1. 빈 텍스트 제거
  let cleaned = transcript.filter((item) => item.text.trim().length > 0);

  // 2. 연속된 중복 단어 제거
  const unique: WordLevelTranscript[] = [];

  cleaned.forEach((word, index) => {
    const prevWord = index > 0 ? cleaned[index - 1] : null;

    // 이전 단어와 동일한 텍스트가 아니거나, 시간 간격이 충분한 경우만 포함
    if (
      !prevWord ||
      prevWord.text !== word.text ||
      word.start - prevWord.end > 0.5
    ) {
      unique.push(word);
    }
  });

  // 3. 시간순 정렬
  return unique.sort((a, b) => a.start - b.start);
}

/**
 * 자막의 통계 정보를 계산합니다
 */
export function calculateTranscriptStats(transcript: WordLevelTranscript[]): {
  totalWords: number;
  totalDuration: number;
  averageWordDuration: number;
  wordsPerMinute: number;
} {
  if (transcript.length === 0) {
    return {
      totalWords: 0,
      totalDuration: 0,
      averageWordDuration: 0,
      wordsPerMinute: 0,
    };
  }

  const totalDuration =
    transcript[transcript.length - 1].end - transcript[0].start;
  const averageWordDuration = totalDuration / transcript.length;
  const wordsPerMinute = (transcript.length / totalDuration) * 60;

  return {
    totalWords: transcript.length,
    totalDuration,
    averageWordDuration,
    wordsPerMinute,
  };
}
