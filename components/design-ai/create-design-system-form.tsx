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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FigmaIcon, 
  InfoIcon, 
  RefreshCwIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { CreateDesignSystemRequest } from '@/lib/types';

const createDesignSystemSchema = z.object({
  name: z.string()
    .min(1, 'Design system name is required')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  figmaFileKey: z.string()
    .min(1, 'Figma file key is required'),
  figmaAccessToken: z.string()
    .min(1, 'Figma access token is required'),
  isPublic: z.boolean().optional().default(false),
  includeThumbnails: z.boolean().optional().default(true),
  syncFrequency: z.enum(['manual', 'daily', 'weekly']).optional().default('manual'),
});

type CreateDesignSystemFormValues = z.infer<typeof createDesignSystemSchema>;

interface CreateDesignSystemFormProps {
  onSubmit: (data: CreateDesignSystemRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreateDesignSystemForm({ onSubmit, onCancel }: CreateDesignSystemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const form = useForm({
    resolver: zodResolver(createDesignSystemSchema),
    defaultValues: {
      name: '',
      description: '',
      figmaFileKey: '',
      figmaAccessToken: '',
      isPublic: false,
      includeThumbnails: true,
      syncFrequency: 'manual' as const,
    },
  });

  const extractFileKey = (url: string) => {
    // Extract file key from Figma URL
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : url;
  };

  const handleFileKeyChange = (value: string) => {
    const extracted = extractFileKey(value);
    form.setValue('figmaFileKey', extracted);
    setFileInfo(null);
    setValidationError(null);
  };

  const validateFigmaAccess = async () => {
    const fileKey = form.getValues('figmaFileKey');
    const accessToken = form.getValues('figmaAccessToken');
    
    if (!fileKey || !accessToken) {
      setValidationError('Both file key and access token are required');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    
    try {
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': accessToken,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFileInfo({
          name: data.name,
          lastModified: data.last_modified,
          componentCount: Object.keys(data.components || {}).length,
        });
        
        // Auto-populate name if empty
        if (!form.getValues('name')) {
          form.setValue('name', data.name);
        }
      } else {
        if (response.status === 403) {
          setValidationError('Access denied. Check your access token and file permissions.');
        } else if (response.status === 404) {
          setValidationError('File not found. Check your file key.');
        } else {
          setValidationError(`Figma API error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      setValidationError('Failed to connect to Figma API. Check your internet connection.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    
    try {
      const submitData: CreateDesignSystemRequest = {
        name: values.name,
        description: values.description || undefined,
        figmaFileKey: values.figmaFileKey,
        figmaAccessToken: values.figmaAccessToken,
        isPublic: values.isPublic,
        settings: {
          includeThumbnails: values.includeThumbnails,
          syncFrequency: values.syncFrequency,
        },
      };
      
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFigmaFile = () => {
    const fileKey = form.getValues('figmaFileKey');
    if (fileKey) {
      window.open(`https://www.figma.com/file/${fileKey}`, '_blank');
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
              Give your design system a name and description
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
            <CardTitle className="text-lg flex items-center gap-2">
              <FigmaIcon className="h-5 w-5 text-[#F24E1E]" />
              Figma Connection
            </CardTitle>
            <CardDescription>
              Connect to your Figma file to sync components
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="figmaFileKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Figma File Key or URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter Figma file key or paste Figma URL"
                      {...field}
                      onChange={(e) => handleFileKeyChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    You can find the file key in the URL when viewing your Figma file
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                        placeholder="Your Figma personal access token"
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
                    Get your token from{' '}
                    <a 
                      href="https://www.figma.com/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Figma Account Settings → Personal access tokens
                    </a>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={validateFigmaAccess}
                disabled={isValidating || !form.getValues('figmaFileKey') || !form.getValues('figmaAccessToken')}
                className="gap-2"
              >
                {isValidating ? (
                  <RefreshCwIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                Validate Access
              </Button>
              
              {form.getValues('figmaFileKey') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openFigmaFile}
                  className="gap-2"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  Open in Figma
                </Button>
              )}
            </div>
            
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
            
            {fileInfo && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="font-medium">Connection Successful!</span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-green-600">
                  <p><strong>File:</strong> {fileInfo.name}</p>
                  <p><strong>Components:</strong> {fileInfo.componentCount}</p>
                  <p><strong>Last Modified:</strong> {new Date(fileInfo.lastModified).toLocaleDateString()}</p>
                </div>
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

        {/* Help */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Getting Started:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Make sure your Figma file contains published components</li>
                  <li>• Your access token needs read access to the file</li>
                  <li>• Components will be automatically categorized and tagged</li>
                  <li>• You can sync again anytime to get updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !fileInfo}
          >
            {isSubmitting ? (
              <>
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Design System'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
