export type ComponentCategory = 
  | 'Layout' 
  | 'Navigation' 
  | 'Content' 
  | 'Forms' 
  | 'E-commerce' 
  | 'Other';

export interface Component {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  tags: string[];
  imageUrl: string;
  imageFile?: File;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationRequest {
  id: string;
  prompt: string;
  selectedComponents: Component[];
  generatedCode: string;
  explanation?: string;
  usedComponents: string[];
  createdAt: Date;
}

export interface GenerationResponse {
  generatedCode: string;
  explanation: string;
  usedComponents: string[];
}

export interface ComponentFormData {
  name: string;
  description: string;
  category: ComponentCategory;
  tags: string;
  imageFile: File;
}

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'Layout',
  'Navigation', 
  'Content',
  'Forms',
  'E-commerce',
  'Other'
];
