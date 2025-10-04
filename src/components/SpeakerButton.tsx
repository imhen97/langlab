import React from 'react';
import { Volume2 } from 'lucide-react';

interface SpeakerButtonProps {
  text: string;
  language: 'en' | 'ko';
  isPlaying?: boolean;
  onPlay: (text: string, language: 'en' | 'ko') => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SpeakerButton: React.FC<SpeakerButtonProps> = ({
  text,
  language,
  isPlaying = false,
  onPlay,
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  return (
    <button
      onClick={() => onPlay(text, language)}
      className={`
        inline-flex items-center justify-center rounded-full 
        transition-all duration-200 hover:scale-110
        ${isPlaying 
          ? 'bg-blue-100 text-blue-600 animate-pulse' 
          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
        }
        ${buttonSizeClasses[size]}
        ${className}
      `}
      title={`Play ${language === 'en' ? 'English' : 'Korean'} audio`}
    >
      <Volume2 className={`${sizeClasses[size]} ${isPlaying ? 'animate-pulse' : ''}`} />
    </button>
  );
};

interface PlayAllButtonProps {
  onPlayAll: () => void;
  isPlaying?: boolean;
  className?: string;
}

export const PlayAllButton: React.FC<PlayAllButtonProps> = ({
  onPlayAll,
  isPlaying = false,
  className = ''
}) => {
  return (
    <button
      onClick={onPlayAll}
      className={`
        inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isPlaying 
          ? 'bg-blue-600 text-white animate-pulse' 
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }
        ${className}
      `}
      disabled={isPlaying}
    >
      <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
      <span>{isPlaying ? 'Playing...' : 'Play All'}</span>
    </button>
  );
};
