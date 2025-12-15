'use client';

import { editImageAction } from '@/app/actions/image/edit';
import { useNodeOperations } from '@/providers/node-operations';
import { useReactFlow } from '@xyflow/react';
import {
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  SquareIcon,
  Loader2Icon,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { handleError } from '@/lib/error/handle';
import { imageModels } from '@/lib/models/image';
import { toast } from 'sonner';
import { mutate } from 'swr';

type FormatType = 'square' | 'widescreen' | 'portrait';

type FormatConfig = {
  type: FormatType;
  label: string;
  icon: typeof SquareIcon;
  getSize: (currentSize: string | undefined, modelSizes: string[] | undefined) => string | null;
};

const formats: FormatConfig[] = [
  {
    type: 'square',
    label: 'Square',
    icon: SquareIcon,
    getSize: (currentSize, modelSizes) => {
      if (!modelSizes || modelSizes.length === 0) return null;
      // Find the largest square size available
      const squareSizes = modelSizes.filter(size => {
        const [width, height] = size.split('x').map(Number);
        return width === height;
      });
      return squareSizes.length > 0 ? squareSizes[squareSizes.length - 1] : modelSizes[0];
    },
  },
  {
    type: 'widescreen',
    label: 'Widescreen (16:9)',
    icon: RectangleHorizontalIcon,
    getSize: (currentSize, modelSizes) => {
      if (!modelSizes || modelSizes.length === 0) return null;
      
      // Try to find an existing widescreen size
      const widescreenSizes = modelSizes.filter(size => {
        const [width, height] = size.split('x').map(Number);
        const ratio = width / height;
        // 16:9 ratio is approximately 1.777...
        return ratio > 1.5 && ratio < 2.0;
      });
      
      if (widescreenSizes.length > 0) {
        return widescreenSizes[0];
      }
      
      // If no widescreen size exists, calculate one based on the largest available size
      // Use 16:9 aspect ratio which Runware supports
      const maxSize = modelSizes.reduce((max, size) => {
        const [width, height] = size.split('x').map(Number);
        const maxPixels = max.split('x').map(Number).reduce((a, b) => a * b);
        const currentPixels = width * height;
        return currentPixels > maxPixels ? size : max;
      });
      
      const [maxWidth, maxHeight] = maxSize.split('x').map(Number);
      const maxDimension = Math.max(maxWidth, maxHeight);
      
      // Calculate 16:9 dimensions (Runware supports flexible aspect ratios)
      // For 16:9, height = width * 9/16
      if (maxDimension >= 1536) {
        const width = 1536;
        const height = Math.floor(width * 9 / 16);
        return `${width}x${height}`; // 1536x864
      } else if (maxDimension >= 1024) {
        const width = 1024;
        const height = Math.floor(width * 9 / 16);
        return `${width}x${height}`; // 1024x576
      } else {
        const width = 512;
        const height = Math.floor(width * 9 / 16);
        return `${width}x${height}`; // 512x288
      }
    },
  },
  {
    type: 'portrait',
    label: 'Portrait (9:16)',
    icon: RectangleVerticalIcon,
    getSize: (currentSize, modelSizes) => {
      if (!modelSizes || modelSizes.length === 0) return null;
      
      // Try to find an existing portrait size
      const portraitSizes = modelSizes.filter(size => {
        const [width, height] = size.split('x').map(Number);
        const ratio = width / height;
        // 9:16 ratio is approximately 0.5625
        return ratio < 0.7 && ratio > 0.4;
      });
      
      if (portraitSizes.length > 0) {
        return portraitSizes[0];
      }
      
      // If no portrait size exists, calculate one based on the largest available size
      // Use 9:16 aspect ratio which Runware supports
      const maxSize = modelSizes.reduce((max, size) => {
        const [width, height] = size.split('x').map(Number);
        const maxPixels = max.split('x').map(Number).reduce((a, b) => a * b);
        const currentPixels = width * height;
        return currentPixels > maxPixels ? size : max;
      });
      
      const [maxWidth, maxHeight] = maxSize.split('x').map(Number);
      const maxDimension = Math.max(maxWidth, maxHeight);
      
      // Calculate 9:16 dimensions (Runware supports flexible aspect ratios)
      // For 9:16, width = height * 9/16
      if (maxDimension >= 1536) {
        const height = 1536;
        const width = Math.floor(height * 9 / 16);
        return `${width}x${height}`; // 864x1536
      } else if (maxDimension >= 1024) {
        const height = 1024;
        const width = Math.floor(height * 9 / 16);
        return `${width}x${height}`; // 576x1024
      } else {
        const height = 512;
        const width = Math.floor(height * 9 / 16);
        return `${width}x${height}`; // 288x512
      }
    },
  },
];

type FormatSelectorProps = {
  nodeId: string;
  imageUrl: string;
  imageType: string;
  modelId: string;
  currentSize?: string;
  projectId: string;
};

export const FormatSelector = ({
  nodeId,
  imageUrl,
  imageType,
  modelId,
  currentSize,
  projectId,
}: FormatSelectorProps) => {
  const { getNode, addEdges, updateNode, updateNodeData } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [loadingFormat, setLoadingFormat] = useState<FormatType | null>(null);
  
  const model = imageModels[modelId];
  const modelSizes = model?.sizes;

  const handleCreateFormat = useCallback(
    async (format: FormatConfig) => {
      const currentNode = getNode(nodeId);
      if (!currentNode || !projectId) return;

      const newSize = format.getSize(currentSize, modelSizes);
      
      if (!newSize) {
        toast.error(`Format "${format.label}" is not available for this model`);
        return;
      }

      // Check if the new size is the same as current size
      if (newSize === currentSize) {
        toast.info(`Image is already in ${format.label} format`);
        return;
      }

      setLoadingFormat(format.type);

      try {
        // Create new image node positioned to the right of current node
        const newNodeId = addNode('image', {
          position: {
            x: currentNode.position.x + (currentNode.measured?.width ?? 400) + 100,
            y: currentNode.position.y,
          },
          data: {
            model: modelId,
            size: newSize,
            instructions: `Generate in ${format.label} format`,
          },
          selected: true,
        });

        // Connect the current node to the new node
        addEdges({
          id: `edge-${nodeId}-${newNodeId}`,
          source: nodeId,
          target: newNodeId,
          type: 'animated',
        });

        // Update current node to be unselected
        updateNode(nodeId, { selected: false });

        // Wait for the debounced save to complete (1000ms debounce + buffer)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Create format-specific instructions to extend the image content
        let formatInstructions = '';
        if (format.type === 'widescreen') {
          formatInstructions = `Extend this image to widescreen (16:9) format. Expand the image content horizontally to fill the entire frame, maintaining the original subject and composition. Add appropriate background elements or extend the existing background naturally to fill the widescreen aspect ratio.`;
        } else if (format.type === 'portrait') {
          formatInstructions = `Extend this image to portrait (9:16) format. Expand the image content vertically to fill the entire frame, maintaining the original subject and composition. Add appropriate background elements or extend the existing background naturally to fill the portrait aspect ratio.`;
        } else if (format.type === 'square') {
          formatInstructions = `Convert this image to square format. Adjust the composition to fit a square aspect ratio while maintaining the original subject. Extend or crop the background as needed to create a balanced square composition.`;
        }

        // Automatically generate the image in the new format
        const response = await editImageAction({
          images: [
            {
              url: imageUrl,
              type: imageType,
            },
          ],
          instructions: formatInstructions,
          nodeId: newNodeId,
          projectId,
          modelId,
          size: newSize,
        });

        if ('error' in response) {
          throw new Error(response.error);
        }

        // Update the new node with the generated image
        updateNodeData(newNodeId, response.nodeData);

        toast.success(`${format.label} format generated`);

        setTimeout(() => mutate('credits'), 5000);
      } catch (error) {
        handleError(`Error generating ${format.label.toLowerCase()} format`, error);
      } finally {
        setLoadingFormat(null);
      }
    },
    [nodeId, imageUrl, imageType, modelId, currentSize, projectId, modelSizes, getNode, addNode, addEdges, updateNode, updateNodeData]
  );

  // Filter formats to only show available ones
  const availableFormats = formats.filter(format => {
    const size = format.getSize(currentSize, modelSizes);
    return size !== null;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <RectangleHorizontalIcon size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Formats</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableFormats.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-sm">No formats available</span>
          </DropdownMenuItem>
        ) : (
          availableFormats.map((format) => {
          const Icon = format.icon;
          const isLoading = loadingFormat === format.type;
          const newSize = format.getSize(currentSize, modelSizes);
          
          return (
            <DropdownMenuItem
              key={format.type}
              onClick={() => handleCreateFormat(format)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2Icon size={14} className="shrink-0 animate-spin" />
              ) : (
                <Icon size={14} className="shrink-0" />
              )}
              <span className="flex-1">{format.label}</span>
              {newSize && (
                <span className="text-muted-foreground text-xs ml-2">
                  {newSize}
                </span>
              )}
            </DropdownMenuItem>
          );
        })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

