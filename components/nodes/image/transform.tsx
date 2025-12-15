import { generateImageAction } from '@/app/actions/image/create';
import { editImageAction } from '@/app/actions/image/edit';
import { NodeLayout } from '@/components/nodes/layout';
import { ModelSelector } from '@/components/nodes/model-selector';
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
  BoxIcon,
  CameraIcon,
  ClockIcon,
  ColumnsIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PaletteIcon,
  PlayIcon,
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  RotateCcwIcon,
  SparklesIcon,
  SquareIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

    // Add model selector
    items.push({
      children: (
        <ModelSelector
          value={modelId}
          options={imageModels}
          key={id}
          className="w-[150px] rounded-full"
          onChange={(value) => updateNodeData(id, { model: value })}
        />
      ),
    });

    // Add size selector if available
    if (selectedModel?.sizes?.length) {
      items.push({
        children: (
          <ImageSizeSelector
            value={size ?? ''}
            options={selectedModel?.sizes ?? []}
            id={id}
            className="w-[120px] rounded-full"
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

    // Add more options dropdown if image is generated
    if (data.generated && project?.id) {
      const handleVariationsClick = async (variationType: 'camera-angles' | 'narrative' | 'environment' | 'artistic-style') => {
        const variations = {
          'camera-angles': 'Using the provided input image as the base reference, create 9 variations with different camera angles and perspectives arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the camera angle and perspective.',
          'narrative': 'Using the provided input image as the base reference, create 9 variations with different narrative elements and storytelling aspects arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the narrative elements.',
          'environment': 'Using the provided input image as the base reference, create 9 variations with different environments and settings arranged in a 3x3 grid. Keep the exact same subject and person from the input image. Only change the environment and setting.',
          'artistic-style': 'Using the provided input image as the base reference, create 9 variations with different artistic styles and visual aesthetics arranged in a 3x3 grid. Keep the exact same subject, person, and scene from the input image. Only change the artistic style.',
        };
        
        const currentNode = getNode(id);
        if (!currentNode || !project?.id) return;

        // Read the current model from the node data to ensure we use the latest selection
        const currentModelId = (currentNode.data?.model as string) ?? modelId ?? getDefaultModel(imageModels);
        const currentSize = currentNode.data?.size as string | undefined ?? size;

        try {
          const newNodeId = addNode('image', {
            position: {
              x: currentNode.position.x + (currentNode.measured?.width ?? 400) + 100,
              y: currentNode.position.y,
            },
            data: {
              model: currentModelId,
              size: currentSize,
              instructions: variations[variationType],
            },
            selected: true,
          });

          addEdges({
            id: `edge-${id}-${newNodeId}`,
            source: id,
            target: newNodeId,
            type: 'animated',
          });

          updateNode(id, { selected: false });

          await new Promise((resolve) => setTimeout(resolve, 1500));

          const response = await editImageAction({
            images: [
              {
                url: data.generated.url,
                type: data.generated.type,
              },
            ],
            instructions: variations[variationType],
            nodeId: newNodeId,
            projectId: project.id,
            modelId: currentModelId,
            size: currentSize,
          });

          if ('error' in response) {
            throw new Error(response.error);
          }

          updateNodeData(newNodeId, response.nodeData);
          toast.success('Variation created');
          setTimeout(() => mutate('credits'), 5000);
        } catch (error) {
          handleError('Error creating variation', error);
        }
      };

      const handleFormatClick = async (formatType: 'square' | 'widescreen' | 'portrait') => {
        const model = imageModels[modelId];
        const modelSizes = model?.sizes;
        
        const formatConfigs = {
          square: {
            getSize: (currentSize: string | undefined, modelSizes: string[] | undefined) => {
              if (!modelSizes || modelSizes.length === 0) return null;
              const squareSizes = modelSizes.filter(size => {
                const [width, height] = size.split('x').map(Number);
                return width === height;
              });
              return squareSizes.length > 0 ? squareSizes[squareSizes.length - 1] : modelSizes[0];
            },
            instructions: 'Convert this image to square format. Adjust the composition to fit a square aspect ratio while maintaining the original subject. Extend or crop the background as needed to create a balanced square composition.',
          },
          widescreen: {
            getSize: (currentSize: string | undefined, modelSizes: string[] | undefined) => {
              if (!modelSizes || modelSizes.length === 0) return null;
              const widescreenSizes = modelSizes.filter(size => {
                const [width, height] = size.split('x').map(Number);
                const ratio = width / height;
                return ratio > 1.5 && ratio < 2.0;
              });
              if (widescreenSizes.length > 0) return widescreenSizes[0];
              const maxSize = modelSizes.reduce((max, size) => {
                const [width, height] = size.split('x').map(Number);
                const maxPixels = max.split('x').map(Number).reduce((a, b) => a * b);
                const currentPixels = width * height;
                return currentPixels > maxPixels ? size : max;
              });
              const [maxWidth, maxHeight] = maxSize.split('x').map(Number);
              const maxDimension = Math.max(maxWidth, maxHeight);
              if (maxDimension >= 1536) return '1536x864';
              if (maxDimension >= 1024) return '1024x576';
              return '512x288';
            },
            instructions: 'Extend this image to widescreen (16:9) format. Expand the image content horizontally to fill the entire frame, maintaining the original subject and composition. Add appropriate background elements or extend the existing background naturally to fill the widescreen aspect ratio.',
          },
          portrait: {
            getSize: (currentSize: string | undefined, modelSizes: string[] | undefined) => {
              if (!modelSizes || modelSizes.length === 0) return null;
              const portraitSizes = modelSizes.filter(size => {
                const [width, height] = size.split('x').map(Number);
                const ratio = width / height;
                return ratio < 0.7 && ratio > 0.4;
              });
              if (portraitSizes.length > 0) return portraitSizes[0];
              const maxSize = modelSizes.reduce((max, size) => {
                const [width, height] = size.split('x').map(Number);
                const maxPixels = max.split('x').map(Number).reduce((a, b) => a * b);
                const currentPixels = width * height;
                return currentPixels > maxPixels ? size : max;
              });
              const [maxWidth, maxHeight] = maxSize.split('x').map(Number);
              const maxDimension = Math.max(maxWidth, maxHeight);
              if (maxDimension >= 1536) return '864x1536';
              if (maxDimension >= 1024) return '576x1024';
              return '288x512';
            },
            instructions: 'Extend this image to portrait (9:16) format. Expand the image content vertically to fill the entire frame, maintaining the original subject and composition. Add appropriate background elements or extend the existing background naturally to fill the portrait aspect ratio.',
          },
        };

        const format = formatConfigs[formatType];
        const newSize = format.getSize(size, modelSizes);
        
        if (!newSize) {
          toast.error(`Format "${formatType}" is not available for this model`);
          return;
        }

        if (newSize === size) {
          toast.info(`Image is already in ${formatType} format`);
          return;
        }

        const currentNode = getNode(id);
        if (!currentNode || !project?.id) return;

        try {
          const newNodeId = addNode('image', {
            position: {
              x: currentNode.position.x + (currentNode.measured?.width ?? 400) + 100,
              y: currentNode.position.y,
            },
            data: {
              model: modelId,
              size: newSize,
              instructions: `Generate in ${formatType} format`,
            },
            selected: true,
          });

          addEdges({
            id: `edge-${id}-${newNodeId}`,
            source: id,
            target: newNodeId,
            type: 'animated',
          });

          updateNode(id, { selected: false });

          await new Promise((resolve) => setTimeout(resolve, 1500));

          const response = await editImageAction({
            images: [
              {
                url: data.generated.url,
                type: data.generated.type,
              },
            ],
            instructions: format.instructions,
            nodeId: newNodeId,
            projectId: project.id,
            modelId,
            size: newSize,
          });

          if ('error' in response) {
            throw new Error(response.error);
          }

          updateNodeData(newNodeId, response.nodeData);
          toast.success(`${formatType} format generated`);
          setTimeout(() => mutate('credits'), 5000);
        } catch (error) {
          handleError(`Error generating ${formatType} format`, error);
        }
      };

      items.push({
        children: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontalIcon size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {selectedModel?.supportsEdit && (
                <>
                  <DropdownMenuLabel>Variations</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleVariationsClick('camera-angles')}>
                    <CameraIcon size={14} className="shrink-0 text-blue-500" />
                    <span>Camera Angles</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleVariationsClick('narrative')}>
                    <SparklesIcon size={14} className="shrink-0 text-pink-500" />
                    <span>Narrative</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleVariationsClick('environment')}>
                    <BoxIcon size={14} className="shrink-0 text-green-500" />
                    <span>Environment</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleVariationsClick('artistic-style')}>
                    <PaletteIcon size={14} className="shrink-0 text-red-500" />
                    <span>Artistic Style</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Formats</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleFormatClick('square')}>
                    <SquareIcon size={14} className="shrink-0" />
                    <span>Square</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFormatClick('widescreen')}>
                    <RectangleHorizontalIcon size={14} className="shrink-0" />
                    <span>Widescreen (16:9)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFormatClick('portrait')}>
                    <RectangleVerticalIcon size={14} className="shrink-0" />
                    <span>Portrait (9:16)</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleSplit}
                disabled={splitting}
              >
                {splitting ? (
                  <Loader2Icon size={14} className="shrink-0 animate-spin" />
                ) : (
                  <ColumnsIcon size={14} className="shrink-0" />
                )}
                <span>Split into 9 images</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => download(data.generated, id, 'png')}
              >
                <DownloadIcon size={14} className="shrink-0" />
                <span>Download</span>
              </DropdownMenuItem>
              {data.updatedAt && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <ClockIcon size={14} className="shrink-0" />
                    <span className="text-muted-foreground text-xs">
                      {new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(data.updatedAt))}
                    </span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
    getNode,
    addNode,
    addEdges,
    updateNode,
    imageModels,
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
