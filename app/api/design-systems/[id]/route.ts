import { NextRequest, NextResponse } from 'next/server';
import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { designSystems, designSystemComponents } from '@/schema';
import { eq, and } from 'drizzle-orm';
import { UpdateDesignSystemRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSubscribedUser();
    const { id } = params;
    
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
    
    // Don't return the access token for security
    const { figmaAccessToken: _, ...safeDesignSystem } = designSystem;
    
    return NextResponse.json({
      success: true,
      designSystem: safeDesignSystem,
    });
    
  } catch (error) {
    console.error('Error fetching design system:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design system' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSubscribedUser();
    const { id } = params;
    const body: UpdateDesignSystemRequest = await request.json();
    
    // Check if design system exists and belongs to user
    const [existingDesignSystem] = await database
      .select()
      .from(designSystems)
      .where(
        and(
          eq(designSystems.id, id),
          eq(designSystems.userId, user.id)
        )
      );
    
    if (!existingDesignSystem) {
      return NextResponse.json(
        { error: 'Design system not found' },
        { status: 404 }
      );
    }
    
    // If updating access token, test it
    if (body.figmaAccessToken) {
      try {
        const testResponse = await fetch(
          `https://api.figma.com/v1/files/${existingDesignSystem.figmaFileKey}`,
          {
            headers: {
              'X-Figma-Token': body.figmaAccessToken,
            },
          }
        );
        
        if (!testResponse.ok) {
          return NextResponse.json(
            { error: 'Invalid Figma access token' },
            { status: 400 }
          );
        }
      } catch (figmaError) {
        return NextResponse.json(
          { error: 'Failed to validate Figma access token' },
          { status: 400 }
        );
      }
    }
    
    // Update the design system
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };
    
    const [updatedDesignSystem] = await database
      .update(designSystems)
      .set(updateData)
      .where(eq(designSystems.id, id))
      .returning();
    
    // Don't return the access token for security
    const { figmaAccessToken: _, ...safeDesignSystem } = updatedDesignSystem;
    
    return NextResponse.json({
      success: true,
      designSystem: safeDesignSystem,
      message: 'Design system updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating design system:', error);
    return NextResponse.json(
      { error: 'Failed to update design system' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSubscribedUser();
    const { id } = params;
    
    // Check if design system exists and belongs to user
    const [existingDesignSystem] = await database
      .select()
      .from(designSystems)
      .where(
        and(
          eq(designSystems.id, id),
          eq(designSystems.userId, user.id)
        )
      );
    
    if (!existingDesignSystem) {
      return NextResponse.json(
        { error: 'Design system not found' },
        { status: 404 }
      );
    }
    
    // Delete all associated components first
    await database
      .delete(designSystemComponents)
      .where(eq(designSystemComponents.designSystemId, id));
    
    // Delete the design system
    await database
      .delete(designSystems)
      .where(eq(designSystems.id, id));
    
    return NextResponse.json({
      success: true,
      message: 'Design system deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting design system:', error);
    return NextResponse.json(
      { error: 'Failed to delete design system' },
      { status: 500 }
    );
  }
}
