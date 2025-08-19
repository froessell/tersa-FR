"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ComponentLibrary } from './component-library';
import { ChatInterface } from './chat-interface';
import { CodePreview } from './code-preview';
import { ComponentIcon, MessageCircleIcon, CodeIcon, LayoutIcon } from 'lucide-react';

export function DesignAILayout() {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'library' | 'chat'>('library');
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleComponentSelect = (componentId: string) => {
    if (!selectedComponents.includes(componentId)) {
      setSelectedComponents(prev => [...prev, componentId]);
    }
  };

  const handleComponentDeselect = (componentId: string) => {
    setSelectedComponents(prev => prev.filter(id => id !== componentId));
  };

  const handleCodeGenerated = (code: string) => {
    setGeneratedCode(code);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutIcon className="size-6" />
            Design AI Tool
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate React components using your library
          </p>
        </div>

        {/* Mobile Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'library' | 'chat')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 m-4">
            <TabsTrigger value="library" className="gap-2">
              <ComponentIcon className="size-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircleIcon className="size-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <CodeIcon className="size-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 px-4 pb-4 mt-0">
            <Card className="h-full">
              <div className="h-full overflow-hidden">
                <ComponentLibrary
                  selectedComponents={selectedComponents}
                  onComponentSelect={handleComponentSelect}
                  onComponentDeselect={handleComponentDeselect}
                  selectionMode={true}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 px-4 pb-4 mt-0">
            <Card className="h-full">
              <ChatInterface
                selectedComponents={selectedComponents}
                onComponentDeselect={handleComponentDeselect}
                onCodeGenerated={handleCodeGenerated}
              />
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 px-4 pb-4 mt-0">
            <CodePreview code={generatedCode} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutIcon className="size-8" />
            Design AI Tool
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate React components using your existing component library
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto h-full">
          <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
            {/* Left Panel - Component Library */}
            <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
              <Card className="h-full border-0 rounded-none rounded-l-lg">
                <div className="h-full overflow-hidden">
                  <ComponentLibrary
                    selectedComponents={selectedComponents}
                    onComponentSelect={handleComponentSelect}
                    onComponentDeselect={handleComponentDeselect}
                    selectionMode={true}
                  />
                </div>
              </Card>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Panel - Chat and Preview */}
            <ResizablePanel defaultSize={70}>
              <div className="h-full">
                <ResizablePanelGroup direction="vertical">
                  {/* Chat Interface */}
                  <ResizablePanel defaultSize={60} minSize={40}>
                    <Card className="h-full border-0 rounded-none">
                      <ChatInterface
                        selectedComponents={selectedComponents}
                        onComponentDeselect={handleComponentDeselect}
                        onCodeGenerated={handleCodeGenerated}
                      />
                    </Card>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  {/* Code Preview */}
                  <ResizablePanel defaultSize={40} minSize={30}>
                    <div className="h-full border-0 rounded-none rounded-br-lg">
                      <CodePreview code={generatedCode} />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
