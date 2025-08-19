import { Component, GenerationRequest } from './types';

const COMPONENTS_KEY = 'design-ai-components';
const GENERATIONS_KEY = 'design-ai-generations';
const FIGMA_SYNC_KEY = 'figma-sync-history';

// Component Storage Functions
export function saveComponent(component: Component): void {
  const components = getComponents();
  const existingIndex = components.findIndex(c => c.id === component.id);
  
  if (existingIndex >= 0) {
    components[existingIndex] = component;
  } else {
    components.push(component);
  }
  
  localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components));
}

export function saveFigmaComponents(figmaComponents: Component[]): void {
  const existingComponents = getComponents();
  
  // Create a map of existing components by ID for quick lookup
  const existingMap = new Map(existingComponents.map(c => [c.id, c]));
  
  // Process each Figma component
  figmaComponents.forEach(figmaComponent => {
    const existing = existingMap.get(figmaComponent.id);
    
    if (existing) {
      // Update existing component with new Figma data
      const updatedComponent: Component = {
        ...existing,
        ...figmaComponent,
        updatedAt: new Date(),
        // Preserve existing generated code and explanations
        generatedCode: existing.generatedCode || figmaComponent.generatedCode,
        codeExplanation: existing.codeExplanation || figmaComponent.codeExplanation,
      };
      existingMap.set(figmaComponent.id, updatedComponent);
    } else {
      // Add new component
      existingMap.set(figmaComponent.id, figmaComponent);
    }
  });
  
  // Convert map back to array and save
  const updatedComponents = Array.from(existingMap.values());
  localStorage.setItem(COMPONENTS_KEY, JSON.stringify(updatedComponents));
  
  // Save sync history
  if (figmaComponents.length > 0) {
    saveFigmaSyncHistory({
      timestamp: new Date().toISOString(),
      componentCount: figmaComponents.length,
      fileKey: figmaComponents[0]?.figmaData?.fileKey || 'unknown',
    });
  }
}

export function getComponents(): Component[] {
  try {
    const stored = localStorage.getItem(COMPONENTS_KEY);
    if (!stored) return [];
    
    const components = JSON.parse(stored);
    // Convert date strings back to Date objects
    return components.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt)
    }));
  } catch (error) {
    console.error('Error loading components:', error);
    return [];
  }
}

export function getFigmaComponents(): Component[] {
  return getComponents().filter(c => c.figmaData);
}

export function getComponentById(id: string): Component | null {
  const components = getComponents();
  return components.find(c => c.id === id) || null;
}

export function deleteComponent(id: string): boolean {
  try {
    const components = getComponents();
    const filteredComponents = components.filter(c => c.id !== id);
    localStorage.setItem(COMPONENTS_KEY, JSON.stringify(filteredComponents));
    return true;
  } catch (error) {
    console.error('Error deleting component:', error);
    return false;
  }
}

export function searchComponents(query: string): Component[] {
  const components = getComponents();
  const lowercaseQuery = query.toLowerCase();
  
  return components.filter(component => 
    component.name.toLowerCase().includes(lowercaseQuery) ||
    component.description.toLowerCase().includes(lowercaseQuery) ||
    component.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
}

export function filterComponentsByCategory(category: string): Component[] {
  const components = getComponents();
  if (category === 'All') return components;
  return components.filter(c => c.category === category);
}

// Figma Sync History Functions
export function saveFigmaSyncHistory(syncInfo: {
  timestamp: string;
  componentCount: number;
  fileKey: string;
}): void {
  try {
    const history = getFigmaSyncHistory();
    history.unshift(syncInfo);
    
    // Keep only last 10 syncs
    if (history.length > 10) {
      history.splice(10);
    }
    
    localStorage.setItem(FIGMA_SYNC_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving Figma sync history:', error);
  }
}

export function getFigmaSyncHistory(): Array<{
  timestamp: string;
  componentCount: number;
  fileKey: string;
}> {
  try {
    const stored = localStorage.getItem(FIGMA_SYNC_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading Figma sync history:', error);
    return [];
  }
}

// Generation Storage Functions
export function saveGeneration(generation: GenerationRequest): void {
  const generations = getGenerations();
  const existingIndex = generations.findIndex(g => g.id === generation.id);
  
  if (existingIndex >= 0) {
    generations[existingIndex] = generation;
  } else {
    generations.push(generation);
  }
  
  localStorage.setItem(GENERATIONS_KEY, JSON.stringify(generations));
}

export function getGenerations(): GenerationRequest[] {
  try {
    const stored = localStorage.getItem(GENERATIONS_KEY);
    if (!stored) return [];
    
    const generations = JSON.parse(stored);
    // Convert date strings back to Date objects
    return generations.map((g: any) => ({
      ...g,
      createdAt: new Date(g.createdAt),
      selectedComponents: g.selectedComponents.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      }))
    }));
  } catch (error) {
    console.error('Error loading generations:', error);
    return [];
  }
}

export function getGenerationById(id: string): GenerationRequest | null {
  const generations = getGenerations();
  return generations.find(g => g.id === id) || null;
}

// Image handling utilities
export function convertFileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please upload a PNG, JPG, or WebP image' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be smaller than 5MB' };
  }
  
  return { valid: true };
}

// Utility function to check if component name is unique
export function isComponentNameUnique(name: string, excludeId?: string): boolean {
  const components = getComponents();
  return !components.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId);
}
