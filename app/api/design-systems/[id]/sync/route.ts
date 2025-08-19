import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { designSystems, designSystemComponents } from '@/schema';
import { eq, and } from 'drizzle-orm';
import { ComponentCategory } from '@/lib/types';
import { nanoid } from 'nanoid';

interface FigmaComponent {
  id: string;
  name: string;
  key: string;
  file_key: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  containing_frame?: {
    name: string;
    id: string;
  };
  component_properties?: Record<string, any>;
}

interface FigmaFile {
  key: string;
  name: string;
  last_modified: string;
  components: Record<string, FigmaComponent>;
}

function categorizeComponent(component: FigmaComponent): ComponentCategory {
  const name = component.name.toLowerCase();
  const frameName = component.containing_frame?.name.toLowerCase() || '';
  
  if (name.includes('button') || name.includes('input') || name.includes('form') || frameName.includes('form')) {
    return 'Forms';
  } else if (name.includes('nav') || name.includes('menu') || name.includes('header') || name.includes('footer')) {
    return 'Navigation';
  } else if (name.includes('card') || name.includes('list') || name.includes('table') || name.includes('grid')) {
    return 'Content';
  } else if (name.includes('layout') || name.includes('container') || name.includes('section')) {
    return 'Layout';
  } else if (name.includes('product') || name.includes('cart') || name.includes('checkout')) {
    return 'E-commerce';
  }
  
  return 'Other';
}

function generateTags(component: FigmaComponent): string[] {
  const tags: string[] = [];
  
  if (component.component_properties) {
    Object.keys(component.component_properties).forEach(prop => {
      if (!tags.includes(prop)) tags.push(prop);
    });
  }
  
  if (component.containing_frame?.name && !tags.includes(component.containing_frame.name)) {
    tags.push(component.containing_frame.name);
  }
  
  const category = categorizeComponent(component);
  if (!tags.includes(category)) {
    tags.push(category);
  }
  
  return tags;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSubscribedUser();
    const { id } = params;
    
    // Get the design system with access token
    const [designSystem] = await database
      .select()
      .from(designSystems)
      .where(
        and(
          eq(designSystems.id, id),
          eq(designSystems.userId, user.id)
        )
      );
    
    if (!designSystem) {
      return NextResponse.json(
        { error: 'Design system not found' },
        { status: 404 }
      );
    }
    
    // Fetch components from Figma
    const response = await fetch(
      `https://api.figma.com/v1/files/${designSystem.figmaFileKey}`,
      {
        headers: {
          'X-Figma-Token': designSystem.figmaAccessToken,
        },
      }
    );
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const file: FigmaFile = await response.json();
    const components = Object.values(file.components);
    
    // Get existing components for this design system
    const existingComponents = await database
      .select()
      .from(designSystemComponents)
      .where(eq(designSystemComponents.designSystemId, id));
    
    const existingComponentMap = new Map(
      existingComponents.map(c => [c.figmaComponentKey, c])
    );
    
    const newComponents: any[] = [];
    const updatedComponents: any[] = [];
    
    // Process each Figma component
    for (const component of components) {
      const category = categorizeComponent(component);
      const tags = generateTags(component);
      
      const componentData = {
        figmaComponentId: component.id,
        figmaComponentKey: component.key,
        name: component.name,
        description: `Component from ${file.name}${component.containing_frame?.name ? ` - Frame: ${component.containing_frame.name}` : ''}`,
        category,
        tags,
        thumbnailUrl: (designSystem.settings as any)?.includeThumbnails !== false ? component.thumbnail_url : null,
        figmaData: {
          figmaId: component.id,
          figmaKey: component.key,
          fileKey: component.file_key,
          fileUrl: `https://www.figma.com/file/${component.file_key}`,
          createdAt: component.created_at,
          updatedAt: component.updated_at,
          containingFrame: component.containing_frame,
          componentProperties: component.component_properties,
        },
        updatedAt: new Date(),
      };
      
      const existing = existingComponentMap.get(component.key);
      
      if (existing) {
        // Update existing component
        updatedComponents.push({
          ...componentData,
          id: existing.id,
          // Preserve existing generated code and explanations
          generatedCode: existing.generatedCode,
          codeExplanation: existing.codeExplanation,
        });
      } else {
        // Create new component
        newComponents.push({
          ...componentData,
          id: nanoid(),
          designSystemId: id,
          createdAt: new Date(),
        });
      }
    }
    
    // Insert new components
    if (newComponents.length > 0) {
      await database
        .insert(designSystemComponents)
        .values(newComponents);
    }
    
    // Update existing components
    for (const component of updatedComponents) {
      await database
        .update(designSystemComponents)
        .set(component)
        .where(eq(designSystemComponents.id, component.id));
    }
    
    // Update design system sync info
    await database
      .update(designSystems)
      .set({
        componentCount: components.length.toString(),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(designSystems.id, id));
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${components.length} components`,
      stats: {
        total: components.length,
        new: newComponents.length,
        updated: updatedComponents.length,
      },
      syncTimestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error syncing design system:', error);
    return NextResponse.json(
      { error: 'Failed to sync design system' },
      { status: 500 }
    );
  }
}
