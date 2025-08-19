import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Component, GenerationResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { prompt, selectedComponents, brandGuidelines } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (!selectedComponents || !Array.isArray(selectedComponents)) {
      return NextResponse.json(
        { error: 'Selected components must be an array' },
        { status: 400 }
      );
    }

    // Build component context for the AI
    const componentContext = selectedComponents.map((component: Component) => ({
      name: component.name,
      description: component.description,
      category: component.category,
      tags: component.tags,
    }));

    // Create the system prompt for design generation
    const systemPrompt = `You are an expert React developer and UI designer. Your task is to generate clean, modern React JSX code using the provided component library.

COMPONENT LIBRARY:
${componentContext.map(comp => 
  `- ${comp.name} (${comp.category}): ${comp.description}
    Tags: ${comp.tags.join(', ')}`
).join('\n')}

BRAND GUIDELINES:
- Use Tailwind CSS classes for styling
- Follow modern design principles with clean layouts
- Use consistent spacing (4px grid system: space-1, space-2, space-4, space-6, space-8, etc.)
- Ensure responsive design with mobile-first approach
- Use semantic HTML elements
- Follow accessibility best practices
- ${brandGuidelines || 'Use a clean, minimal design aesthetic'}

REQUIREMENTS:
1. Generate ONLY valid React JSX code that can be directly used
2. Use only the components provided in the library above
3. Include proper imports for Lucide React icons if needed
4. Use Tailwind CSS classes for all styling
5. Ensure the design is responsive and accessible
6. Follow React best practices (proper key props, semantic elements)
7. Do not include any explanatory text outside the code block

Generate React JSX code based on the user's request, using the available components creatively and effectively.`;

    const userPrompt = `Create a React component for: ${prompt}

Please use the available components from my library and generate clean, production-ready JSX code.`;

    // Generate the design using OpenAI
    const result = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Extract the generated code and create explanation
    const generatedCode = result.text;
    
    // Create a simple explanation
    const explanation = `Generated a React component using ${selectedComponents.length} component${selectedComponents.length !== 1 ? 's' : ''} from your library: ${selectedComponents.map((c: Component) => c.name).join(', ')}.`;

    const response: GenerationResponse = {
      generatedCode,
      explanation,
      usedComponents: selectedComponents.map((c: Component) => c.id),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Design generation error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is not configured' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate design. Please try again.' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Design AI generation endpoint is running' 
  });
}
