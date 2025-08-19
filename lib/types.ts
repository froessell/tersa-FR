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
  generatedCode?: string;
  codeExplanation?: string;
  figmaData?: FigmaComponentData;
  createdAt: Date;
  updatedAt: Date;
}

export interface FigmaComponentData {
  figmaId: string;
  figmaKey: string;
  fileKey: string;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
  containingFrame?: {
    name: string;
    id: string;
  };
  componentProperties?: Record<string, any>;
}

export interface FigmaSyncRequest {
  fileKey: string;
  includeThumbnails?: boolean;
}

export interface FigmaSyncResponse {
  success: boolean;
  message: string;
  components: Component[];
  fileInfo: {
    name: string;
    key: string;
    lastModified: string;
    componentCount: number;
  };
  syncTimestamp: string;
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

export interface DesignSystem {
  id: string;
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaFileName?: string;
  figmaFileUrl?: string;
  figmaAccessToken: string;
  userId: string;
  isPublic: boolean;
  componentCount: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    includeThumbnails?: boolean;
    autoSync?: boolean;
    syncFrequency?: 'daily' | 'weekly' | 'manual';
    categories?: ComponentCategory[];
  };
}

export interface DesignSystemComponent {
  id: string;
  designSystemId: string;
  figmaComponentId: string;
  figmaComponentKey: string;
  name: string;
  description?: string;
  category: ComponentCategory;
  tags: string[];
  thumbnailUrl?: string;
  figmaData?: FigmaComponentData;
  generatedCode?: string;
  codeExplanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDesignSystemRequest {
  name: string;
  description?: string;
  figmaFileKey: string;
  figmaAccessToken: string;
  isPublic?: boolean;
  settings?: DesignSystem['settings'];
}

export interface UpdateDesignSystemRequest {
  id: string;
  name?: string;
  description?: string;
  figmaAccessToken?: string;
  isPublic?: boolean;
  settings?: DesignSystem['settings'];
}
