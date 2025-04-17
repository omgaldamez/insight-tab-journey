import React from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { chordPerformancePresets, getRecommendedPreset } from '../utils/performacePresets';
import { Zap, Sparkles, Scale, Monitor, Layers } from 'lucide-react';

interface PerformancePresetSelectorProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
  particleCount: number;
}

// Type key for presets
type PresetKey = keyof typeof chordPerformancePresets;

const PerformancePresetSelector: React.FC<PerformancePresetSelectorProps> = ({
  config,
  onConfigChange,
  particleCount
}) => {
  const handleSelectPreset = (presetKey: PresetKey) => {
    const preset = chordPerformancePresets[presetKey];
    if (preset) {
      // Apply preset configuration - ensure it's properly typed
      const typedConfig = preset.config as Partial<ChordDiagramConfig>;
      onConfigChange(typedConfig);
    }
  };

  // Get the recommended preset based on particle count and hardware capabilities
  const recommendedPreset = getRecommendedPreset(particleCount) as PresetKey;
  
  // Icons for each preset
  const presetIcons: Record<PresetKey, React.ReactNode> = {
    'highPerformance': <Zap className="w-4 h-4" />,
    'highQuality': <Sparkles className="w-4 h-4" />,
    'balanced': <Scale className="w-4 h-4" />,
    'compatibilityMode': <Monitor className="w-4 h-4" />,
    'detailedView': <Layers className="w-4 h-4" />
  };

  return (
    <div className="mt-3 p-3 bg-gray-800/80 rounded-md border border-gray-700">
      <h3 className="text-sm font-medium mb-2 text-white/90">Performance Presets</h3>
      
      <p className="text-xs mb-3 text-white/70">
        Choose a preset to automatically configure particle rendering for optimal performance or visual quality.
      </p>
      
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(chordPerformancePresets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handleSelectPreset(key as PresetKey)}
            className={`flex items-center text-left px-3 py-2 rounded-md ${
              recommendedPreset === key 
                ? 'bg-blue-600/30 border border-blue-500/50' 
                : 'bg-gray-700/70 border border-gray-600/50 hover:bg-gray-700'
            }`}
          >
            <div className={`p-1.5 rounded-md mr-2 ${
              recommendedPreset === key ? 'bg-blue-600' : 'bg-gray-600'
            }`}>
              {presetIcons[key as PresetKey] || <Zap className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-sm font-medium">{preset.name}</span>
                {recommendedPreset === key && (
                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {preset.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PerformancePresetSelector;