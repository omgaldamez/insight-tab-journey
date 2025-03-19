
import React, { useState } from "react";
import TabsContainer from "@/components/TabsContainer";
import IntroContent from "@/components/IntroContent";
import NetworkVisualization from "@/components/NetworkVisualization";
import AboutContent from "@/components/AboutContent";
import CreditsDialog from "@/components/CreditsDialog";

const Index = () => {
  const [creditsOpen, setCreditsOpen] = useState(false);

  const handleCreditsClick = () => {
    setCreditsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <a href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="7" r="4"/>
                  <circle cx="17" cy="7" r="4"/>
                  <circle cx="12" cy="17" r="4"/>
                  <line x1="8" y1="7" x2="12" y2="17"/>
                  <line x1="17" y1="7" x2="12" y2="17"/>
                  <line x1="8" y1="7" x2="17" y2="7"/>
                </svg>
              </div>
              <span className="hidden font-display font-semibold sm:inline-block">
                Network Visualization
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="container pt-8 pb-16">
        <TabsContainer
          introContent={<IntroContent />}
          visualizationContent={<NetworkVisualization onCreditsClick={handleCreditsClick} />}
          aboutContent={<AboutContent />}
        />
      </main>

      <CreditsDialog
        open={creditsOpen}
        onOpenChange={setCreditsOpen}
      />
    </div>
  );
};

export default Index;
