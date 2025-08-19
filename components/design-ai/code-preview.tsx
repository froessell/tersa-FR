"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CopyIcon, DownloadIcon, MonitorIcon, TabletIcon, SmartphoneIcon, CodeIcon, EyeIcon, AlertTriangleIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AdvancedComponentRenderer } from './advanced-component-renderer';

interface CodePreviewProps {
  code: string;
  onCodeChange?: (code: string) => void;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export function CodePreview({ code, onCodeChange }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Reset error when code changes
  useEffect(() => {
    setPreviewError(null);
  }, [code]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy code');
      console.error('Copy error:', error);
    }
  };

  const handleDownloadCode = () => {
    try {
      const blob = new Blob([code], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-component.tsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Code downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download code');
      console.error('Download error:', error);
    }
  };

  const getViewportStyles = () => {
    switch (viewportSize) {
      case 'mobile':
        return 'max-w-sm mx-auto';
      case 'tablet':
        return 'max-w-2xl mx-auto';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  const getViewportIcon = (size: ViewportSize) => {
    switch (size) {
      case 'mobile':
        return <SmartphoneIcon className="size-4" />;
      case 'tablet':
        return <TabletIcon className="size-4" />;
      case 'desktop':
      default:
        return <MonitorIcon className="size-4" />;
    }
  };

  // Use the advanced component renderer for live preview
  const PreviewRenderer = () => {
    if (!code.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <CodeIcon size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">No code generated yet</h3>
          <p className="text-muted-foreground">
            Generate a design using the chat interface to see the preview here.
          </p>
        </div>
      );
    }

    // Use the advanced component renderer to show live preview
    return <AdvancedComponentRenderer code={code} />;
  };

  if (!code.trim()) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 mx-auto">
              <EyeIcon size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Preview your designs</h3>
            <p className="text-muted-foreground">
              Generated code will appear here with live preview and export options.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Code Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyCode}>
              <CopyIcon className="size-4 mr-2" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadCode}>
              <DownloadIcon className="size-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'preview' | 'code')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="preview" className="gap-2">
                <EyeIcon className="size-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-2">
                <CodeIcon className="size-4" />
                Code
              </TabsTrigger>
            </TabsList>

            {activeTab === 'preview' && (
              <div className="flex items-center gap-1 border rounded-lg p-1">
                {(['desktop', 'tablet', 'mobile'] as ViewportSize[]).map((size) => (
                  <Button
                    key={size}
                    size="sm"
                    variant={viewportSize === size ? 'default' : 'ghost'}
                    onClick={() => setViewportSize(size)}
                    className="h-8 w-8 p-0"
                  >
                    {getViewportIcon(size)}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <TabsContent value="preview" className="flex-1 mt-0">
            <div className={`transition-all duration-300 ${getViewportStyles()}`}>
              <PreviewRenderer />
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 mt-0">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    TSX
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    generated-component.tsx
                  </span>
                </div>
              </div>
              <div className="overflow-auto max-h-96">
                <SyntaxHighlighter
                  language="tsx"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: '1.4',
                  }}
                  showLineNumbers={true}
                  wrapLines={true}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
