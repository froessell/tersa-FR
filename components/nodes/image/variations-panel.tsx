'use client';

import { editImageAction } from '@/app/actions/image/edit';
import { useNodeOperations } from '@/providers/node-operations';
import { Panel, useReactFlow } from '@xyflow/react';
import {
  CameraIcon,
  BoxIcon,
  PaletteIcon,
  SparklesIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { handleError } from '@/lib/error/handle';
import { toast } from 'sonner';
import { Loader2Icon } from 'lucide-react';
import { mutate } from 'swr';

type VariationType = 'camera-angles' | 'narrative' | 'environment' | 'artistic-style';

type VariationConfig = {
  type: VariationType;
  label: string;
  icon: typeof CameraIcon;
  color: string;
  prompt: string;
};

const variations: VariationConfig[] = [
  {
    type: 'camera-angles',
    label: 'Camera Angles',
    icon: CameraIcon,
    color: 'text-blue-500',
    prompt: 'Using the provided input image as the base reference, create 9 variations with different camera angles and perspectives arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the camera angle and perspective.',
  },
  {
    type: 'narrative',
    label: 'Narrative',
    icon: SparklesIcon,
    color: 'text-pink-500',
    prompt: 'Using the provided input image as the base reference, create 9 variations with different narrative elements and storytelling aspects arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the narrative elements.',
  },
  {
    type: 'environment',
    label: 'Environment',
    icon: BoxIcon,
    color: 'text-green-500',
    prompt: 'Using the provided input image as the base reference, create 9 variations with different environments and settings arranged in a 3x3 grid. Keep the exact same subject and person from the input image. Only change the environment and setting.',
  },
  {
    type: 'artistic-style',
    label: 'Artistic Style',
    icon: PaletteIcon,
    color: 'text-red-500',
    prompt: 'Using the provided input image as the base reference, create 9 variations with different artistic styles and visual aesthetics arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the artistic style.',
  },
];

type VariationsPanelProps = {
  nodeId: string;
  imageUrl: string;
  imageType: string;
  modelId: string;
  size?: string;
  projectId: string;
};

export const VariationsPanel = ({
  nodeId,
  imageUrl,
  imageType,
  modelId,
  size,
  projectId,
}: VariationsPanelProps) => {
  const { getNode, addEdges, updateNode, updateNodeData } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [loadingVariation, setLoadingVariation] = useState<VariationType | null>(null);

  const handleCreateVariation = useCallback(
    async (variation: VariationConfig) => {
      const currentNode = getNode(nodeId);
      if (!currentNode || !projectId) return;

      setLoadingVariation(variation.type);

      try {
        // Create new image node positioned to the right of current node
        const newNodeId = addNode('image', {
          position: {
            x: currentNode.position.x + (currentNode.measured?.width ?? 400) + 100,
            y: currentNode.position.y,
          },
          data: {
            model: modelId,
            size,
            instructions: variation.prompt,
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

        // Automatically generate the variation
        const response = await editImageAction({
          images: [
            {
              url: imageUrl,
              type: imageType,
            },
          ],
          instructions: variation.prompt,
          nodeId: newNodeId,
          projectId,
          modelId,
          size,
        });

        if ('error' in response) {
          throw new Error(response.error);
        }

        // Update the new node with the generated image
        updateNodeData(newNodeId, response.nodeData);

        toast.success(`${variation.label} variation created`);

        setTimeout(() => mutate('credits'), 5000);
      } catch (error) {
        handleError(`Error creating ${variation.label.toLowerCase()} variation`, error);
      } finally {
        setLoadingVariation(null);
      }
    },
    [nodeId, imageUrl, imageType, modelId, size, projectId, getNode, addNode, addEdges, updateNode, updateNodeData]
  );

  return (
    <Panel position="top-left" className="m-4">
      <div className="rounded-2xl border bg-card/90 p-3 backdrop-blur-sm shadow-lg">
        <div className="mb-2 text-xs font-semibold text-muted-foreground">
          Variations
        </div>
        <div className="flex flex-col gap-2">
          {variations.map((variation) => {
            const Icon = variation.icon;
            const isLoading = loadingVariation === variation.type;
            return (
              <Button
                key={variation.type}
                variant="ghost"
                size="sm"
                className="h-auto justify-start gap-2 px-3 py-2"
                onClick={() => handleCreateVariation(variation)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2Icon size={14} className="shrink-0 animate-spin" />
                ) : (
                  <Icon size={14} className={cn('shrink-0', variation.color)} />
                )}
                <span className="text-xs">{variation.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};

