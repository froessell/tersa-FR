"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/kibo-ui/dropzone';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, XIcon, ImageIcon, ClipboardIcon } from 'lucide-react';
import { Component, ComponentFormData, COMPONENT_CATEGORIES } from '@/lib/types';
import { saveComponent, convertFileToDataURL, validateImageFile, isComponentNameUnique } from '@/lib/storage';

const componentFormSchema = z.object({
  name: z.string()
    .min(1, 'Component name is required')
    .max(50, 'Component name must be less than 50 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  category: z.enum(['Layout', 'Navigation', 'Content', 'Forms', 'E-commerce', 'Other'] as const),
  tags: z.string().optional(),
  imageFile: z.instanceof(File, { message: 'Please upload an image file' }),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

interface ComponentUploadProps {
  onComponentAdded?: (component: Component) => void;
  editingComponent?: Component | null;
  onEditComplete?: () => void;
}

export function ComponentUpload({ onComponentAdded, editingComponent, onEditComplete }: ComponentUploadProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    editingComponent?.imageUrl || null
  );
  const [tags, setTags] = useState<string[]>(editingComponent?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: editingComponent?.name || '',
      description: editingComponent?.description || '',
      category: editingComponent?.category || 'Other',
      tags: editingComponent?.tags.join(', ') || '',
    },
  });

  const processImageFile = async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      const dataUrl = await convertFileToDataURL(file);
      setImagePreview(dataUrl);
      form.setValue('imageFile', file);
      form.clearErrors('imageFile');
    } catch (error) {
      toast.error('Failed to process image');
      console.error('Image processing error:', error);
    }
  };

  const handleImageDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await processImageFile(file);
  };

  const handleClipboardPaste = useCallback(async () => {
    setIsPasting(true);
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        
        if (imageTypes.length === 0) {
          toast.error('No image found in clipboard');
          continue;
        }

        const imageType = imageTypes[0];
        const blob = await clipboardItem.getType(imageType);
        
        // Convert blob to file
        const file = new File([blob], `clipboard-image.${imageType.split('/')[1]}`, {
          type: imageType,
        });

        await processImageFile(file);
        toast.success('Image pasted from clipboard!');
        break;
      }
    } catch (error) {
      console.error('Clipboard paste error:', error);
      toast.error('Failed to paste image from clipboard. Make sure you have copied an image.');
    } finally {
      setIsPasting(false);
    }
  }, [form]);

  // Add keyboard shortcut for paste (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && (open || !!editingComponent)) {
        event.preventDefault();
        handleClipboardPaste();
      }
    };

    if (open || !!editingComponent) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, editingComponent, handleClipboardPaste]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput('');
      form.setValue('tags', newTags.join(', '));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue('tags', newTags.join(', '));
  };

  const onSubmit = async (data: ComponentFormValues) => {
    setIsSubmitting(true);

    try {
      // Validate unique name (except for current component when editing)
      if (!isComponentNameUnique(data.name, editingComponent?.id)) {
        form.setError('name', { message: 'A component with this name already exists' });
        setIsSubmitting(false);
        return;
      }

      const imageUrl = await convertFileToDataURL(data.imageFile);
      const now = new Date();

      // Create base component
      let component: Component = {
        id: editingComponent?.id || nanoid(),
        name: data.name,
        description: data.description,
        category: data.category,
        tags: tags,
        imageUrl,
        generatedCode: editingComponent?.generatedCode,
        codeExplanation: editingComponent?.codeExplanation,
        createdAt: editingComponent?.createdAt || now,
        updatedAt: now,
      };

      // Generate React code for new components or when image changes
      if (!editingComponent || imageUrl !== editingComponent.imageUrl) {
        try {
          toast.info('Analyzing component and generating React code...');
          
          const response = await fetch('/api/design-ai/analyze-component', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl,
              name: data.name,
              description: data.description,
              category: data.category,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            component.generatedCode = result.generatedCode;
            component.codeExplanation = result.explanation;
            toast.success('React code generated successfully!');
          } else {
            toast.warning('Component saved, but code generation failed. You can try regenerating later.');
          }
        } catch (codeGenError) {
          console.error('Code generation error:', codeGenError);
          toast.warning('Component saved, but code generation failed. You can try regenerating later.');
        }
      }

      saveComponent(component);
      
      toast.success(editingComponent ? 'Component updated successfully!' : 'Component added successfully!');
      
      onComponentAdded?.(component);
      onEditComplete?.();
      
      // Reset form
      form.reset();
      setImagePreview(null);
      setTags([]);
      setTagInput('');
      setOpen(false);
      
    } catch (error) {
      toast.error('Failed to save component');
      console.error('Component save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setImagePreview(editingComponent?.imageUrl || null);
    setTags(editingComponent?.tags || []);
    setTagInput('');
    setOpen(false);
    onEditComplete?.();
  };

  return (
    <Dialog open={open || !!editingComponent} onOpenChange={editingComponent ? () => onEditComplete?.() : setOpen}>
      <DialogTrigger asChild>
        {!editingComponent && (
          <Button>
            <PlusIcon className="size-4" />
            Add Component
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingComponent ? 'Edit Component' : 'Add New Component'}
          </DialogTitle>
          <DialogDescription>
            {editingComponent 
              ? 'Update your component details and screenshot.' 
              : 'Upload a screenshot of your component and provide details to add it to your library.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload */}
            <FormField
              control={form.control}
              name="imageFile"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Component Screenshot</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Image Preview - Always visible when image exists */}
                      {imagePreview && (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                          <div className="flex flex-col items-center space-y-3">
                            <img 
                              src={imagePreview} 
                              alt="Component preview" 
                              className="max-h-48 max-w-full rounded-md object-contain shadow-sm"
                            />
                            <div className="flex flex-col items-center space-y-2">
                              <p className="text-sm font-medium text-center">
                                Component Screenshot Preview
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) handleImageDrop([file]);
                                    };
                                    input.click();
                                  }}
                                  className="gap-2"
                                >
                                  <ImageIcon size={14} />
                                  Replace
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleClipboardPaste}
                                  disabled={isPasting}
                                  className="gap-2"
                                >
                                  <ClipboardIcon size={14} />
                                  {isPasting ? 'Pasting...' : 'Paste New'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Upload Area - Only show when no image */}
                      {!imagePreview && (
                        <div className="space-y-3">
                          <Dropzone
                            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                            maxFiles={1}
                            maxSize={5 * 1024 * 1024} // 5MB
                            onDrop={handleImageDrop}
                            className="h-48"
                          >
                            <DropzoneEmptyState>
                              <div className="flex flex-col items-center justify-center">
                                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                  <ImageIcon size={16} />
                                </div>
                                <p className="my-2 font-medium text-sm">
                                  Upload component screenshot
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  PNG, JPG, WebP up to 5MB
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                  <div className="h-px bg-border flex-1" />
                                  <span className="text-muted-foreground text-xs">or</span>
                                  <div className="h-px bg-border flex-1" />
                                </div>
                              </div>
                            </DropzoneEmptyState>
                          </Dropzone>
                          
                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleClipboardPaste}
                              disabled={isPasting}
                              className="gap-2"
                            >
                              <ClipboardIcon size={14} />
                              {isPasting ? 'Pasting...' : 'Paste from Clipboard'}
                            </Button>
                          </div>
                          
                          <p className="text-center text-muted-foreground text-xs">
                            💡 Tip: Copy an image from Figma and paste it here with <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Ctrl+V</kbd> or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘+V</kbd>
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Component Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Component Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Primary Button" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique, descriptive name for your component
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this component does, its variants, and when to use it..."
                      className="min-h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed description to help AI understand how to use this component
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPONENT_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the category that best fits this component
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-destructive"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FormDescription>
                Optional tags to help with searching and filtering (press Enter or click Add)
              </FormDescription>
            </FormItem>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingComponent ? 'Update Component' : 'Add Component'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
