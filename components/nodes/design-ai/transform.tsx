"use client";

import { useState, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals, useNodeConnections } from '@xyflow/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ComponentLibrary } from '@/components/design-ai/component-library';
import { NodeLayout } from '../layout';
import { SparklesIcon, ComponentIcon, PlusIcon, XIcon, CopyIcon } from 'lucide-react';
import type { DesignAINodeProps } from './index';
import { getComponents, getComponentById } from '@/lib/storage';

export const DesignAITransform = ({ data, id, type, title }: DesignAINodeProps & { title: string }) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const connections = useNodeConnections({ id, handleType: 'target' });
  
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [selectedComponents, setSelectedComponents] = useState<string[]>(data.selectedComponents || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Get input data from connected nodes
  const getInputContext = () => {
    if (connections.length === 0) return '';
    
    let context = `Connected to ${connections.length} input node${connections.length !== 1 ? 's' : ''}:\n`;
    connections.forEach((connection, index) => {
      context += `- Input ${index + 1}: ${connection.source}\n`;
    });
    
    return context;
  };

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
      const inputContext = getInputContext();
      
      // Enhanced prompt with input context
      const enhancedPrompt = inputContext 
        ? `${prompt}\n\nAdditional context from connected nodes:\n${inputContext}`
        : prompt;
      
      const response = await fetch('/api/design-ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          selectedComponents: components,
          brandGuidelines: 'Use modern, clean design with proper spacing and responsive layout. Incorporate context from connected nodes.',
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

      updateNodeInternals(id);
      toast.success('Design generated successfully!');

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
    return selectedComponents.map(id => getComponentById(id)).filter((component): component is NonNullable<typeof component> => Boolean(component));
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
    <NodeLayout id={id} type={type} title={title}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="w-96 space-y-4">
        {/* Connection Status */}
        <div className="text-xs text-muted-foreground">
          Connected to {connections.length} node{connections.length !== 1 ? 's' : ''}
        </div>

        {/* Prompt Input */}
        <div>
          <label className="text-sm font-medium mb-2 block">Design Prompt</label>
          <Textarea
            placeholder="Describe what you want to create using the connected node data..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-16"
          />
        </div>

        {/* Component Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Components ({selectedComponents.length})</h3>
            <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusIcon className="size-3 mr-1" />
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

          {selectedComponents.length > 0 && (
            <ScrollArea className="h-24">
              <div className="flex flex-wrap gap-1">
                {getSelectedComponentsData().map((component) => (
                  <Badge key={component.id} variant="secondary" className="text-xs gap-1">
                    {component.name}
                    <button
                      onClick={() => handleComponentDeselect(component.id)}
                      className="hover:text-destructive"
                    >
                      <XIcon className="size-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim() || selectedComponents.length === 0}
          className="w-full"
          size="sm"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin size-3 border-2 border-current border-t-transparent rounded-full mr-2" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="size-3 mr-2" />
              Generate
            </>
          )}
        </Button>

        {/* Output */}
        {data.generated?.code && (
          <div className="space-y-2">
            {data.generated.explanation && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                <p className="text-blue-800 dark:text-blue-200">
                  {data.generated.explanation}
                </p>
              </div>
            )}
            
            <div className="border rounded overflow-hidden">
              <div className="flex items-center justify-between p-2 bg-muted border-b">
                <span className="text-xs font-medium">Generated Code</span>
                <Button size="sm" variant="ghost" onClick={handleCopyCode}>
                  <CopyIcon className="size-2 mr-1" />
                  Copy
                </Button>
              </div>
              <ScrollArea className="h-32">
                <pre className="text-xs p-2 font-mono whitespace-pre-wrap">
                  {data.generated.code}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </NodeLayout>
  );
};
