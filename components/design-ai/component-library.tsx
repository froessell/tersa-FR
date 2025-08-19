"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SearchIcon, FilterIcon, EditIcon, TrashIcon, TagIcon, CalendarIcon, FolderIcon, ImageIcon, PlusIcon, CodeIcon, CopyIcon, EyeIcon, FigmaIcon, ExternalLinkIcon, AlertCircleIcon } from 'lucide-react';
import { Component, ComponentCategory, COMPONENT_CATEGORIES } from '@/lib/types';
import { getComponents, deleteComponent, searchComponents, filterComponentsByCategory, getFigmaComponents, getFigmaSyncHistory } from '@/lib/storage';
import { ComponentUpload } from './component-upload';
import { FigmaSync } from './figma-sync';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DesignSystemManager } from './design-system-manager';
import { DesignSystem } from '@/lib/types';

interface ComponentLibraryProps {
  selectedComponents?: string[];
  onComponentSelect?: (componentId: string) => void;
  onComponentDeselect?: (componentId: string) => void;
  selectionMode?: boolean;
}

export function ComponentLibrary({ 
  selectedComponents = [], 
  onComponentSelect, 
  onComponentDeselect,
  selectionMode = false 
}: ComponentLibraryProps) {
  const [components, setComponents] = useState<Component[]>([]);
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);
  const [activeTab, setActiveTab] = useState<'components' | 'figma-sync' | 'design-systems'>('components');
  const [selectedDesignSystem, setSelectedDesignSystem] = useState<DesignSystem | null>(null);

  // Load components on mount and refresh when needed
  const loadComponents = () => {
    const loadedComponents = getComponents();
    setComponents(loadedComponents);
    setFilteredComponents(loadedComponents);
  };

  useEffect(() => {
    loadComponents();
  }, []);

  // Filter components based on search and category
  useEffect(() => {
    let filtered = components;

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filterComponentsByCategory(selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchComponents(searchQuery.trim()).filter(component => 
        selectedCategory === 'All' || component.category === selectedCategory
      );
    }

    setFilteredComponents(filtered);
  }, [components, searchQuery, selectedCategory]);

  const handleDeleteComponent = async (componentId: string) => {
    const success = deleteComponent(componentId);
    if (success) {
      toast.success('Component deleted successfully');
      loadComponents();
    } else {
      toast.error('Failed to delete component');
    }
  };

  const handleComponentAdded = () => {
    loadComponents();
  };

  const handleEditComplete = () => {
    setEditingComponent(null);
    loadComponents();
  };

  const handleFigmaComponentsSynced = (syncedComponents: Component[]) => {
    // Refresh the component list to show newly synced components
    loadComponents();
    
    // Show success message with component count
    const figmaCount = syncedComponents.filter(c => c.figmaData).length;
    if (figmaCount > 0) {
      toast.success(`Successfully synced ${figmaCount} components from Figma!`);
    }
  };

  const handleCopyCode = async (code: string, componentName: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`${componentName} code copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleComponentToggle = (componentId: string) => {
    if (!selectionMode) return;
    
    if (selectedComponents.includes(componentId)) {
      onComponentDeselect?.(componentId);
    } else {
      onComponentSelect?.(componentId);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const figmaComponents = getFigmaComponents();
  const figmaSyncHistory = getFigmaSyncHistory();

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'components' | 'figma-sync' | 'design-systems')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="components">
            Component Library ({components.length})
          </TabsTrigger>
          <TabsTrigger value="design-systems">
            Design Systems
          </TabsTrigger>
          <TabsTrigger value="figma-sync">
            Legacy Sync {figmaComponents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {figmaComponents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          {/* Component Management Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Component Library</h2>
              <p className="text-muted-foreground">
                Manage your design system components
              </p>
            </div>
            <ComponentUpload onComponentAdded={handleComponentAdded} />
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search components by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {COMPONENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Figma Components Summary */}
          {figmaComponents.length > 0 && (
            <div className="rounded-lg border bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <FigmaIcon className="h-4 w-4" />
                <span className="font-medium">Figma Components Available</span>
                <Badge variant="secondary" className="text-blue-700">
                  {figmaComponents.length} components
                </Badge>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                You have {figmaComponents.length} components synced from Figma. 
                {figmaSyncHistory.length > 0 && (
                  <span> Last synced: {new Date(figmaSyncHistory[0].timestamp).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          )}

          {/* Components Grid */}
          {filteredComponents.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 mx-auto">
                <ImageIcon size={24} />
              </div>
              <h3 className="text-lg font-semibold mb-2">No components found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'All' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first component or syncing from Figma'
                }
              </p>
              {!searchQuery && selectedCategory === 'All' && (
                <div className="flex gap-2 justify-center">
                  <ComponentUpload onComponentAdded={handleComponentAdded} />
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('figma-sync')}
                    className="gap-2"
                  >
                    <FigmaIcon className="h-4 w-4" />
                    Sync from Figma
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComponents.map((component) => (
                <Card key={component.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {component.name}
                          {component.figmaData && (
                            <Badge variant="outline" className="text-xs">
                              <FigmaIcon className="h-3 w-3 mr-1" />
                              Figma
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {component.description}
                        </CardDescription>
                      </div>
                      {selectionMode && (
                        <Button
                          size="sm"
                          variant={selectedComponents.includes(component.id) ? "default" : "outline"}
                          onClick={() => handleComponentToggle(component.id)}
                          className="ml-2"
                        >
                          {selectedComponents.includes(component.id) ? "Selected" : "Select"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Component Image */}
                    {component.imageUrl && (
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                        <img
                          src={component.imageUrl}
                          alt={component.name}
                          className="w-full h-full object-cover"
                        />
                        {component.figmaData && (
                          <div className="absolute top-2 right-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(component.figmaData!.fileUrl, '_blank')}
                              className="h-6 px-2 text-xs bg-white/90 hover:bg-white"
                            >
                              <ExternalLinkIcon className="h-3 w-3 mr-1" />
                              View in Figma
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Component Metadata */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{component.category}</Badge>
                      <span>•</span>
                      <span>{new Date(component.updatedAt).toLocaleDateString()}</span>
                      {component.figmaData && (
                        <>
                          <span>•</span>
                          <span>Figma</span>
                        </>
                      )}
                    </div>

                    {/* Tags */}
                    {component.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {component.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {component.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{component.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      {component.generatedCode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(component.generatedCode!, component.name)}
                          className="flex-1 gap-2"
                        >
                          <CopyIcon className="h-3 w-3" />
                          Copy Code
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingComponent(component)}
                        className="gap-2"
                      >
                        <EditIcon className="h-3 w-3" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2">
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Component</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{component.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteComponent(component.id)}
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
        </TabsContent>

        <TabsContent value="design-systems" className="space-y-4">
          <DesignSystemManager
            onDesignSystemSelected={setSelectedDesignSystem}
            selectedDesignSystemId={selectedDesignSystem?.id}
          />
        </TabsContent>

        <TabsContent value="figma-sync" className="space-y-4">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 mb-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircleIcon className="h-4 w-4" />
              <span className="font-medium">Legacy Sync Method</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              This is the old way of syncing Figma components. We recommend using the new Design Systems feature for better organization and management.
            </p>
          </div>
          <FigmaSync onComponentsSynced={handleFigmaComponentsSynced} />
        </TabsContent>
      </Tabs>

      {/* Edit Component Dialog */}
      {editingComponent && (
        <ComponentUpload
          editingComponent={editingComponent}
          onEditComplete={handleEditComplete}
          onComponentAdded={handleComponentAdded}
        />
      )}
    </div>
  );
}
