/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Button } from "@/components/ui/button";
import { saveAs } from 'file-saver';
import { useToast } from "@/components/ui/use-toast";
import { Download, Upload, Save, AlertCircle } from 'lucide-react';

interface ConfigPresetsProps {
  // Function to generate complete current config from parent
  getCurrentConfig: () => any;
  
  // Function to apply a loaded config
  applyConfig: (config: any) => void;
  
  // Current visualization type
  visualizationType: string;
}

const ConfigPresets: React.FC<ConfigPresetsProps> = ({
  getCurrentConfig,
  applyConfig,
  visualizationType
}) => {
  const { toast } = useToast();
  
  const handleSaveConfig = () => {
    try {
      // Get current configuration
      const config = getCurrentConfig();
      
      // Add metadata
      const configWithMeta = {
        ...config,
        meta: {
          version: "1.0",
          createdAt: new Date().toISOString(),
          visualizationType: visualizationType
        }
      };
      
      // Convert to JSON
      const configJson = JSON.stringify(configWithMeta, null, 2);
      
      // Create download
      const blob = new Blob([configJson], { type: 'application/json' });
      saveAs(blob, `${visualizationType}-config-${new Date().toISOString().slice(0, 10)}.json`);
      
      toast({
        title: "Configuration Saved",
        description: "Your visualization settings have been saved as JSON"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: `Error saving configuration: ${error}`,
        variant: "destructive"
      });
    }
  };

  const handleLoadConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        
        // Validate config has expected structure
        if (!config || typeof config !== 'object') {
          throw new Error("Invalid configuration format");
        }
        
        // Optional: Check if config matches current visualization
        if (config.meta?.visualizationType && config.meta.visualizationType !== visualizationType) {
          toast({
            title: "Warning",
            description: `This config was created for ${config.meta.visualizationType} visualization. Some settings may not apply correctly.`,
            variant: "default"
          });
        }
        
        // Apply the configuration
        applyConfig(config);
        
        toast({
          title: "Configuration Loaded",
          description: "Visualization settings have been updated"
        });
      } catch (error) {
        console.error('Error parsing configuration file:', error);
        toast({
          title: "Load Failed",
          description: "Unable to parse configuration file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/70 mb-1">
        Save or load complete visualization configurations
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-blue-600/80 text-white hover:bg-blue-700 text-xs flex items-center"
          onClick={handleSaveConfig}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save Config
        </Button>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs text-white/80 block">Load Configuration</label>
        <div className="relative">
          <input
            type="file"
            accept=".json"
            onChange={handleLoadConfig}
            className="block w-full text-xs text-gray-300 bg-gray-700 rounded-md py-1.5 px-2 border border-gray-600"
          />
          <Upload className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>
      
      <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
        <div className="flex items-start">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400 mr-1.5 mt-0.5 flex-shrink-0" />
          <p className="text-blue-300">
            Configuration includes all current settings for this visualization type.
            Load a previously saved config to restore your settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigPresets;