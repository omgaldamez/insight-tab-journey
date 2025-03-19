
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AboutContent: React.FC = () => {
  const teamMembers = [
    {
      name: "Ana Martínez",
      role: "Data Scientist",
      bio: "Specializes in graph algorithms and network analysis with 5 years of experience in academic research.",
      avatar: "AM"
    },
    {
      name: "Carlos Rodríguez",
      role: "Frontend Developer",
      bio: "Expert in D3.js visualizations and interactive web applications for data presentation.",
      avatar: "CR"
    },
    {
      name: "Elena Sánchez",
      role: "UX Designer",
      bio: "Focuses on creating intuitive interfaces for complex data visualization tools.",
      avatar: "ES"
    },
    {
      name: "Miguel López",
      role: "Project Coordinator",
      bio: "Manages interdisciplinary projects and coordinates between technical and academic teams.",
      avatar: "ML"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight mb-2">About This Project</h1>
        <p className="text-lg text-muted-foreground">
          Learn about the team and technology behind this network visualization tool.
        </p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="bg-primary/5">
          <CardTitle>Project Background</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            This network visualization project was developed as part of a research initiative at the Universidad Nacional Autónoma's 
            Data Science Department. The goal was to create an accessible, interactive tool for exploring complex network datasets 
            without requiring specialized software.
          </p>
          <p className="mb-4">
            The project uses D3.js for visualization, React for the user interface, and implements a force-directed graph layout 
            to automatically position nodes based on their relationships. This approach reveals natural clusters and patterns 
            in the data that might not be immediately apparent in tabular formats.
          </p>
          <p>
            The visualization tool can work with any network dataset structured as two CSV files: one defining nodes (entities) 
            and another defining edges (relationships). This flexibility makes it useful across disciplines, from social network 
            analysis to biological pathway mapping.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4 mt-8">
        <h2 className="text-2xl font-semibold">Meet The Team</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {teamMembers.map((member, index) => (
            <div key={index} className="flex gap-4">
              <Avatar className="h-12 w-12 border border-border flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {member.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{member.name}</h3>
                <p className="text-sm text-primary">{member.role}</p>
                <p className="text-sm text-muted-foreground mt-1">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Technology Stack</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">D3.js</div>
            <p className="text-sm text-muted-foreground">
              Data-driven visualization library for creating dynamic, interactive data visualizations.
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">React</div>
            <p className="text-sm text-muted-foreground">
              User interface library for building interactive component-based applications.
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">TypeScript</div>
            <p className="text-sm text-muted-foreground">
              Typed JavaScript for improved code quality and developer experience.
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">Tailwind CSS</div>
            <p className="text-sm text-muted-foreground">
              Utility-first CSS framework for rapidly building custom designs.
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">CSV Processing</div>
            <p className="text-sm text-muted-foreground">
              Custom data processing workflows for network data from CSV files.
            </p>
          </div>
          
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="font-medium mb-1">Force Simulation</div>
            <p className="text-sm text-muted-foreground">
              Physics-based layout algorithms for positioning nodes and links.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-secondary/50 rounded-lg p-6 border border-border">
        <h3 className="text-xl font-semibold mb-2">Research Publications</h3>
        <ul className="space-y-3">
          <li>
            <p className="text-sm">
              <span className="font-medium">Network Analysis of Social Structures</span>
              <br />
              <span className="text-muted-foreground">
                Martínez, A., Rodríguez, C., & López, M. (2023). Journal of Network Science, 15(4), 287-301.
              </span>
            </p>
          </li>
          <li>
            <p className="text-sm">
              <span className="font-medium">Interactive Visualization Techniques for Complex Networks</span>
              <br />
              <span className="text-muted-foreground">
                Sánchez, E., & Rodríguez, C. (2022). IEEE Transactions on Visualization, 8(2), 112-125.
              </span>
            </p>
          </li>
          <li>
            <p className="text-sm">
              <span className="font-medium">Applications of Force-Directed Layouts in Biological Network Analysis</span>
              <br />
              <span className="text-muted-foreground">
                López, M., & Martínez, A. (2021). Computational Biology Journal, 42(3), 198-210.
              </span>
            </p>
          </li>
        </ul>
      </div>

      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Universidad Nacional Autónoma - Data Science Department
          <br />
          All rights reserved. Contact: data-viz@universidad.edu
        </p>
      </div>
    </div>
  );
};

export default AboutContent;
