import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';

interface ChordAnimationControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalCount: number;
  speed: number;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReset: () => void; 
  onSpeedChange: (speed: number) => void;
}

const ChordAnimationControls: React.FC<ChordAnimationControlsProps> = ({
  isPlaying,
  currentIndex,
  totalCount,
  speed,
  onTogglePlay,
  onPrevious,
  onNext,
  onReset,
  onSpeedChange
}) => {
  // Calculate progress percentage for the progress bar
  const progressPercentage = totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;
  
  return (
    <div className="chord-animation-controls p-3 bg-black/70 text-white rounded-md shadow-lg">
      {/* Progress bar and indicator */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1 text-xs">
          <span>Progress: {currentIndex} of {totalCount}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {/* Transport controls */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          {/* Reset button */}
          <button 
            onClick={onReset}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            title="Reset animation"
          >
            <Rewind className="w-4 h-4" />
          </button>
          
          {/* Previous button */}
          <button 
            onClick={onPrevious}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            disabled={currentIndex <= 0}
            title="Previous connection"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          {/* Play/Pause button */}
          <button 
            onClick={onTogglePlay}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? 
              <Pause className="w-4 h-4" /> : 
              <Play className="w-4 h-4" />
            }
          </button>
          
          {/* Next button */}
          <button 
            onClick={onNext}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            disabled={currentIndex >= totalCount}
            title="Next connection"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          {/* Speed up button */}
          <button 
            onClick={() => onSpeedChange(Math.min(5, speed + 0.5))}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            title="Increase speed"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>
        
        {/* Speed indicator and control */}
        <div className="flex items-center space-x-2">
          <span className="text-xs whitespace-nowrap">Speed: {speed.toFixed(1)}x</span>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default ChordAnimationControls;