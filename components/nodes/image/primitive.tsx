import { describeAction } from '@/app/actions/image/describe';
import { NodeLayout } from '@/components/nodes/layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { DropzoneEmptyState } from '@/components/ui/kibo-ui/dropzone';
import { DropzoneContent } from '@/components/ui/kibo-ui/dropzone';
import { Dropzone } from '@/components/ui/kibo-ui/dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { useProject } from '@/providers/project';
import { useReactFlow } from '@xyflow/react';
import { EyeIcon, Loader2Icon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { ImageNodeProps } from '.';

type ImagePrimitiveProps = ImageNodeProps & {
  title: string;
};

export const ImagePrimitive = ({
  data,
  id,
  type,
  title,
}: ImagePrimitiveProps) => {
  const { updateNodeData } = useReactFlow();
  const project = useProject();
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleDrop = async (files: File[]) => {
    if (isUploading || !project?.id) {
      return;
    }

    try {
      if (!files.length) {
        throw new Error('No file selected');
      }

      setIsUploading(true);
      setFiles(files);
      const [file] = files;
      const { url, type } = await uploadFile(file, 'files');

      updateNodeData(id, {
        content: {
          url,
          type,
        },
      });

      const description = await describeAction(url, project?.id);

      if ('error' in description) {
        throw new Error(description.error);
      }

      updateNodeData(id, {
        description: description.description,
      });
    } catch (error) {
      handleError('Error uploading image', error);
    } finally {
      setIsUploading(false);
    }
  };

  const imageToDisplay = data.content || data.generated;

  return (
    <>
      <NodeLayout id={id} data={data} type={type} title={title}>
        {isUploading && (
          <Skeleton className="flex aspect-video w-full animate-pulse items-center justify-center">
            <Loader2Icon
              size={16}
              className="size-4 animate-spin text-muted-foreground"
            />
          </Skeleton>
        )}
        {!isUploading && imageToDisplay && (
          <div className="relative">
            <Image
              src={imageToDisplay.url}
              alt="Image"
              width={data.width ?? 1000}
              height={data.height ?? 1000}
              className="h-auto w-full"
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
        {!isUploading && !imageToDisplay && (
          <Dropzone
            maxSize={1024 * 1024 * 10}
            minSize={1024}
            maxFiles={1}
            multiple={false}
            accept={{
              'image/*': [],
            }}
            onDrop={handleDrop}
            src={files}
            onError={console.error}
            className="rounded-none border-none bg-transparent p-0 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
          >
            <DropzoneEmptyState className="p-4" />
            <DropzoneContent />
          </Dropzone>
        )}
      </NodeLayout>
      {imageToDisplay && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
            <div className="relative flex items-center justify-center p-4">
              <Image
                src={imageToDisplay.url}
                alt="Image preview"
                width={data.width ?? 2000}
                height={data.height ?? 2000}
                className="max-h-[90vh] w-auto object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
