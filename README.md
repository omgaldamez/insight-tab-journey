
# Insight Tab Journey - Network Data Visualization Platform

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-7d3bdf.svg)](https://lovable.dev)

An advanced interactive data visualization platform for exploring complex relationships through dynamic graph networks. Built by Omar Galdámez at CENTRO | Diseño, Cine y Televisión with Generation 32 Marketing and Advertising students for the "Redes y Creatividad 2025" course.

![Network Visualization Screenshot](public/og-image.png)

## Overview

**Insight Tab Journey** is a comprehensive network visualization platform that transforms CSV data into interactive, explorable graph networks. Using cutting-edge web technologies including D3.js, Three.js, and modern React patterns, it provides multiple visualization modes for analyzing complex data relationships. The application was developed as part of the Graph Networks and Creativity course at CENTRO, focusing on the intersection of data visualization, graph theory, and creative storytelling.

## ✨ Features

### 🎯 Multiple Visualization Modes

- **Standard Network**: Traditional force-directed graph visualization with customizable physics
- **Chord Diagram**: Advanced circular visualization showing categorical relationships with animated ribbons and particle effects
- **3D Network**: Immersive three-dimensional graph visualization with spherical and network layouts
- **Rad360**: Radial layout with nodes positioned in a circular pattern
- **Arc Diagram**: Vertical arc visualization showing connections between nodes
- **Arc Lineal**: Horizontal arc visualization with linear node arrangement
- **Node Navigation**: Interactive exploration focusing on individual nodes and their connections
- **Route Finder**: Specialized visualization for path discovery and network traversal
- **Groupable Network**: Advanced network with dynamic node grouping capabilities

### 🎮 Interactive Controls

- **Advanced Physics Simulation**: Adjustable force parameters, link strength, and node charge
- **Real-time Animation**: Smooth transitions and animated chord progressions
- **Particle Systems**: WebGL-accelerated particle effects for enhanced visual appeal
- **Dynamic Zoom & Pan**: Multi-level navigation with zoom-to-fit functionality
- **Node Manipulation**: Click, drag, and fix nodes with persistent positioning
- **Smart Tooltips**: Configurable hover and click-based information display
- **Fullscreen Mode**: Distraction-free exploration with dedicated controls

### 🎨 Advanced Theming & Customization

- **20+ Color Themes**: From basic palettes to specialized themes like "Exotic Plumage" and "Cosmic Drift"
- **Dynamic Color Systems**: Automatic category-based color assignment
- **Custom Node Colors**: Individual node color customization with real-time preview
- **Background Controls**: Adjustable opacity, colors, and visual effects
- **Export Customization**: Multiple format support with CSS effect toggles

### 📊 Data Management

- **CSV Integration**: Seamless import of nodes.csv and links.csv files
- **Multiple Datasets**: Pre-loaded examples including Artists, Movies, Concerts, Cuisine, Toys, and TasteAtlas
- **Data Validation**: Automatic error checking and user feedback
- **Export Capabilities**: SVG, PNG, JPG, PDF, and TIFF format support
- **Batch Downloads**: Export all formats simultaneously

### 🖥️ Modern User Interface

- **Tabbed Navigation**: Introduction, Visualization, and About sections
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Collapsible Sidebar**: Space-efficient controls with persistent state
- **Draggable Panels**: Repositionable control elements for optimal workflow
- **Toast Notifications**: Real-time feedback for all user actions
- **Keyboard Shortcuts**: Enhanced productivity features

## 🚀 Current Status

The project is **production-ready** with all visualization modes fully operational:

- ✅ **9 Visualization Types**: Network, Chord, 3D, Rad360, Arc, Arc Lineal, Node Navigation, Route Finder, Groupable Network
- ✅ **Advanced Chord Visualization**: With particle systems, WebGL rendering, and progressive animation
- ✅ **3D Immersive Experience**: Spherical and network layouts with real-time interaction
- ✅ **20+ Color Themes**: Including monochromatic, categorical, and divergent palettes
- ✅ **Multi-format Export**: SVG, PNG, JPG, PDF, TIFF with batch download capability
- ✅ **6 Sample Datasets**: Artists, Movies, Concerts, Cuisine, Toys, TasteAtlas
- ✅ **Responsive Design**: Optimized for all screen sizes and devices
- ✅ **Performance Optimized**: WebGL acceleration and efficient rendering

### 🔄 Planned Enhancements

- **Custom Dataset Upload**: Direct CSV file upload functionality
- **Advanced Analytics**: Network metrics and statistical analysis
- **Collaboration Features**: Share and embed visualizations
- **Additional Datasets**: More domain-specific examples
- **Enhanced 3D Controls**: Advanced camera and lighting controls

## 💻 Technology Stack

Built with cutting-edge web technologies:

### **Core Framework**
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast development and optimized builds
- **React Router** for seamless navigation

### **Visualization Libraries**
- **D3.js v7** for advanced 2D data visualizations and DOM manipulation
- **Three.js** for immersive 3D graphics and WebGL rendering
- **Custom WebGL Shaders** for high-performance particle systems

### **UI & Styling**
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library for consistent design system
- **Radix UI** for accessible, unstyled component primitives
- **Lucide React** for beautiful, customizable icons

### **Data Management**
- **TanStack Query** for efficient data fetching and caching
- **CSV Parsing** with robust error handling
- **File Export** utilities for multiple formats

### **Developer Experience**
- **TypeScript** for enhanced code quality and IntelliSense
- **ESLint** with React-specific rules
- **Lovable Tagger** for component development workflow

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or newer recommended)
- **npm** or **bun** package manager (bun.lockb present)

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd insight-tab-journey

