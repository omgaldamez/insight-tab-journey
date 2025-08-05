# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Insight Tab Journey** is a comprehensive network data visualization platform built with React, TypeScript, D3.js, and Three.js. The application transforms CSV data into interactive, explorable graph networks with 9 different visualization modes, advanced theming systems, and WebGL-accelerated particle effects.

## Development Commands

```bash
# Development
npm run dev          # Start development server (localhost:8080)
bun dev             # Alternative with Bun (faster)

# Building
npm run build       # Production build
npm run build:dev   # Development build with debugging
npm run preview     # Preview production build

# Code Quality
npm run lint        # Run ESLint
```

## Architecture Overview

### Core Application Flow

The application follows a hierarchical component structure:

1. **Index.tsx** → Main page with tabbed interface (Intro/Visualization/About)
2. **NetworkExplorer** → Central coordinator managing data sources and views
3. **WelcomeSelector** → Entry point offering three data source options:
   - Pre-loaded datasets from `/public/src-data/`
   - Demo datasets (programmatically generated)
   - File upload (CSV/XLSX processing)
4. **VisualizationCoordinator** → Routes to appropriate visualization component
5. **Individual Visualization Components** → Render specific visualization types

### Visualization System Architecture

The visualization system is built around a coordinator pattern:

- **VisualizationCoordinator**: Central router that manages state and routes to specific visualization components based on `VisualizationType`
- **BaseVisualization**: Shared foundation providing sidebar, controls, and common functionality
- **NetworkSidebar**: Comprehensive control panel with 50+ settings for customization
- **Individual Visualizations**: 9 specialized components (NetworkVisualization, ChordVisualization, ThreeDVisualization, etc.)

### Data Flow Architecture

```
Data Sources → NetworkExplorer → VisualizationCoordinator → Specific Visualization
     ↓              ↓                    ↓                        ↓
1. Folder CSVs → loadNodeData/   → standardized     → D3/Three.js
2. Demo Data   → loadLinkData    → NodeData/        → rendering
3. File Upload → processFile     → LinkData         → with controls
```

### Key Data Structures

- **NodeData**: `{ id: string, category: string, ...additionalProps }`
- **LinkData**: `{ source: string, target: string, ...additionalProps }`
- **VisualizationType**: `'network' | 'chord' | '3d' | 'rad360' | 'arcLineal' | 'nodeNav' | 'routeFinder' | 'groupable' | 'arc'`

### File Processing System

The application handles three data input methods:

1. **Preset Data**: CSV files in `/public/src-data/{folder}/` with `nodes.csv` and `links.csv`
2. **Demo Data**: Programmatically generated in `fileReader.ts` fallback functions
3. **File Upload**: Real-time CSV/XLSX processing using `fileUtils.js` and `xlsx` library

### Theming and Color System

- **20+ Built-in Themes**: From basic palettes to specialized themes ("Exotic Plumage", "Cosmic Drift")
- **Dynamic Color Generation**: Automatic category-based color assignment in `VisualizationCoordinator`
- **Custom Color Override**: Individual node color customization with real-time preview
- **Theme Categories**: Basic, Monochromatic, Categorical, and Divergent themes

### Advanced Features

- **WebGL Particle Systems**: Hardware-accelerated effects in Chord visualization
- **3D Rendering**: Three.js integration with spherical and network layouts
- **Progressive Animation**: Frame-by-frame chord ribbon animation with metrics
- **Multi-format Export**: SVG, PNG, JPG, PDF, TIFF with CSS effect toggles
- **Fullscreen Mode**: Immersive exploration with draggable control panels

## File Organization Patterns

### Component Naming Convention
- **{Type}Visualization.tsx**: Main visualization components
- **{Feature}Controls.tsx**: Control panels for specific features
- **{Feature}Modal.tsx**: Dialog components
- **use{Feature}.ts**: Custom hooks for complex logic

### Import Path Aliases
- `@/components/*` → `src/components/*`
- `@/hooks/*` → `src/hooks/*`
- `@/utils/*` → `src/utils/*`
- `@/types/*` → `src/types/*`

## Critical Integration Points

### Adding New Visualizations
1. Create visualization component implementing `NetworkVisualizationProps`
2. Add new type to `VisualizationType` in `networkTypes.ts`
3. Add routing logic in `VisualizationCoordinator.tsx`
4. Integrate with `NetworkSidebar` controls if needed

### Data Source Integration
- **Folder Data**: Add to `folderConfig.ts` and place CSV files in `/public/src-data/`
- **File Upload**: Handled automatically through `FileUploader` → `processFile` → visualization
- **API Data**: Modify `fileReader.ts` functions to fetch from endpoints

### Theme System Extension
- **New Themes**: Add to `dynamicColorThemes` initialization in `VisualizationCoordinator`
- **Color Logic**: Modify `hexToHSL`/`hslToHex` functions for color generation
- **Theme Categories**: Update theme groupings in UI components

## Technology Stack Integration

- **D3.js v7**: Advanced 2D visualizations and DOM manipulation
- **Three.js**: 3D graphics and WebGL rendering
- **shadcn/ui + Radix**: Accessible component primitives
- **TanStack Query**: Data fetching and caching
- **XLSX**: Excel file processing
- **Tailwind CSS**: Utility-first styling with custom classes

## Development Notes

- The application uses Vite with React SWC for fast development builds
- TypeScript strict mode is enabled with comprehensive type definitions
- All file paths must be absolute when using utility functions
- WebGL features require fallback handling for unsupported browsers
- Toast notifications are used extensively for user feedback throughout the application