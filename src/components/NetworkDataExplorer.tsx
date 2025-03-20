// NetworkDataExplorer.tsx - Main component combining all the enhanced parts
import React, { useState } from "react";
import NetworkExplorer from "./NetworkExplorer";
import DiagnosticButton from "./DiagnosticButton";
import { useToast } from "@/components/ui/use-toast";

interface NetworkDataExplorerProps {
  onCreditsClick: () => void;
}

const NetworkDataExplorer: React.FC<NetworkDataExplorerProps> = ({ onCreditsClick }) => {
  const { toast } = useToast();
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Toggle debug information
  const toggleDebugInfo = () => {
    setShowDebugInfo(prev => !prev);
    
    toast({
      title: showDebugInfo ? "Debug mode disabled" : "Debug mode enabled",
      description: showDebugInfo 
        ? "Debug information has been hidden" 
        : "Additional debug information will be shown in the console",
    });
    
    // Set console verbosity based on debug mode
    if (!showDebugInfo) {
      console.info("Debug mode enabled - detailed logs will be shown");
      // Store original console methods
      window._originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
      };
      
      // Enhance console methods with timestamps and better formatting
      console.log = function(...args) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        window._originalConsole.log(`[${time}] 📘 LOG:`, ...args);
      };
      
      console.warn = function(...args) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        window._originalConsole.warn(`[${time}] 📙 WARNING:`, ...args);
      };
      
      console.error = function(...args) {
        const time = new Date().toISOString().split('T')[1].split('.')[0];
        window._originalConsole.error(`[${time}] 📕 ERROR:`, ...args);
      };
    } else if (window._originalConsole) {
      // Restore original console methods
      console.log = window._originalConsole.log;
      console.warn = window._originalConsole.warn;
      console.error = window._originalConsole.error;
      console.info("Debug mode disabled");
    }
  };

  return (
    <div className="relative">
      {/* Main explorer component */}
      <NetworkExplorer onCreditsClick={onCreditsClick} />
      
      {/* Diagnostic tools */}
      <div className="absolute top-0 right-0 flex gap-2 z-10">
        <DiagnosticButton />
        
        <button
          onClick={toggleDebugInfo}
          className={`px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 ${
            showDebugInfo 
              ? 'bg-amber-100 text-amber-700 border border-amber-300' 
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
          </svg>
          <span>{showDebugInfo ? 'Debug: ON' : 'Debug'}</span>
        </button>
      </div>
      
      {/* Extra debug information panel that appears when debug mode is on */}
      {showDebugInfo && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 z-50 text-xs font-mono overflow-x-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Network Data Explorer - Debug Mode</span>
            <button 
              onClick={toggleDebugInfo}
              className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              Close
            </button>
          </div>
          <p>Check the browser console (F12) for detailed logs</p>
          <p className="text-gray-400 mt-1">
            App Base URL: {window.location.origin} - Server Env: {process.env.NODE_ENV || 'unknown'}
          </p>
        </div>
      )}
    </div>
  );
};

// Add the needed TypeScript declaration for our custom console storage
declare global {
  interface Window {
    _originalConsole?: {
      log: typeof console.log;
      warn: typeof console.warn;
      error: typeof console.error;
    };
  }
}

export default NetworkDataExplorer;