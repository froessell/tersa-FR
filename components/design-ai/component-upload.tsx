"use client";

import { useState } from 'react';
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
import { PlusIcon, XIcon, ImageIcon } from 'lucide-react';
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

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: {
      name: editingComponent?.name || '',
      description: editingComponent?.description || '',
      category: editingComponent?.category || 'Other',
      tags: editingComponent?.tags.join(', ') || '',
    },
  });

  const handleImageDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

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

      const component: Component = {
        id: editingComponent?.id || nanoid(),
        name: data.name,
        description: data.description,
        category: data.category,
        tags: tags,
        imageUrl,
        createdAt: editingComponent?.createdAt || now,
        updatedAt: now,
      };

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
                          </div>
                        </DropzoneEmptyState>
                        <DropzoneContent>
                          {imagePreview && (
                            <div className="flex flex-col items-center">
                              <img 
                                src={imagePreview} 
                                alt="Component preview" 
                                className="max-h-32 rounded-md object-contain"
                              />
                              <p className="mt-2 text-muted-foreground text-xs">
                                Click or drag to replace image
                              </p>
                            </div>
                          )}
                        </DropzoneContent>
                      </Dropzone>
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
