import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, CornerDownRight } from 'lucide-react';

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
  // New prop for jumping to a specific frame
  onJumpToFrame?: (frameIndex: number) => void;
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
  onSpeedChange,
  onJumpToFrame
}) => {
  // Calculate progress percentage for the progress bar
  const progressPercentage = totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;
  
  // State for the jump-to-frame input
  const [jumpFrameInput, setJumpFrameInput] = useState("");
  
  // Handler for jump-to-frame button
  const handleJumpToFrame = () => {
    if (!onJumpToFrame) return;
    
    const frameIndex = parseInt(jumpFrameInput);
    if (!isNaN(frameIndex) && frameIndex >= 0 && frameIndex <= totalCount) {
      onJumpToFrame(frameIndex);
      // Clear the input after jumping
      setJumpFrameInput("");
    }
  };
  
  // Handler for jump slider changes
  const handleJumpSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (onJumpToFrame) {
      onJumpToFrame(value);
    }
  };
  
  return (
    <div className="chord-animation-controls p-3 bg-black/70 text-white rounded-md shadow-lg">
      {/* Progress bar, frame counter and jump control */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1 text-xs">
          <span>Progress: {currentIndex} of {totalCount}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden cursor-pointer mb-1"
             onClick={(e) => {
               if (!onJumpToFrame) return;
               // Calculate position based on click location
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const percentage = x / rect.width;
               const frameIndex = Math.round(percentage * totalCount);
               onJumpToFrame(frameIndex);
             }}>
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Jump to frame slider */}
        {onJumpToFrame && (
          <div className="flex items-center w-full gap-2 mb-1">
            <input
              type="range"
              min="0"
              max={totalCount}
              value={currentIndex}
              onChange={handleJumpSliderChange}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer"
            />
          </div>
        )}
        
        {/* Jump to specific frame control */}
        {onJumpToFrame && (
          <div className="flex items-center mt-1 text-xs gap-1">
            <div className="flex-grow">
              <input
                type="number"
                min="0"
                max={totalCount}
                placeholder="Frame #"
                value={jumpFrameInput}
                onChange={(e) => setJumpFrameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleJumpToFrame();
                  }
                }}
                className="w-full px-2 py-1 bg-gray-700 rounded text-xs"
              />
            </div>
            <button
              onClick={handleJumpToFrame}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded flex items-center justify-center"
              title="Jump to frame"
            >
              <CornerDownRight className="w-3 h-3" />
            </button>
          </div>
        )}
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
            onClick={() => onSpeedChange(Math.min(10, speed + 2))}
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
            max="10"
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