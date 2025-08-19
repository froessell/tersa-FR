"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SearchIcon, FilterIcon, EditIcon, TrashIcon, TagIcon, CalendarIcon, FolderIcon, ImageIcon, PlusIcon } from 'lucide-react';
import { Component, ComponentCategory, COMPONENT_CATEGORIES } from '@/lib/types';
import { getComponents, deleteComponent, searchComponents, filterComponentsByCategory } from '@/lib/storage';
import { ComponentUpload } from './component-upload';

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

  if (components.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <ImageIcon size={24} />
        </div>
        <h3 className="text-lg font-semibold mb-2">No components yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Start building your component library by uploading screenshots of your UI components.
          The AI will use these to generate new designs.
        </p>
        <ComponentUpload onComponentAdded={handleComponentAdded} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Component Library</h2>
          <p className="text-muted-foreground">
            {components.length} component{components.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <ComponentUpload onComponentAdded={handleComponentAdded} />
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <FilterIcon className="size-4" />
            <SelectValue />
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

      {/* Results count */}
      {(searchQuery || selectedCategory !== 'All') && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredComponents.length} of {components.length} components
        </p>
      )}

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map((component) => (
          <Card 
            key={component.id} 
            className={`group transition-all hover:shadow-md ${
              selectionMode 
                ? selectedComponents.includes(component.id)
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'cursor-pointer hover:ring-1 hover:ring-muted-foreground'
                : ''
            }`}
            onClick={selectionMode ? () => handleComponentToggle(component.id) : undefined}
          >
            <CardHeader className="pb-3">
              <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
                <img
                  src={component.imageUrl}
                  alt={component.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{component.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <FolderIcon className="size-3 mr-1" />
                      {component.category}
                    </Badge>
                  </div>
                </div>
                {!selectionMode && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingComponent(component);
                      }}
                    >
                      <EditIcon className="size-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrashIcon className="size-4" />
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
                )}
              </div>

              <CardDescription className="text-sm line-clamp-2">
                {component.description}
              </CardDescription>

              {component.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {component.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      <TagIcon className="size-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {component.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{component.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center text-xs text-muted-foreground">
                <CalendarIcon className="size-3 mr-1" />
                Added {formatDate(component.createdAt)}
              </div>

              {selectionMode && selectedComponents.includes(component.id) && (
                <div className="flex items-center text-sm text-primary font-medium">
                  <div className="size-4 rounded-full bg-primary mr-2 flex items-center justify-center">
                    <div className="size-2 rounded-full bg-primary-foreground" />
                  </div>
                  Selected
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredComponents.length === 0 && (searchQuery || selectedCategory !== 'All') && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <SearchIcon size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">No components found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or filters.
          </p>
          <Button variant="outline" onClick={() => {
            setSearchQuery('');
            setSelectedCategory('All');
          }}>
            Clear filters
          </Button>
        </div>
      )}

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
