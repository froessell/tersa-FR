"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  PlusIcon, 
  SettingsIcon, 
  RefreshCwIcon, 
  TrashIcon, 
  ExternalLinkIcon,
  FigmaIcon,
  GlobeIcon,
  LockIcon,
  CalendarIcon,
  ComponentIcon,
  EditIcon,
  ShareIcon
} from 'lucide-react';
import { DesignSystem } from '@/lib/types';
import { CreateDesignSystemForm } from './create-design-system-form';
import { EditDesignSystemForm } from './edit-design-system-form';

interface DesignSystemManagerProps {
  onDesignSystemSelected?: (designSystem: DesignSystem) => void;
  selectedDesignSystemId?: string;
}

export function DesignSystemManager({ 
  onDesignSystemSelected, 
  selectedDesignSystemId 
}: DesignSystemManagerProps) {
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDesignSystem, setEditingDesignSystem] = useState<DesignSystem | null>(null);
  const [includePublic, setIncludePublic] = useState(false);

  const loadDesignSystems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/design-systems?includePublic=${includePublic}`);
      const data = await response.json();
      
      if (data.success) {
        setDesignSystems(data.designSystems);
      } else {
        toast.error('Failed to load design systems');
      }
    } catch (error) {
      console.error('Error loading design systems:', error);
      toast.error('Failed to load design systems');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDesignSystems();
  }, [includePublic]);

  const handleCreateDesignSystem = async (designSystemData: any) => {
    try {
      const response = await fetch('/api/design-systems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(designSystemData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowCreateForm(false);
        await loadDesignSystems();
        
        // Automatically select the new design system
        if (onDesignSystemSelected) {
          onDesignSystemSelected(data.designSystem);
        }
      } else {
        toast.error(data.error || 'Failed to create design system');
      }
    } catch (error) {
      console.error('Error creating design system:', error);
      toast.error('Failed to create design system');
    }
  };

  const handleUpdateDesignSystem = async (id: string, updateData: any) => {
    try {
      const response = await fetch(`/api/design-systems/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setEditingDesignSystem(null);
        await loadDesignSystems();
      } else {
        toast.error(data.error || 'Failed to update design system');
      }
    } catch (error) {
      console.error('Error updating design system:', error);
      toast.error('Failed to update design system');
    }
  };

  const handleSyncDesignSystem = async (id: string) => {
    setSyncingIds(prev => new Set([...prev, id]));
    
    try {
      const response = await fetch(`/api/design-systems/${id}/sync`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        await loadDesignSystems();
      } else {
        toast.error(data.error || 'Failed to sync design system');
      }
    } catch (error) {
      console.error('Error syncing design system:', error);
      toast.error('Failed to sync design system');
    } finally {
      setSyncingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteDesignSystem = async (id: string) => {
    try {
      const response = await fetch(`/api/design-systems/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        await loadDesignSystems();
      } else {
        toast.error(data.error || 'Failed to delete design system');
      }
    } catch (error) {
      console.error('Error deleting design system:', error);
      toast.error('Failed to delete design system');
    }
  };

  const openFigmaFile = (fileKey: string) => {
    window.open(`https://www.figma.com/file/${fileKey}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCwIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Design Systems</h2>
          <p className="text-muted-foreground">
            Manage your Figma design systems and sync components
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludePublic(!includePublic)}
          >
            {includePublic ? <LockIcon className="h-4 w-4 mr-2" /> : <GlobeIcon className="h-4 w-4 mr-2" />}
            {includePublic ? 'My Systems' : 'Include Public'}
          </Button>
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Design System
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Design System</DialogTitle>
                <DialogDescription>
                  Connect your Figma design system to automatically sync components
                </DialogDescription>
              </DialogHeader>
              <CreateDesignSystemForm
                onSubmit={handleCreateDesignSystem}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Design Systems Grid */}
      {designSystems.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 mx-auto">
            <FigmaIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No design systems yet</h3>
          <p className="text-muted-foreground mb-4">
            Connect your first Figma design system to get started
          </p>
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Design System
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designSystems.map((designSystem) => (
            <Card 
              key={designSystem.id} 
              className={`group hover:shadow-md transition-shadow ${
                selectedDesignSystemId === designSystem.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2">
                      {designSystem.name}
                      {designSystem.isPublic && (
                        <Badge variant="secondary" className="text-xs">
                          <GlobeIcon className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </CardTitle>
                    {designSystem.description && (
                      <CardDescription className="text-sm mt-1 line-clamp-2">
                        {designSystem.description}
                      </CardDescription>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFigmaFile(designSystem.figmaFileKey)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ComponentIcon className="h-4 w-4" />
                    <span>{designSystem.componentCount} components</span>
                  </div>
                  {designSystem.lastSyncedAt && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {new Date(designSystem.lastSyncedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onDesignSystemSelected?.(designSystem)}
                    className="flex-1"
                  >
                    Select
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSyncDesignSystem(designSystem.id)}
                    disabled={syncingIds.has(designSystem.id)}
                  >
                    {syncingIds.has(designSystem.id) ? (
                      <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingDesignSystem(designSystem)}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Design System</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{designSystem.name}"? 
                          This will also delete all associated components. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteDesignSystem(designSystem.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Design System Dialog */}
      {editingDesignSystem && (
        <Dialog open={!!editingDesignSystem} onOpenChange={() => setEditingDesignSystem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Design System</DialogTitle>
              <DialogDescription>
                Update your design system settings and configuration
              </DialogDescription>
            </DialogHeader>
            <EditDesignSystemForm
              designSystem={editingDesignSystem}
              onSubmit={(updateData) => handleUpdateDesignSystem(editingDesignSystem.id, updateData)}
              onCancel={() => setEditingDesignSystem(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
