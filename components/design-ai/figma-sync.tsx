"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FigmaIcon, 
  DownloadIcon, 
  RefreshCwIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  ExternalLinkIcon,
  InfoIcon
} from 'lucide-react';
import { FigmaSyncRequest, FigmaSyncResponse, Component } from '@/lib/types';
import { saveFigmaComponents } from '@/lib/storage';

interface FigmaSyncProps {
  onComponentsSynced?: (components: any[]) => void;
}

export function FigmaSync({ onComponentsSynced }: FigmaSyncProps) {
  const [fileKey, setFileKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [lastSync, setLastSync] = useState<any>(null);
  const [includeThumbnails, setIncludeThumbnails] = useState(true);

  const extractFileKey = (url: string) => {
    // Extract file key from Figma URL
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : url;
  };

  const handleFileKeyChange = (value: string) => {
    const extracted = extractFileKey(value);
    setFileKey(extracted);
  };

  const checkFileInfo = async () => {
    if (!fileKey.trim()) {
      toast.error('Please enter a Figma file key or URL');
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch(`/api/figma/sync?fileKey=${fileKey.trim()}`);
      const data = await response.json();

      if (data.success) {
        setFileInfo(data.fileInfo);
        toast.success(`Found Figma file: ${data.fileInfo.name}`);
      } else {
        setFileInfo(null);
        toast.error(data.error || 'Failed to fetch file info');
      }
    } catch (error) {
      console.error('Error checking file:', error);
      toast.error('Failed to check Figma file');
      setFileInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleFigmaComponentsSynced = (syncedComponents: Component[]) => {
    // Save the synced components to storage
    saveFigmaComponents(syncedComponents);
    
    // Notify parent component about synced components
    if (onComponentsSynced) {
      onComponentsSynced(syncedComponents);
    }
  };

  const syncComponents = async () => {
    if (!fileKey.trim()) {
      toast.error('Please enter a Figma file key or URL');
      return;
    }

    setIsLoading(true);
    try {
      const syncRequest: FigmaSyncRequest = {
        fileKey: fileKey.trim(),
        includeThumbnails,
      };

      const response = await fetch('/api/figma/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncRequest),
      });

      const data: FigmaSyncResponse = await response.json();

      if (data.success) {
        setLastSync(data);
        toast.success(data.message);
        
        // Handle the synced components
        handleFigmaComponentsSynced(data.components);
      } else {
        toast.error(data.message || 'Failed to sync components');
      }
    } catch (error) {
      console.error('Error syncing components:', error);
      toast.error('Failed to sync components');
    } finally {
      setIsLoading(false);
    }
  };

  const openFigmaFile = () => {
    if (fileKey) {
      window.open(`https://www.figma.com/file/${fileKey}`, '_blank');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FigmaIcon className="h-5 w-5 text-[#F24E1E]" />
          <CardTitle>Figma Design System Sync</CardTitle>
        </div>
        <CardDescription>
          Import your design system components directly from Figma. No more manual component uploads!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File Key Input */}
        <div className="space-y-2">
          <Label htmlFor="figma-file-key">Figma File Key or URL</Label>
          <div className="flex gap-2">
            <Input
              id="figma-file-key"
              placeholder="Enter Figma file key or paste Figma URL"
              value={fileKey}
              onChange={(e) => handleFileKeyChange(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={checkFileInfo}
              disabled={isChecking || !fileKey.trim()}
              size="sm"
            >
              {isChecking ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <InfoIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can find the file key in the URL when viewing your Figma file, or paste the full Figma URL.
          </p>
        </div>

        {/* File Info Display */}
        {fileInfo && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{fileInfo.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {fileInfo.componentCount} components • {fileInfo.componentSetCount} component sets
                </p>
                <p className="text-xs text-muted-foreground">
                  Last modified: {new Date(fileInfo.lastModified).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openFigmaFile}
                className="gap-2"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                Open
              </Button>
            </div>
          </div>
        )}

        {/* Sync Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="include-thumbnails"
              checked={includeThumbnails}
              onChange={(e) => setIncludeThumbnails(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="include-thumbnails" className="text-sm">
              Include component thumbnails (slower but provides visual previews)
            </Label>
          </div>
        </div>

        {/* Sync Button */}
        <Button
          onClick={syncComponents}
          disabled={isLoading || !fileKey.trim() || !fileInfo}
          className="w-full gap-2"
        >
          {isLoading ? (
            <RefreshCwIcon className="h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="h-4 w-4" />
          )}
          Sync Components from Figma
        </Button>

        {/* Last Sync Info */}
        {lastSync && (
          <div className="rounded-lg border bg-green-50 p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="font-medium">Sync Successful!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              {lastSync.message}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
              <Badge variant="secondary" className="text-green-700">
                {lastSync.components.length} components
              </Badge>
              <span>•</span>
              <span>Synced at {new Date(lastSync.syncTimestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Help Text */}
        <Separator />
        <div className="rounded-lg bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <InfoIcon className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Components are automatically categorized based on their names and frames</li>
                <li>• Tags are generated from component properties and frame names</li>
                <li>• Each component maintains a link back to its Figma source</li>
                <li>• Sync again anytime to get the latest updates from Figma</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
