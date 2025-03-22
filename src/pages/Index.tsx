import React, { useState } from "react";
import TabsContainer from "@/components/TabsContainer";
import IntroContent from "@/components/IntroContent";
import NetworkExplorer from "@/components/NetworkExplorer";
import AboutContent from "@/components/AboutContent";
import CreditsDialog from "@/components/CreditsDialog";
import LogoCentro from "@/assets/images/logoCENTRO.svg";


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
            <div className="h-7 w-7 rounded-md flex items-center justify-center">
  <img src="/logoCENTRO.svg" alt="Logo Centro" width="20" height="20" />
</div>
              <span className="hidden font-display font-semibold sm:inline-block">
                Redes y Creatividad 2025
              </span>
            </a>
          </div>
        </div>
      </header>

      <main className="container pt-8 pb-16">
        <TabsContainer
          introContent={<IntroContent />}
          visualizationContent={<NetworkExplorer onCreditsClick={handleCreditsClick} />}
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