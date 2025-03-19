
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const IntroContent: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-2">
        <Badge className="mb-2" variant="outline">
          Network Data Visualization
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-2">
          Interactive Network Analysis
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Exploring complex relationships through dynamic graph visualization using D3.js and CSV data.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-primary"></div>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-3">Project Overview</h3>
            <p className="text-muted-foreground">
              This project demonstrates the power of network visualization for understanding complex relationships in data. 
              Using D3.js, we transform CSV data into interactive graph networks that reveal patterns and connections
              that might otherwise remain hidden in raw data.
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-primary"></div>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-3">University Research</h3>
            <p className="text-muted-foreground">
              Developed at Universidad Nacional Autónoma as part of our data visualization course,
              this project applies graph theory and information design principles to create
              meaningful representations of networked data structures.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Key Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div>
              <h3 className="font-medium">Interactive Exploration</h3>
              <p className="text-sm text-muted-foreground">
                Zoom, pan, and drag nodes to explore complex network relationships.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
              <h3 className="font-medium">Dynamic Simulation</h3>
              <p className="text-sm text-muted-foreground">
                Adjust force parameters to view different aspects of the network.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div>
              <h3 className="font-medium">CSV Integration</h3>
              <p className="text-sm text-muted-foreground">
                Built to work with standard CSV data files for network nodes and edges.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>
            </div>
            <div>
              <h3 className="font-medium">Detailed Tooltips</h3>
              <p className="text-sm text-muted-foreground">
                Hover over nodes to view detailed information about each entity.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div>
              <h3 className="font-medium">Customizable Styling</h3>
              <p className="text-sm text-muted-foreground">
                Tailor node and link appearances to represent different data attributes.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <div>
              <h3 className="font-medium">Export Capability</h3>
              <p className="text-sm text-muted-foreground">
                Download visualizations as SVG files for use in presentations or publications.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 bg-secondary/50 rounded-lg p-6 border border-border">
        <h3 className="text-xl font-semibold mb-3">How to Use</h3>
        <ol className="space-y-2 ml-5 list-decimal">
          <li className="text-muted-foreground">
            <span className="text-foreground font-medium">Explore the Visualization:</span> Navigate to the Visualization tab to interact with the network graph.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground font-medium">Interact with Nodes:</span> Click and drag nodes to reposition them and observe how the network responds.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground font-medium">Adjust Parameters:</span> Use the control panel to modify network forces and see how relationships change.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground font-medium">View Details:</span> Hover over nodes to see additional information about each entity.
          </li>
          <li className="text-muted-foreground">
            <span className="text-foreground font-medium">Export Results:</span> Download the visualization for inclusion in your own research or presentations.
          </li>
        </ol>
      </div>
    </div>
  );
};

export default IntroContent;
