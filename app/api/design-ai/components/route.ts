import { NextRequest, NextResponse } from 'next/server';

// This is a simple API route that could be extended for server-side storage
// For now, it just returns a success response since we're using localStorage

export async function GET() {
  return NextResponse.json({
    message: 'Component API endpoint is available. Using client-side storage.',
    status: 'ok'
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // In a real implementation, you would save to a database here
    // For now, we'll just validate the data structure
    
    const requiredFields = ['name', 'description', 'category'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Component data is valid. Using client-side storage.',
      componentId: data.id || 'generated-id'
    });
    
  } catch (error) {
    console.error('Component API error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Component ID is required for updates' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Component update is valid. Using client-side storage.',
      componentId: data.id
    });
    
  } catch (error) {
    console.error('Component update API error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get('id');
    
    if (!componentId) {
      return NextResponse.json(
        { error: 'Component ID is required for deletion' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Component deletion is valid. Using client-side storage.',
      componentId
    });
    
  } catch (error) {
    console.error('Component deletion API error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
