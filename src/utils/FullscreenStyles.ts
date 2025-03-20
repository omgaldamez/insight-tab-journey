// FullscreenStyles.ts - Create this file in your utils directory
export const fullscreenStyles = `
  #network-visualization-container:fullscreen {
    background-color: white;
    overflow: hidden;
    padding: 20px;
    display: flex;
    flex-direction: column;
  }
  
  #network-visualization-container:fullscreen .absolute.top-4.right-4 {
    top: 20px;
    right: 20px;
  }

  #network-visualization-container:fullscreen svg {
    height: 95vh !important;
    width: 100% !important;
  }
  
  #network-visualization-container:-webkit-full-screen {
    background-color: white;
    overflow: hidden;
    padding: 20px;
  }
  
  #network-visualization-container:-moz-full-screen {
    background-color: white;
    overflow: hidden;
    padding: 20px;
  }
  
  #network-visualization-container:-ms-fullscreen {
    background-color: white;
    overflow: hidden;
    padding: 20px;
  }

  #network-visualization-container:fullscreen .absolute.bottom-4.left-4 {
    bottom: 20px;
    left: 20px;
  }

  #network-visualization-container:fullscreen .absolute.bottom-5.right-5 {
    bottom: 20px;
    right: 20px;
  }
`;