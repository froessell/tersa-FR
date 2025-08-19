import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, name, description, category } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Create the system prompt for component analysis
    const systemPrompt = `You are an expert React developer and UI designer. Your task is to analyze a UI component screenshot and generate clean, production-ready React JSX code that recreates the component.

GUIDELINES:
1. Generate ONLY valid React JSX code that can be directly used
2. Use Tailwind CSS classes for all styling
3. Follow modern design principles and best practices
4. Use semantic HTML elements (button, input, nav, etc.)
5. Include proper accessibility attributes (aria-label, alt text, etc.)
6. Make the component responsive using Tailwind responsive prefixes
7. Use appropriate Lucide React icons if needed (import them)
8. Follow React best practices (proper key props, semantic elements)
9. Make reasonable assumptions about interactive behavior
10. Create a functional component with TypeScript if needed

COMPONENT DETAILS:
- Name: ${name}
- Description: ${description}
- Category: ${category}

OUTPUT FORMAT:
Return only the JSX code without any explanatory text, comments, or markdown formatting. The code should be ready to copy and paste into a React file.`;

    const userPrompt = `Please analyze this UI component screenshot and generate the corresponding React JSX code. Focus on recreating the visual design, layout, styling, and likely functionality based on what you can see in the image.`;

    // Generate the component code using OpenAI Vision
    const result = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image', image: imageUrl }
          ]
        }
      ],
      temperature: 0.3,
      maxTokens: 2000,
    });

    const generatedCode = result.text;
    
    // Create a simple explanation
    const explanation = `Generated React component code for "${name}" based on the uploaded screenshot. The code includes Tailwind CSS styling and follows modern React best practices.`;

    return NextResponse.json({
      generatedCode,
      explanation,
    });

  } catch (error) {
    console.error('Component analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze component' },
      { status: 500 }
    );
  }
}
