import { RefObject } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Node, Link } from '@/types/networkTypes';
import { dataURItoBlob } from '@/utils/visualizationUtils';

interface UseFileExportProps {
  svgRef: RefObject<SVGSVGElement>;
  nodes: Node[];
  links: Link[];
  networkTitle: string;
  onNotify: (title: string, message: string, isError?: boolean) => void;
  backgroundColor: string;
  backgroundOpacity: number;
  textColor: string;
  linkColor: string;
  nodeStrokeColor: string;
  getTransform: () => d3.ZoomTransform | null;
}

interface UseFileExportResult {
  downloadData: (format: string) => void;
  downloadGraph: (format: string) => void;
}

const useFileExport = ({
  svgRef,
  nodes,
  links,
  networkTitle,
  onNotify,
  backgroundColor,
  backgroundOpacity,
  textColor,
  linkColor,
  nodeStrokeColor,
  getTransform
}: UseFileExportProps): UseFileExportResult => {
  // Download data as CSV or XLSX
  const downloadData = (format: string) => {
    try {
      // Prepare data in array format for export
      const nodeData = nodes.map(node => ({
        id: String(node.id),
        category: String(node.category)
      }));
      
      const linkData = links.map(link => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target
      }));
      
      // Generate filename based on title
      const safeTitle = networkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = safeTitle || 'network_data';
      
      if (format === 'csv') {
        // Create CSV content
        let csvContent = "";
        
        // Add nodes CSV
        csvContent += "# Nodes\nid,category\n";
        nodeData.forEach(node => {
          // Escape commas in names if necessary
          const id = String(node.id).includes(',') ? `"${node.id}"` : node.id;
          csvContent += `${id},${node.category}\n`;
        });
        
        // Add links CSV
        csvContent += "\n# Links\nsource,target\n";
        linkData.forEach(link => {
          // Escape commas in names if necessary
          const source = typeof link.source === 'string' && link.source.includes(',') ? `"${link.source}"` : link.source;
          const target = typeof link.target === 'string' && link.target.includes(',') ? `"${link.target}"` : link.target;
          csvContent += `${source},${target}\n`;
        });
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        saveAs(blob, `${filename}.csv`);
        
        onNotify("Download Started", "Your network data is being downloaded as CSV");
      } else if (format === 'xlsx') {
        try {
          // Create workbook
          const wb = XLSX.utils.book_new();
          
          // Create worksheets for nodes and links
          const wsNodes = XLSX.utils.json_to_sheet(nodeData);
          const wsLinks = XLSX.utils.json_to_sheet(linkData);
          
          // Add worksheets to workbook
          XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");
          XLSX.utils.book_append_sheet(wb, wsLinks, "Links");
          
          // Generate XLSX file and trigger download
          XLSX.writeFile(wb, `${filename}.xlsx`);
          
          onNotify("Download Started", "Your network data is being downloaded as Excel file");
        } catch (xlsxError) {
          console.error("XLSX specific error:", xlsxError);
          onNotify("XLSX Error", "Error creating Excel file: " + String(xlsxError), true);
        }
      }
    } catch (error) {
      console.error("Error downloading data:", error);
      onNotify("Download Error", "An error occurred while preparing the data download: " + String(error), true);
    }
  };

  // Download graph as image formats or PDF
  const downloadGraph = (format: string) => {
    if (!svgRef.current) {
      onNotify("Error", "SVG reference is not available for download", true);
      return;
    }
    
    try {
      // Clone the SVG element
      const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
      
      // Get the original SVG dimensions
      const svgWidth = svgRef.current.clientWidth;
      const svgHeight = svgRef.current.clientHeight;
      
      // Set explicit width and height attributes
      svgCopy.setAttribute('width', svgWidth.toString());
      svgCopy.setAttribute('height', svgHeight.toString());
      
      // Get the current transform from zoom
      const transform = getTransform();
      const transformMatrix = {translate: {x: 0, y: 0}, scale: 1};
      
      // Find the transform group and get its transform
      const transformGroup = svgCopy.querySelector('g');
      if (transformGroup && transform) {
        transformMatrix.translate.x = transform.x;
        transformMatrix.translate.y = transform.y;
        transformMatrix.scale = transform.k;
        
        // Remove the transform from group as we'll apply it to viewBox
        transformGroup.removeAttribute('transform');
      }
      
      // Get bounds
      let bbox;
      if (transformGroup) {
        bbox = (transformGroup as SVGGraphicsElement).getBBox();
      } else {
        bbox = {x: 0, y: 0, width: svgWidth, height: svgHeight};
      }
      
      // Calculate and apply viewBox incorporating zoom transform
      const viewBoxX = bbox.x - (transformMatrix.translate.x / transformMatrix.scale);
      const viewBoxY = bbox.y - (transformMatrix.translate.y / transformMatrix.scale);
      const viewBoxWidth = svgWidth / transformMatrix.scale;
      const viewBoxHeight = svgHeight / transformMatrix.scale;
      const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
      
      svgCopy.setAttribute('viewBox', viewBox);
      
      // Add background rectangle
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', backgroundColor);
      bgRect.setAttribute('opacity', backgroundOpacity.toString());
      
// Insert background at beginning - IMPROVED VERSION
if (svgCopy.firstChild) {
  svgCopy.insertBefore(bgRect, svgCopy.firstChild);
} else {
  svgCopy.appendChild(bgRect);
}

// Also add these CSS styles to ensure the background is preserved in export
const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
style.textContent = `
  svg { background-color: ${backgroundColor}; }
  rect.background { fill: ${backgroundColor}; opacity: ${backgroundOpacity}; }
  .node { stroke-width: 1.5; stroke: ${nodeStrokeColor}; }
  .link { stroke-width: 1.5; stroke: ${linkColor}; }
  .node-label { font-family: sans-serif; text-anchor: middle; fill: ${textColor}; }
`;
bgRect.setAttribute('class', 'background');

// Insert the style element
svgCopy.insertBefore(style, svgCopy.firstChild);
      
      // Convert SVG to string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgCopy);
      
      // Generate filename
      const safeTitle = networkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = safeTitle || 'network_visualization';
      
      if (format === 'svg') {
        // Download as SVG
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        saveAs(blob, `${filename}.svg`);
        
        onNotify("Download Started", "Your network visualization is being downloaded as SVG");
      } else {
        // For other formats, convert to image
        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
        const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
        
        // Convert to canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error("Cannot get canvas context");
        }
        
        // For better quality on high-DPI screens
        const scale = 2;
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
        
        // Fill with background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create image from SVG
        const img = new Image();
        
        img.onload = function() {
          // Draw image onto canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Handle different formats
          let mimeType, outputFilename;
          switch(format) {
            case 'png':
              mimeType = 'image/png';
              outputFilename = `${safeTitle}.png`;
              break;
            case 'jpg':
            case 'jpeg':
              mimeType = 'image/jpeg';
              outputFilename = `${safeTitle}.jpg`;
              break;
            case 'pdf':
              try {
                // For PDF, we need special handling
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                  orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
                  unit: 'px',
                  format: [svgWidth, svgHeight]
                });
                
                pdf.addImage(imgData, 'PNG', 0, 0, svgWidth, svgHeight);
                pdf.save(`${safeTitle}.pdf`);
                
                onNotify("Download Started", "Your network visualization is being downloaded as PDF");
                return;
              } catch (pdfError) {
                console.error("PDF creation error:", pdfError);
                onNotify("PDF Creation Failed", "Error creating PDF: " + String(pdfError), true);
                return;
              }
            default:
              mimeType = 'image/png';
              outputFilename = `${safeTitle}.png`;
          }
          
          // Download the image
          const dataUrl = canvas.toDataURL(mimeType);
          saveAs(dataURItoBlob(dataUrl), outputFilename);
          
          onNotify("Download Started", `Your network visualization is being downloaded as ${format.toUpperCase()}`);
        };
        
        // Add error handler
        img.onerror = function(err) {
          console.error("Error loading SVG as image:", err);
          onNotify("Image Creation Failed", "Could not convert SVG to image format. Try SVG format instead.", true);
        };
        
        // Load the SVG
        img.src = imgSrc;
      }
    } catch (error) {
      console.error("Error downloading graph:", error);
      onNotify("Download Error", "An error occurred while preparing the download: " + String(error), true);
    }
  };

  return {
    downloadData,
    downloadGraph
  };
};

export default useFileExport;