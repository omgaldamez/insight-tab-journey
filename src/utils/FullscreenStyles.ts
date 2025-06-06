// CSS styles for HTML5 fullscreen API
export const fullscreenStyles = `
  /* When using HTML5 fullscreen API */
  #network-visualization-container:-webkit-full-screen,
  #network-visualization-container:-moz-full-screen,
  #network-visualization-container:-ms-fullscreen,
  #network-visualization-container:fullscreen {
    position: fixed;
    width: 100vw !important;
    height: 100vh !important;
    top: 0;
    left: 0;
    background-color: white;
    z-index: 9999;
    padding: 1rem;
    margin: 0;
    display: flex !important;
    flex-direction: column;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
  }

  /* Control positioning when in fullscreen */
  #network-visualization-container:fullscreen .absolute.top-4.right-4,
  #network-visualization-container:-webkit-full-screen .absolute.top-4.right-4,
  #network-visualization-container:-moz-full-screen .absolute.top-4.right-4,
  #network-visualization-container:-ms-fullscreen .absolute.top-4.right-4 {
    top: 1rem !important;
    right: 1rem !important;
    z-index: 10000;
  }

  /* Make sure SVG fills the fullscreen container properly */
  #network-visualization-container:fullscreen svg,
  #network-visualization-container:-webkit-full-screen svg,
  #network-visualization-container:-moz-full-screen svg,
  #network-visualization-container:-ms-fullscreen svg {
    width: calc(100vw - 2rem) !important;
    height: calc(100vh - 2rem) !important;
    display: block;
    margin: 0 auto;
    transform-origin: center center !important;
  }

  /* Ensure the tooltip shows up in fullscreen mode */
  #network-visualization-container:fullscreen .tooltip,
  #network-visualization-container:-webkit-full-screen .tooltip,
  #network-visualization-container:-moz-full-screen .tooltip,
  #network-visualization-container:-ms-fullscreen .tooltip {
    z-index: 10001;
  }

  /* Ensure zoom controls are visible in fullscreen */
  #network-visualization-container:fullscreen .absolute.bottom-4.left-1\\/2,
  #network-visualization-container:-webkit-full-screen .absolute.bottom-4.left-1\\/2,
  #network-visualization-container:-moz-full-screen .absolute.bottom-4.left-1\\/2,
  #network-visualization-container:-ms-fullscreen .absolute.bottom-4.left-1\\/2 {
    bottom: 1rem !important;
    left: 50% !important;
    z-index: 10000;
  }

  /* Improved centering for SVG content */
  #network-visualization-container:fullscreen svg g,
  #network-visualization-container:-webkit-full-screen svg g,
  #network-visualization-container:-moz-full-screen svg g,
  #network-visualization-container:-ms-fullscreen svg g {
    transform-origin: center center !important;
  }
  
  /* Force the transform to be re-evaluated on fullscreen */
  #network-visualization-container:fullscreen svg g[transform],
  #network-visualization-container:-webkit-full-screen svg g[transform],
  #network-visualization-container:-moz-full-screen svg g[transform],
  #network-visualization-container:-ms-fullscreen svg g[transform] {
    transition: transform 0.15s ease-out;
  }
  
  /* Make sure animations and effects still work in fullscreen */
  #network-visualization-container:fullscreen .combined-effects,
  #network-visualization-container:-webkit-full-screen .combined-effects,
  #network-visualization-container:-moz-full-screen .combined-effects,
  #network-visualization-container:-ms-fullscreen .combined-effects,
  #network-visualization-container:fullscreen .blur-effect,
  #network-visualization-container:-webkit-full-screen .blur-effect,
  #network-visualization-container:-moz-full-screen .blur-effect,
  #network-visualization-container:-ms-fullscreen .blur-effect,
  #network-visualization-container:fullscreen .glow-effect,
  #network-visualization-container:-webkit-full-screen .glow-effect,
  #network-visualization-container:-moz-full-screen .glow-effect,
  #network-visualization-container:-ms-fullscreen .glow-effect {
    filter: var(--combined-filter, none) !important;
  }
`;