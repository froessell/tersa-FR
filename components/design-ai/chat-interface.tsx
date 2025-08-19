"use client";

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SendIcon, BotIcon, UserIcon, SparklesIcon, XIcon, ComponentIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Component, GenerationRequest, GenerationResponse } from '@/lib/types';
import { getComponentById, saveGeneration } from '@/lib/storage';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  generatedCode?: string;
  usedComponents?: string[];
}

interface ChatInterfaceProps {
  selectedComponents: string[];
  onComponentDeselect: (componentId: string) => void;
  onCodeGenerated?: (code: string) => void;
}

export function ChatInterface({ 
  selectedComponents, 
  onComponentDeselect,
  onCodeGenerated 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isGenerating) return;
    
    if (selectedComponents.length === 0) {
      toast.error('Please select at least one component from your library');
      return;
    }

    const userMessage: Message = {
      id: nanoid(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      // Get component details for the selected components
      const components = selectedComponents.map(id => getComponentById(id)).filter(Boolean) as Component[];
      
      const response = await fetch('/api/design-ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          selectedComponents: components,
          brandGuidelines: 'Use modern, clean design with proper spacing and responsive layout',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate design');
      }

      const result: GenerationResponse = await response.json();

      const assistantMessage: Message = {
        id: nanoid(),
        type: 'assistant',
        content: result.explanation,
        timestamp: new Date(),
        generatedCode: result.generatedCode,
        usedComponents: result.usedComponents,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save generation to storage
      const generation: GenerationRequest = {
        id: nanoid(),
        prompt: userMessage.content,
        selectedComponents: components,
        generatedCode: result.generatedCode,
        explanation: result.explanation,
        usedComponents: result.usedComponents,
        createdAt: new Date(),
      };
      
      saveGeneration(generation);
      onCodeGenerated?.(result.generatedCode);
      
      toast.success('Design generated successfully!');

    } catch (error) {
      console.error('Generation error:', error);
      
      const errorMessage: Message = {
        id: nanoid(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to generate design');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getComponentsFromLibrary = () => {
    return selectedComponents.map(id => getComponentById(id)).filter(Boolean) as Component[];
  };

  const selectedComponentsData = getComponentsFromLibrary();

  return (
    <div className="flex flex-col h-full">
      {/* Selected Components Header */}
      {selectedComponents.length > 0 && (
        <div className="border-b p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <ComponentIcon className="size-4" />
            Selected Components ({selectedComponents.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedComponentsData.map((component) => (
              <Badge key={component.id} variant="secondary" className="gap-2">
                {component.name}
                <button
                  onClick={() => onComponentDeselect(component.id)}
                  className="hover:text-destructive"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                <SparklesIcon size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start designing with AI</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select components from your library and describe what you want to create. 
                I'll generate React code using your components.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className="flex gap-3">
              <div className={`flex size-8 items-center justify-center rounded-full shrink-0 ${
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {message.type === 'user' ? (
                  <UserIcon size={16} />
                ) : (
                  <BotIcon size={16} />
                )}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {message.type === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
                
                <div className={`rounded-lg p-3 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.generatedCode && (
                  <Card className="mt-3">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Generated Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        <code>{message.generatedCode}</code>
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3">
              <div className="flex size-8 items-center justify-center rounded-full shrink-0 bg-muted text-muted-foreground">
                <BotIcon size={16} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">AI Assistant</span>
                  <span className="text-xs text-muted-foreground">now</span>
                </div>
                <div className="rounded-lg p-3 bg-muted">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                    Generating your design...
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Form */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedComponents.length === 0 
                ? "Select components from your library first, then describe what you want to create..."
                : "Describe the design you want to create using your selected components..."
            }
            className="min-h-20 resize-none"
            disabled={isGenerating || selectedComponents.length === 0}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
            <Button 
              type="submit" 
              disabled={!input.trim() || isGenerating || selectedComponents.length === 0}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SendIcon className="size-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
