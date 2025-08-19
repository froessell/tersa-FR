"use client";

import { useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ComponentLibrary } from '@/components/design-ai/component-library';
import { CodePreview } from '@/components/design-ai/code-preview';
import { NodeLayout } from '../layout';
import { SparklesIcon, ComponentIcon, SendIcon, CopyIcon, XIcon, PlusIcon } from 'lucide-react';
import type { DesignAINodeProps } from './index';
import { getComponents, getComponentById } from '@/lib/storage';

export const DesignAIPrimitive = ({ data, id, title }: DesignAINodeProps & { title: string }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [selectedComponents, setSelectedComponents] = useState<string[]>(data.selectedComponents || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'components' | 'output'>('prompt');

  // Load components from localStorage
  const [availableComponents, setAvailableComponents] = useState(() => getComponents());

  useEffect(() => {
    const handleStorageChange = () => {
      setAvailableComponents(getComponents());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (selectedComponents.length === 0) {
      toast.error('Please select at least one component');
      return;
    }

    setIsGenerating(true);

    try {
      const components = selectedComponents.map(id => getComponentById(id)).filter(Boolean);
      
      const response = await fetch('/api/design-ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          selectedComponents: components,
          brandGuidelines: 'Use modern, clean design with proper spacing and responsive layout',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate design');
      }

      const result = await response.json();

      // Update node data
      const updatedData = {
        ...data,
        generated: {
          code: result.generatedCode,
          explanation: result.explanation,
          usedComponents: result.usedComponents,
        },
        prompt,
        selectedComponents,
        updatedAt: new Date().toISOString(),
      };

      // Update the node (this would typically be done through a context or callback)
      updateNodeInternals(id);
      
      toast.success('Design generated successfully!');
      setActiveTab('output');

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComponentSelect = (componentId: string) => {
    if (!selectedComponents.includes(componentId)) {
      setSelectedComponents(prev => [...prev, componentId]);
    }
  };

  const handleComponentDeselect = (componentId: string) => {
    setSelectedComponents(prev => prev.filter(id => id !== componentId));
  };

  const getSelectedComponentsData = () => {
    return selectedComponents.map(id => getComponentById(id)).filter(Boolean);
  };

  const handleCopyCode = async () => {
    if (!data.generated?.code) return;
    
    try {
      await navigator.clipboard.writeText(data.generated.code);
      toast.success('Code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <NodeLayout title={title} icon={SparklesIcon}>
      <Handle type="source" position={Position.Right} />
      
      <div className="w-96">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Design Prompt</label>
              <Textarea
                placeholder="Describe what you want to create... e.g., 'Create a landing page hero section with a title, subtitle, and CTA button'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-20"
              />
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !prompt.trim() || selectedComponents.length === 0}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4 mr-2" />
                  Generate Design
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="components" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Selected Components ({selectedComponents.length})</h3>
              <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PlusIcon className="size-4 mr-1" />
                    Browse
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Component Library</DialogTitle>
                  </DialogHeader>
                  <div className="overflow-y-auto">
                    <ComponentLibrary
                      selectedComponents={selectedComponents}
                      onComponentSelect={handleComponentSelect}
                      onComponentDeselect={handleComponentDeselect}
                      selectionMode={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {selectedComponents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ComponentIcon className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No components selected</p>
                <p className="text-xs">Click Browse to select components</p>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {getSelectedComponentsData().map((component) => (
                    <div key={component.id} className="flex items-center gap-2 p-2 border rounded">
                      <img 
                        src={component.imageUrl} 
                        alt={component.name}
                        className="size-8 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{component.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {component.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleComponentDeselect(component.id)}
                      >
                        <XIcon className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="output" className="space-y-4">
            {data.generated?.code ? (
              <div className="space-y-3">
                {data.generated.explanation && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {data.generated.explanation}
                    </p>
                  </div>
                )}
                
                <div className="border rounded overflow-hidden">
                  <div className="flex items-center justify-between p-2 bg-muted border-b">
                    <span className="text-sm font-medium">Generated Code</span>
                    <Button size="sm" variant="ghost" onClick={handleCopyCode}>
                      <CopyIcon className="size-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-48">
                    <pre className="text-xs p-3 font-mono whitespace-pre-wrap">
                      {data.generated.code}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <SparklesIcon className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No design generated yet</p>
                <p className="text-xs">Create a prompt and select components to generate</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </NodeLayout>
  );
};
