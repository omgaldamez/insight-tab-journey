
import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TabsContainerProps {
  introContent: React.ReactNode;
  visualizationContent: React.ReactNode;
  aboutContent: React.ReactNode;
}

const TabsContainer: React.FC<TabsContainerProps> = ({
  introContent,
  visualizationContent,
  aboutContent,
}) => {
  const [activeTab, setActiveTab] = useState("intro");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({
    intro: null,
    visualization: null,
    about: null,
  });

  // Update the indicator style when the active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      const currentTab = tabRefs.current[activeTab];
      
      if (currentTab && tabsListRef.current) {
        const tabRect = currentTab.getBoundingClientRect();
        const listRect = tabsListRef.current.getBoundingClientRect();
        
        setIndicatorStyle({
          width: `${tabRect.width}px`,
          transform: `translateX(${tabRect.left - listRect.left}px)`,
        });
      }
    };

    updateIndicator();
    
    // Also update on resize
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab]);

  return (
    <Tabs 
      defaultValue="intro" 
      value={activeTab} 
      onValueChange={setActiveTab}
      className="w-full animate-fade-in"
    >
      <div className="relative border-b border-border mb-8">
        <TabsList 
          ref={tabsListRef}
          className="w-full justify-start bg-transparent h-14 px-0"
        >
          <TabsTrigger
            ref={(el) => (tabRefs.current.intro = el)}
            value="intro"
            className={cn(
              "px-6 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-full",
              activeTab === "intro" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Introduction
          </TabsTrigger>
          
          <TabsTrigger
            ref={(el) => (tabRefs.current.visualization = el)}
            value="visualization"
            className={cn(
              "px-6 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-full",
              activeTab === "visualization" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Visualization
          </TabsTrigger>
          
          <TabsTrigger
            ref={(el) => (tabRefs.current.about = el)}
            value="about"
            className={cn(
              "px-6 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none relative h-full",
              activeTab === "about" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            About
          </TabsTrigger>
          
          <div 
            className="tab-highlight" 
            style={indicatorStyle}
          />
        </TabsList>
      </div>

      <TabsContent 
        value="intro" 
        className="mt-0 outline-none animate-slide-up"
      >
        {introContent}
      </TabsContent>
      
      <TabsContent 
        value="visualization" 
        className="mt-0 outline-none animate-slide-up"
      >
        {visualizationContent}
      </TabsContent>
      
      <TabsContent 
        value="about" 
        className="mt-0 outline-none animate-slide-up"
      >
        {aboutContent}
      </TabsContent>
    </Tabs>
  );
};

export default TabsContainer;