# Install dependencies (using npm)
npm install

# Or using bun for faster installation
bun install

# Start the development server
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:8080`.

### 📖 Using the Application

#### **Getting Started**
1. **Launch**: Open the application and explore the welcome interface
2. **Choose Dataset**: Select from 6 pre-loaded datasets (Artists, Movies, etc.)
3. **Select Visualization**: Choose from 9 different visualization modes

#### **Visualization Modes**
- **Network**: Traditional force-directed graph - perfect for general exploration
- **Chord**: Circular diagram showing category relationships - ideal for categorical data
- **3D**: Immersive three-dimensional experience - best for complex networks
- **Rad360**: Radial layout - great for hierarchical data
- **Arc/Arc Lineal**: Linear arrangements - useful for timeline or sequence data
- **Node Navigation**: Focus mode - excellent for detailed node exploration
- **Route Finder**: Path discovery - specialized for connectivity analysis
- **Groupable**: Dynamic grouping - perfect for clustering analysis

#### **Advanced Features**
- **Particle Effects**: Enable in Chord mode for stunning visual effects
- **WebGL Acceleration**: Available for high-performance rendering
- **Export Options**: Download in multiple formats with customizable CSS effects
- **Color Themes**: Apply from 20+ professional color palettes
- **Fullscreen Mode**: Immersive exploration experience

## 📁 Project Architecture

```
src/
├── components/                    # React Components
│   ├── ui/                       # shadcn/ui Components (40+ components)
│   ├── *Visualization.tsx        # Visualization Components (9 types)
│   ├── NetworkSidebar.tsx        # Control Panel
│   ├── VisualizationCoordinator.tsx  # Main Router
│   └── ...
├── hooks/                        # Custom React Hooks
│   ├── useChordDiagram.ts        # Chord visualization logic
│   ├── useNetworkColors.ts       # Color theme management
│   ├── useThreeDGraph.ts         # 3D visualization logic
│   └── ...
├── utils/                        # Utility Functions
│   ├── chordUtils.ts             # Chord diagram helpers
│   ├── webglParticleSystem.ts    # WebGL particle engine
│   ├── colorThemes.ts            # Color palette definitions
│   └── ...
├── types/                        # TypeScript Definitions
│   ├── networkTypes.ts           # Network data structures
│   └── types.ts                  # General types
├── data/                         # Sample Datasets
│   ├── Artists/                  # nodes.csv, links.csv
│   ├── Movies/                   # nodes.csv, links.csv
│   └── ...                       # 6 total datasets
└── styles/                       # Styling
    └── visualization.css         # Visualization-specific styles
```

### 🎯 Key Components

- **VisualizationCoordinator**: Central router managing all visualization types
- **ChordVisualization**: Advanced chord diagram with particle systems
- **ThreeDVisualization**: WebGL-powered 3D network rendering  
- **NetworkSidebar**: Comprehensive control panel with 50+ settings
- **BaseVisualization**: Shared foundation for all visualization types

## 🏗️ Development & Build

### Available Scripts

```bash
# Development
npm run dev          # Start development server (localhost:8080)
bun dev             # Start with Bun (faster)

# Production
npm run build       # Create production build
npm run build:dev   # Development build with debugging

# Code Quality  
npm run lint        # Run ESLint
npm run preview     # Preview production build
```

### Performance Optimization

- **WebGL Rendering**: Hardware-accelerated graphics for particle systems
- **Progressive Loading**: Efficient data streaming for large networks  
- **Component Virtualization**: Optimized rendering for complex UIs
- **Code Splitting**: Lazy loading for visualization components
- **Bundle Analysis**: Optimized dependencies and tree shaking

## 📊 Data Format

The application expects CSV files in a specific format:

### Nodes File (`nodes.csv`)
```csv
Node,Category
ARTISTAS,TEMA
Olafur Eliasson,Artist
Zaha Hadid,Artist
```

### Links File (`links.csv`)
```csv
ORIGEN,DESTINO
ARTISTAS,Olafur Eliasson
ARTISTAS,Zaha Hadid
```

**Requirements:**
- Nodes file must have `Node` and `Category` columns
- Links file must have `ORIGEN` (source) and `DESTINO` (target) columns
- All node references in links must exist in the nodes file
- CSV files should be UTF-8 encoded

## 🎓 Educational Context

This project was developed as part of the **"Graph Networks and Creativity 2025"** course at CENTRO | Diseño, Cine y Televisión, exploring:

- **Data Visualization Theory**: Principles of effective visual communication
- **Graph Theory Applications**: Network analysis and relationship mapping  
- **Creative Technology**: Intersection of art, design, and programming
- **Interactive Media**: User experience design for complex data
- **Modern Web Development**: Professional development practices

## 👥 Credits & Acknowledgments

- **Lead Developer**: Omar Galdámez, CENTRO | Diseño, Cine y Televisión
- **Academic Program**: Generation 32 Marketing and Advertising
- **Course**: Graph Networks and Creativity 2025
- **Institution**: CENTRO | Diseño, Cine y Televisión
- **Development Platform**: [Lovable](https://lovable.dev)

### Special Thanks
- Students of Generation 32 for their creative input and testing
- CENTRO faculty for their guidance and support
- The open-source community for the excellent libraries used

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ and ☕ using [Lovable](https://lovable.dev)**

*Empowering creative exploration through interactive data visualization*
