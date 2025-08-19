import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedUser } from '@/lib/auth';
import { env } from '@/lib/env';

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
  component_sets?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    await getSubscribedUser();
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { fileKey, includeThumbnails = true } = await request.json();

    if (!fileKey || typeof fileKey !== 'string') {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    if (!env.FIGMA_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Figma integration not configured' },
        { status: 500 }
      );
    }

    // Fetch components from Figma API
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': env.FIGMA_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const file: FigmaFile = await response.json();
    
    // Transform Figma components to our component format
    const components = Object.values(file.components).map(component => {
      // Determine category based on component name or frame
      let category: 'Layout' | 'Navigation' | 'Content' | 'Forms' | 'E-commerce' | 'Other' = 'Other';
      
      const name = component.name.toLowerCase();
      const frameName = component.containing_frame?.name.toLowerCase() || '';
      
      if (name.includes('button') || name.includes('input') || name.includes('form') || frameName.includes('form')) {
        category = 'Forms';
      } else if (name.includes('nav') || name.includes('menu') || name.includes('header') || name.includes('footer')) {
        category = 'Navigation';
      } else if (name.includes('card') || name.includes('list') || name.includes('table') || name.includes('grid')) {
        category = 'Content';
      } else if (name.includes('layout') || name.includes('container') || name.includes('section')) {
        category = 'Layout';
      } else if (name.includes('product') || name.includes('cart') || name.includes('checkout')) {
        category = 'E-commerce';
      }

      // Generate tags based on component properties and context
      const tags: string[] = [];
      if (component.component_properties) {
        Object.keys(component.component_properties).forEach(prop => {
          if (!tags.includes(prop)) tags.push(prop);
        });
      }
      
      // Add frame name as tag if available
      if (component.containing_frame?.name && !tags.includes(component.containing_frame.name)) {
        tags.push(component.containing_frame.name);
      }

      // Add category as tag
      if (!tags.includes(category)) {
        tags.push(category);
      }

      return {
        id: `figma-${component.key}`,
        name: component.name,
        description: `Figma component from ${file.name}${component.containing_frame?.name ? ` - Frame: ${component.containing_frame.name}` : ''}`,
        category,
        tags,
        imageUrl: includeThumbnails && component.thumbnail_url ? component.thumbnail_url : '',
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
        createdAt: new Date(component.created_at),
        updatedAt: new Date(component.updated_at),
      };
    });

    // Return the synced components
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${components.length} components from Figma file "${file.name}"`,
      components,
      fileInfo: {
        name: file.name,
        key: file.key,
        lastModified: file.last_modified,
        componentCount: components.length,
      },
      syncTimestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Figma sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Figma components' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await getSubscribedUser();
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey');

    if (!fileKey) {
      return NextResponse.json(
        { error: 'File key is required' },
        { status: 400 }
      );
    }

    if (!env.FIGMA_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Figma integration not configured' },
        { status: 500 }
      );
    }

    // Fetch file info from Figma API
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': env.FIGMA_ACCESS_TOKEN,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const file: FigmaFile = await response.json();
    
    return NextResponse.json({
      success: true,
      fileInfo: {
        name: file.name,
        key: file.key,
        lastModified: file.last_modified,
        componentCount: Object.keys(file.components).length,
        componentSetCount: Object.keys(file.component_sets || {}).length,
      },
    });

  } catch (error) {
    console.error('Figma file info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Figma file info' },
      { status: 500 }
    );
  }
}
