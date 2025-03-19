
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";

interface CreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreditsDialog: React.FC<CreditsDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Project Credits</DialogTitle>
          <DialogDescription className="text-center">
            The people and resources behind this visualization
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 mt-2">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Core Team</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">AM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Ana Martínez</p>
                  <p className="text-xs text-muted-foreground">Data Scientist</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">CR</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Carlos Rodríguez</p>
                  <p className="text-xs text-muted-foreground">Developer</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">ES</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Elena Sánchez</p>
                  <p className="text-xs text-muted-foreground">UX Designer</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">ML</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Miguel López</p>
                  <p className="text-xs text-muted-foreground">Coordinator</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Technologies Used</h3>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="credit-badge">D3.js</Badge>
              <Badge variant="secondary" className="credit-badge">React</Badge>
              <Badge variant="secondary" className="credit-badge">TypeScript</Badge>
              <Badge variant="secondary" className="credit-badge">Tailwind CSS</Badge>
              <Badge variant="secondary" className="credit-badge">CSV</Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Data Sources</h3>
            <p className="text-xs text-muted-foreground">
              Network data compiled from public research datasets. Node and edge structures 
              were processed and anonymized for educational purposes. Original sources are 
              cited in the accompanying research paper.
            </p>
          </div>
          
          <div className="bg-secondary/40 p-3 rounded-md text-xs text-muted-foreground">
            <p>
              This project was developed at Universidad Nacional Autónoma as part of the 
              Advanced Data Visualization course (2023-2024). All rights reserved.
            </p>
          </div>
        </div>
        
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default CreditsDialog;
