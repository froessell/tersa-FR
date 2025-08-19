import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { designSystems } from '@/schema';
import { eq, desc } from 'drizzle-orm';
import { CreateDesignSystemRequest, DesignSystem } from '@/lib/types';
import { nanoid } from 'nanoid';

export async function GET(request: NextRequest) {
  try {
    const user = await getSubscribedUser();
    
    const { searchParams } = new URL(request.url);
    const includePublic = searchParams.get('includePublic') === 'true';
    
    // Get user's design systems
    const userDesignSystems = await database
      .select()
      .from(designSystems)
      .where(eq(designSystems.userId, user.id))
      .orderBy(desc(designSystems.updatedAt));
    
    // If including public, also fetch public design systems from other users
    let publicDesignSystems: any[] = [];
    if (includePublic) {
      publicDesignSystems = await database
        .select()
        .from(designSystems)
        .where(eq(designSystems.isPublic, true))
        .orderBy(desc(designSystems.updatedAt));
    }
    
    const allDesignSystems = [...userDesignSystems, ...publicDesignSystems]
      .filter((ds, index, self) => 
        index === self.findIndex(d => d.id === ds.id)
      ); // Remove duplicates
    
    return NextResponse.json({
      success: true,
      designSystems: allDesignSystems,
    });
    
  } catch (error) {
    console.error('Error fetching design systems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design systems' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSubscribedUser();
    const body: CreateDesignSystemRequest = await request.json();
    
    const { name, description, figmaFileKey, figmaAccessToken, isPublic = false, settings } = body;
    
    // Validate required fields
    if (!name || !figmaFileKey || !figmaAccessToken) {
      return NextResponse.json(
        { error: 'Name, Figma file key, and access token are required' },
        { status: 400 }
      );
    }
    
    // Test Figma API access
    try {
      const testResponse = await fetch(`https://api.figma.com/v1/files/${figmaFileKey}`, {
        headers: {
          'X-Figma-Token': figmaAccessToken,
        },
      });
      
      if (!testResponse.ok) {
        return NextResponse.json(
          { error: 'Invalid Figma file key or access token' },
          { status: 400 }
        );
      }
      
      const fileData = await testResponse.json();
      
      // Create the design system
      const newDesignSystem = {
        id: nanoid(),
        name,
        description: description || null,
        figmaFileKey,
        figmaFileName: fileData.name || null,
        figmaFileUrl: `https://www.figma.com/file/${figmaFileKey}`,
        figmaAccessToken,
        userId: user.id,
        isPublic,
        componentCount: '0',
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: settings || null,
      };
      
      const [createdDesignSystem] = await database
        .insert(designSystems)
        .values(newDesignSystem)
        .returning();
      
      // Don't return the access token in the response for security
      const { figmaAccessToken: _, ...safeDesignSystem } = createdDesignSystem;
      
      return NextResponse.json({
        success: true,
        designSystem: safeDesignSystem,
        message: 'Design system created successfully',
      });
      
    } catch (figmaError) {
      return NextResponse.json(
        { error: 'Failed to connect to Figma API' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error creating design system:', error);
    return NextResponse.json(
      { error: 'Failed to create design system' },
      { status: 500 }
    );
  }
}
