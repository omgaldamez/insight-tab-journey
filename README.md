
# Network Data Visualization Platform

[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-7d3bdf.svg)](https://lovable.dev)

An interactive data visualization platform for exploring complex relationships through dynamic graph networks. Built by Omar Galdámez at CENTRO | Diseño, Cine y Televisión with Generation 32 Marketing and Advertising students.

![Network Visualization Screenshot](public/og-image.png)

## Overview

This project enables the exploration of complex data relationships through interactive network visualizations. Using D3.js and modern web technologies, it transforms CSV data into dynamic, explorable graph networks. The application was developed as part of the Graph Networks and Creativity course at CENTRO, focusing on the intersection of data visualization, graph theory, and creative storytelling.

## Features

### Multiple Visualization Modes

- **Standard Network**: Traditional force-directed graph visualization
- **Rad360**: Radial layout with nodes positioned in a circle
- **Arc Diagram**: Vertical arc visualization showing connections between nodes
- **Arc Lineal**: Horizontal arc visualization with a linear node arrangement
- **Node Navigation**: Interactive exploration that focuses on one node at a time
- **3D Network**: Immersive three-dimensional graph visualization

### Interactive Controls

- **Dynamic Simulation**: Adjust force parameters to view different aspects of the network
- **Search and Filter**: Find specific nodes and connections
- **Zoom and Pan**: Navigate large networks with intuitive controls
- **Node Selection**: Click on nodes to highlight connections and view details
- **Tooltips**: Hover over nodes to view detailed information
- **Layout Controls**: Adjust visualization parameters

### Data Features

- **CSV Integration**: Upload and visualize your own network data from CSV files
- **Preset Examples**: Explore sample datasets across various domains
- **Export Options**: Download visualizations as SVG or PNG
- **Debug Tools**: Analyze network structure and connectivity

### User Interface

- **Tabbed Navigation**: Easily switch between introduction, visualization, and about sections
- **Responsive Design**: Works on devices of all sizes
- **Dark/Light Mode**: Visual options for different environments
- **Customizable Styling**: Control node size, colors, and other visual parameters

## Current Status

The project is fully functional with all primary visualization modes operational. Features currently implemented:

- ✅ All six visualization types (Network, Rad360, Arc, Arc Lineal, Node Navigation, 3D)
- ✅ CSV data loading from preset examples
- ✅ Interactive controls and node selection
- ✅ Tooltip information display
- ✅ UI framework with tabbed interface
- ✅ Responsive design for different screen sizes
- ✅ Debug and diagnostic tools

### Planned Enhancements

- 🔄 User file uploads for custom datasets
- 🔄 Advanced filtering and search capabilities
- 🔄 Additional visualization algorithms
- 🔄 Enhanced export options
- 🔄 More sample datasets

## Technology Stack

This project is built using a modern web technology stack:

- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Visualization**: D3.js for 2D visualizations, Three.js for 3D
- **Build Tool**: Vite
- **Deployment**: Static site deployment

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd network-visualization

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Using the Application

1. **Explore the Visualization**: Navigate to the Visualization tab to interact with the network graph
2. **Select a Dataset**: Choose from the available preset datasets
3. **Interact with Nodes**: Click and drag nodes to reposition them
4. **View Node Details**: Hover over nodes to see additional information
5. **Adjust Parameters**: Use the controls to modify the visualization
6. **Switch Modes**: Try different visualization types using the mode selector

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/              # UI components (shadcn/ui)
│   ├── NetworkVisualization.tsx  # Main visualization component
│   └── ...
├── hooks/               # Custom React hooks
├── pages/               # Application pages
├── styles/              # Global styles
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── data/                # Sample datasets (CSV)
```

## Credits

- **Lead Developer**: Omar Galdámez, CENTRO
- **Contributors**: Generation 32 Marketing and Advertising students
- **Project Advisor**: [Advisor Name]
- **Institution**: CENTRO | Diseño, Cine y Televisión

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ using [Lovable](https://lovable.dev)
