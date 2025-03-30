import React from 'react';
import { 
  MousePointer,
  Eye,
  Download
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Keep 'click' in the type definition to maintain compatibility with existing code
export type TooltipDetail = 'simple' | 'detailed';
export type TooltipTrigger = 'hover' | 'click' | 'persistent';

interface TooltipSettingsProps {
  tooltipDetail: TooltipDetail;
  tooltipTrigger: TooltipTrigger;
  onTooltipDetailChange: (value: TooltipDetail) => void;
  onTooltipTriggerChange: (value: TooltipTrigger) => void;
  onExportNodeData?: (format: 'text' | 'json') => void;
}

const TooltipSettings: React.FC<TooltipSettingsProps> = ({
  tooltipDetail,
  tooltipTrigger,
  onTooltipDetailChange,
  onTooltipTriggerChange,
  onExportNodeData
}) => {
  return (
    <div className="space-y-4">
      {/* Tooltip Detail Section */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 text-blue-300">Information Detail</h3>
        <RadioGroup
          value={tooltipDetail}
          onValueChange={(value) => {
            console.log("Tooltip detail changed to:", value);
            onTooltipDetailChange(value as TooltipDetail);
          }}
          className="grid grid-cols-2 gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="simple" id="simple-tooltip" />
            <Label htmlFor="simple-tooltip" className="text-sm cursor-pointer">Simple</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="detailed" id="detailed-tooltip" />
            <Label htmlFor="detailed-tooltip" className="text-sm cursor-pointer">Detailed</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-gray-400 mt-1">
          Choose between basic node info or comprehensive details including all connections.
        </p>
      </div>

      {/* Tooltip Behavior Section - Only showing hover and persistent */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 text-blue-300">Display Behavior</h3>
        <RadioGroup
          value={tooltipTrigger}
          onValueChange={(value) => {
            console.log("Tooltip trigger changed to:", value);
            onTooltipTriggerChange(value as TooltipTrigger);
          }}
          className="grid grid-cols-1 gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hover" id="tooltip-hover" />
            <Label htmlFor="tooltip-hover" className="text-sm cursor-pointer flex items-center">
              <MousePointer className="w-3 h-3 mr-1.5" />
              Show on hover (click for details)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="persistent" id="tooltip-persistent" />
            <Label htmlFor="tooltip-persistent" className="text-sm cursor-pointer flex items-center">
              <Eye className="w-3 h-3 mr-1.5" />
              Persistent (stays visible until clicking outside)
            </Label>
          </div>
          {/* The 'click' option is removed from UI but still in the type */}
        </RadioGroup>
        <p className="text-xs text-gray-400 mt-1">
          In both modes, clicking a node will show detailed information in a tooltip that stays visible until you click outside it.
        </p>
      </div>

      {/* Export Node Data Section */}
      {onExportNodeData && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2 text-blue-300">Export Selected Node Data</h3>
          <div className="flex space-x-2">
            <button
              className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500 px-3 py-1.5 rounded flex items-center justify-center gap-1.5"
              onClick={() => onExportNodeData('text')}
            >
              <Download className="w-3 h-3" />
              Text
            </button>
            <button
              className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500 px-3 py-1.5 rounded flex items-center justify-center gap-1.5"
              onClick={() => onExportNodeData('json')}
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Export current node connections and details for further analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default TooltipSettings;