import { generateImageAction } from '@/app/actions/image/create';
import { editImageAction } from '@/app/actions/image/edit';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAnalytics } from '@/hooks/use-analytics';
import { download } from '@/lib/download';
import { handleError } from '@/lib/error/handle';
import { dataURLtoFile, splitGridImage } from '@/lib/image-split';
import { imageModels } from '@/lib/models/image';
import { uploadFile } from '@/lib/upload';
import { getImagesFromImageNodes, getTextFromTextNodes } from '@/lib/xyflow';
import { useNodeOperations } from '@/providers/node-operations';
import { useProject } from '@/providers/project';
import { getIncomers, useReactFlow } from '@xyflow/react';
import {
  ClockIcon,
  ColumnsIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
} from 'lucide-react';
import Image from 'next/image';
import {
  type ChangeEventHandler,
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import { mutate } from 'swr';
import type { ImageNodeProps } from '.';
import { ImageSizeSelector } from './image-size-selector';
import { VariationsDropdown } from './variations-dropdown';
import { FormatSelector } from './format-selector';

type ImageTransformProps = ImageNodeProps & {
  title: string;
};

const getDefaultModel = (models: typeof imageModels) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    throw new Error('No default model found');
  }

  return defaultModel[0];
};

export const ImageTransform = ({
  data,
  id,
  type,
  title,
}: ImageTransformProps) => {
  const { updateNodeData, getNodes, getEdges, getNode, addEdges, updateNode } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [loading, setLoading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const project = useProject();
  const hasIncomingImageNodes =
    getImagesFromImageNodes(getIncomers({ id }, getNodes(), getEdges()))
      .length > 0;
  const modelId = data.model ?? getDefaultModel(imageModels);
  const analytics = useAnalytics();
  const selectedModel = imageModels[modelId];
  const size = data.size ?? selectedModel?.sizes?.at(0);
  const node = getNode(id);
  const isSelected = node?.selected ?? false;
  const hasGeneratedImage = !!data.generated?.url;

  const handleGenerate = useCallback(async () => {
    if (loading || !project?.id) {
      return;
    }

    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textNodes = getTextFromTextNodes(incomers);
    const imageNodes = getImagesFromImageNodes(incomers);

    try {
      if (!textNodes.length && !imageNodes.length) {
        throw new Error('No input provided');
      }

      setLoading(true);

      analytics.track('canvas', 'node', 'generate', {
        type,
        textPromptsLength: textNodes.length,
        imagePromptsLength: imageNodes.length,
        model: modelId,
        instructionsLength: data.instructions?.length ?? 0,
      });

      const response = imageNodes.length
        ? await editImageAction({
            images: imageNodes,
            instructions: data.instructions,
            nodeId: id,
            projectId: project.id,
            modelId,
            size,
          })
        : await generateImageAction({
            prompt: textNodes.join('\n'),
            modelId,
            instructions: data.instructions,
            projectId: project.id,
            nodeId: id,
            size,
          });

      if ('error' in response) {
        throw new Error(response.error);
      }

      updateNodeData(id, response.nodeData);

      toast.success('Image generated successfully');

      setTimeout(() => mutate('credits'), 5000);
    } catch (error) {
      handleError('Error generating image', error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    project?.id,
    size,
    id,
    analytics,
    type,
    data.instructions,
    getEdges,
    modelId,
    getNodes,
    updateNodeData,
  ]);

  const handleInstructionsChange: ChangeEventHandler<HTMLTextAreaElement> = (
    event
  ) => updateNodeData(id, { instructions: event.target.value });

  const handleSplit = useCallback(async () => {
    if (!data.generated?.url || !project?.id || splitting) {
      return;
    }

    setSplitting(true);

    try {
      const currentNode = getNode(id);
      if (!currentNode) {
        throw new Error('Node not found');
      }

      // Split the grid image into 9 individual images
      const splitImages = await splitGridImage(data.generated.url);

      // Upload each split image and create a new node
      const nodeWidth = currentNode.measured?.width ?? 400;
      const nodeHeight = currentNode.measured?.height ?? 400;
      const spacing = 60;
      const cols = 3;
      const startX = currentNode.position.x + nodeWidth + spacing;
      const startY = currentNode.position.y - (nodeHeight * 1.2);

      const newNodeIds: string[] = [];

      for (let i = 0; i < splitImages.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        // Convert data URL to File
        const file = dataURLtoFile(splitImages[i], `split-${i + 1}.png`);
        
        // Upload the file
        const uploaded = await uploadFile(file, 'files');
        
        // Create new image node with the split image
        const newNodeId = addNode('image', {
          position: {
            x: startX + col * (nodeWidth + spacing),
            y: startY + row * (nodeHeight + spacing),
          },
          data: {
            model: modelId,
            size,
            generated: {
              url: uploaded.url,
              type: uploaded.type,
            },
            updatedAt: new Date().toISOString(),
          },
          selected: false,
        });

        newNodeIds.push(newNodeId);

        // Connect the current node to each new node
        addEdges({
          id: `edge-${id}-${newNodeId}`,
          source: id,
          target: newNodeId,
          type: 'animated',
        });
      }

      // Unselect current node
      updateNode(id, { selected: false });

      toast.success(`Split into ${splitImages.length} individual images`);
    } catch (error) {
      handleError('Error splitting image', error);
    } finally {
      setSplitting(false);
    }
  }, [data.generated, project?.id, splitting, id, getNode, addNode, addEdges, updateNode, modelId, size]);

  const toolbar = useMemo<ComponentProps<typeof NodeLayout>['toolbar']>(() => {
    const items: ComponentProps<typeof NodeLayout>['toolbar'] = [];

    // Add size selector if available
    if (selectedModel?.sizes?.length) {
      items.push({
        children: (
          <ImageSizeSelector
            value={size ?? ''}
            options={selectedModel?.sizes ?? []}
            id={id}
            className="w-[200px] rounded-full"
            onChange={(value) => updateNodeData(id, { size: value })}
          />
        ),
      });
    }

    // Add generate/regenerate button
    items.push(
      loading
        ? {
            tooltip: 'Generating...',
            children: (
              <Button size="icon" className="rounded-full" disabled>
                <Loader2Icon className="animate-spin" size={12} />
              </Button>
            ),
          }
        : {
            tooltip: data.generated?.url ? 'Regenerate' : 'Generate',
            children: (
              <Button
                size="icon"
                className="rounded-full"
                onClick={handleGenerate}
                disabled={loading || !project?.id}
              >
                {data.generated?.url ? (
                  <RotateCcwIcon size={12} />
                ) : (
                  <PlayIcon size={12} />
                )}
              </Button>
            ),
          }
    );

    if (data.generated && project?.id) {
      if (selectedModel?.supportsEdit) {
        items.push({
          tooltip: 'Variations',
          children: (
            <VariationsDropdown
              nodeId={id}
              imageUrl={data.generated.url}
              imageType={data.generated.type}
              modelId={modelId}
              size={size}
              projectId={project.id}
            />
          ),
        });

        items.push({
          tooltip: 'Formats',
          children: (
            <FormatSelector
              nodeId={id}
              imageUrl={data.generated.url}
              imageType={data.generated.type}
              modelId={modelId}
              currentSize={size}
              projectId={project.id}
            />
          ),
        });
      }

      items.push({
        tooltip: splitting ? 'Splitting...' : 'Split into 9 images',
        children: (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={handleSplit}
            disabled={splitting}
          >
            {splitting ? (
              <Loader2Icon size={12} className="animate-spin" />
            ) : (
              <ColumnsIcon size={12} />
            )}
          </Button>
        ),
      });

      items.push({
        tooltip: 'Download',
        children: (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => download(data.generated, id, 'png')}
          >
            <DownloadIcon size={12} />
          </Button>
        ),
      });
    }

    if (data.updatedAt) {
      items.push({
        tooltip: `Last updated: ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(new Date(data.updatedAt))}`,
        children: (
          <Button size="icon" variant="ghost" className="rounded-full">
            <ClockIcon size={12} />
          </Button>
        ),
      });
    }

    return items;
  }, [
    id,
    updateNodeData,
    selectedModel?.sizes,
    selectedModel?.supportsEdit,
    size,
    loading,
    data.generated,
    data.updatedAt,
    handleGenerate,
    project,
    modelId,
    splitting,
    handleSplit,
  ]);

  const aspectRatio = useMemo(() => {
    if (!data.size) {
      return '1/1';
    }

    const [width, height] = data.size.split('x').map(Number);
    return `${width}/${height}`;
  }, [data.size]);

  return (
    <>
      <NodeLayout id={id} data={data} type={type} title={title} toolbar={toolbar}>
        {loading && (
          <Skeleton
            className="flex w-full animate-pulse items-center justify-center rounded-b-xl"
            style={{ aspectRatio }}
          >
            <Loader2Icon
              size={16}
              className="size-4 animate-spin text-muted-foreground"
            />
          </Skeleton>
        )}
        {!loading && !data.generated?.url && (
          <div
            className="flex w-full items-center justify-center rounded-b-xl bg-secondary p-4"
            style={{ aspectRatio }}
          >
            <p className="text-muted-foreground text-sm">
              Press <PlayIcon size={12} className="-translate-y-px inline" /> to
              create an image
            </p>
          </div>
        )}
        {!loading && data.generated?.url && (
          <div className="relative">
            <Image
              src={data.generated.url}
              alt="Generated image"
              width={1000}
              height={1000}
              className="w-full rounded-b-xl object-cover"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-2 z-10 size-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={(e) => {
                e.stopPropagation();
                setShowImagePreview(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <EyeIcon size={16} />
            </Button>
          </div>
        )}
        <Textarea
          value={data.instructions ?? ''}
          onChange={handleInstructionsChange}
          placeholder="Enter instructions"
          className="shrink-0 resize-none rounded-none border-none bg-transparent! shadow-none focus-visible:ring-0"
        />
      </NodeLayout>
      {data.generated?.url && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <div className="relative flex items-center justify-center p-4">
              <Image
                src={data.generated.url}
                alt="Generated image preview"
                width={2000}
                height={2000}
                className="max-h-[90vh] w-auto object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
