import { useState, useRef, useCallback } from 'react';

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const stopAudio = useCallback(() => {
    if (currentUtterance.current) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentText('');
      currentUtterance.current = null;
    }
  }, []);

  const speak = useCallback((text: string, options: TTSOptions = {}) => {
    // Stop any currently playing audio
    stopAudio();

    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    utterance.lang = options.lang || 'en-US';

    // Try to find the best voice for the language
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith(options.lang?.split('-')[0] || 'en') && 
      voice.localService === false // Prefer online voices for better quality
    ) || voices.find(voice => 
      voice.lang.startsWith(options.lang?.split('-')[0] || 'en')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setCurrentText(text);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentText('');
      currentUtterance.current = null;
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setCurrentText('');
      currentUtterance.current = null;
    };

    currentUtterance.current = utterance;
    speechSynthesis.speak(utterance);
  }, [stopAudio]);

  const speakEnglish = useCallback((text: string) => {
    speak(text, { lang: 'en-US', rate: 0.8 });
  }, [speak]);

  const speakKorean = useCallback((text: string) => {
    speak(text, { lang: 'ko-KR', rate: 0.7 });
  }, [speak]);

  const playSequence = useCallback(async (items: Array<{text: string, lang: 'en' | 'ko', pauseAfter?: number}>) => {
    for (const item of items) {
      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = item.lang === 'en' ? 'en-US' : 'ko-KR';
        utterance.rate = item.lang === 'en' ? 0.8 : 0.7;

        // Find appropriate voice
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(item.lang === 'en' ? 'en' : 'ko'));
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          setIsPlaying(true);
          setCurrentText(item.text);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentText('');
          // Add pause after speaking (for shadowing)
          setTimeout(resolve, (item.pauseAfter || 0) * 1000);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          setCurrentText('');
          resolve(void 0);
        };

        currentUtterance.current = utterance;
        speechSynthesis.speak(utterance);
      });
    }
  }, []);

  return {
    isPlaying,
    currentText,
    speak,
    speakEnglish,
    speakKorean,
    stopAudio,
    playSequence
  };
};
