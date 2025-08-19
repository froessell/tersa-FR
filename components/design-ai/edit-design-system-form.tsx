"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCwIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { DesignSystem, UpdateDesignSystemRequest } from '@/lib/types';

const editDesignSystemSchema = z.object({
  name: z.string()
    .min(1, 'Design system name is required')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  figmaAccessToken: z.string()
    .min(1, 'Figma access token is required'),
  isPublic: z.boolean().optional().default(false),
  includeThumbnails: z.boolean().optional().default(true),
  syncFrequency: z.enum(['manual', 'daily', 'weekly']).optional().default('manual'),
});

type EditDesignSystemFormValues = z.infer<typeof editDesignSystemSchema>;

interface EditDesignSystemFormProps {
  designSystem: DesignSystem;
  onSubmit: (data: UpdateDesignSystemRequest) => Promise<void>;
  onCancel: () => void;
}

export function EditDesignSystemForm({ designSystem, onSubmit, onCancel }: EditDesignSystemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const form = useForm({
    resolver: zodResolver(editDesignSystemSchema),
    defaultValues: {
      name: designSystem.name,
      description: designSystem.description || '',
      figmaAccessToken: '', // Don't pre-fill for security
      isPublic: designSystem.isPublic,
      includeThumbnails: designSystem.settings?.includeThumbnails ?? true,
      syncFrequency: designSystem.settings?.syncFrequency ?? 'manual',
    },
  });

  const validateFigmaAccess = async () => {
    const accessToken = form.getValues('figmaAccessToken');
    
    if (!accessToken) {
      setValidationError('Access token is required');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationSuccess(false);
    
    try {
      const response = await fetch(`https://api.figma.com/v1/files/${designSystem.figmaFileKey}`, {
        headers: {
          'X-Figma-Token': accessToken,
        },
      });
      
      if (response.ok) {
        setValidationSuccess(true);
        setValidationError(null);
      } else {
        if (response.status === 403) {
          setValidationError('Access denied. Check your access token and file permissions.');
        } else if (response.status === 404) {
          setValidationError('File not found. The file may have been moved or deleted.');
        } else {
          setValidationError(`Figma API error: ${response.status} ${response.statusText}`);
        }
        setValidationSuccess(false);
      }
    } catch (error) {
      setValidationError('Failed to connect to Figma API. Check your internet connection.');
      setValidationSuccess(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    
    try {
      const updateData: UpdateDesignSystemRequest = {
        id: designSystem.id,
        name: values.name,
        description: values.description || undefined,
        figmaAccessToken: values.figmaAccessToken,
        isPublic: values.isPublic,
        settings: {
          includeThumbnails: values.includeThumbnails,
          syncFrequency: values.syncFrequency,
        },
      };
      
      await onSubmit(updateData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
            <CardDescription>
              Update your design system name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Design System Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Design System" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="A brief description of your design system..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This will help others understand what your design system contains
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Figma Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Figma Access Token</CardTitle>
            <CardDescription>
              Update your Figma access token if needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">File Information:</p>
                <p><strong>File:</strong> {designSystem.figmaFileName || 'Unknown'}</p>
                <p><strong>File Key:</strong> {designSystem.figmaFileKey}</p>
                {designSystem.lastSyncedAt && (
                  <p><strong>Last Synced:</strong> {new Date(designSystem.lastSyncedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="figmaAccessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Figma Access Token</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showToken ? "text" : "password"}
                        placeholder="Enter your Figma personal access token"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    For security, we don't store your previous token. Enter your current token.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={validateFigmaAccess}
              disabled={isValidating || !form.getValues('figmaAccessToken')}
              className="gap-2"
            >
              {isValidating ? (
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              Validate Access
            </Button>
            
            {/* Validation Results */}
            {validationError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Validation Failed</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{validationError}</p>
              </div>
            )}
            
            {validationSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Access Token Valid!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Successfully connected to your Figma file.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription>
              Configure how your design system behaves
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Design System</FormLabel>
                    <FormDescription>
                      Allow other users to discover and use your design system
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="includeThumbnails"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Include Thumbnails</FormLabel>
                    <FormDescription>
                      Download component thumbnails for visual previews (slower sync)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="syncFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sync Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sync frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Manual only</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How often to automatically sync components from Figma
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !validationSuccess}
          >
            {isSubmitting ? (
              <>
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Design System'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
