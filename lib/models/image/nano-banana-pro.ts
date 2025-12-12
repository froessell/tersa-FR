import { env } from '@/lib/env';
import type { ImageModel } from 'ai';

const models = [
  'nano-banana-pro-v1',
  'nano-banana-pro-v2',
  'nano-banana-pro-ultra',
] as const;

// Map model IDs to Google Gemini model names
const modelMap: Record<(typeof models)[number], string> = {
  'nano-banana-pro-v1': 'gemini-2.5-flash-image',
  'nano-banana-pro-v2': 'gemini-3-pro-image-preview',
  'nano-banana-pro-ultra': 'gemini-3-pro-image-preview',
};

// Convert width x height to aspect ratio string
const getAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

// Convert size to resolution (1K, 2K, or 4K)
const getResolution = (width: number, height: number): '1K' | '2K' | '4K' => {
  const maxDimension = Math.max(width, height);
  if (maxDimension >= 2048) return '4K';
  if (maxDimension >= 1536) return '2K';
  return '1K';
};

// Map aspect ratio to Gemini API supported ratios
// Gemini supports: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
const mapToGeminiAspectRatio = (ratio: string): string => {
  const [w, h] = ratio.split(':').map(Number);
  const ratioValue = w / h;
  
  // Map to closest supported Gemini aspect ratio
  const supportedRatios: Array<[string, number]> = [
    ['1:1', 1.0],
    ['2:3', 2/3],
    ['3:2', 3/2],
    ['3:4', 3/4],
    ['4:3', 4/3],
    ['4:5', 4/5],
    ['5:4', 5/4],
    ['9:16', 9/16],
    ['16:9', 16/9],
    ['21:9', 21/9],
  ];
  
  // Find closest match
  let closest = supportedRatios[0];
  let minDiff = Math.abs(ratioValue - closest[1]);
  
  for (const [ratioStr, ratioNum] of supportedRatios) {
    const diff = Math.abs(ratioValue - ratioNum);
    if (diff < minDiff) {
      minDiff = diff;
      closest = [ratioStr, ratioNum];
    }
  }
  
  return closest[0];
};

type CreateImageParams = {
  modelId: (typeof models)[number];
  prompt: string;
  size: `${string}x${string}` | undefined;
  seed: number | undefined;
  abortSignal: AbortSignal | undefined;
  headers: Record<string, string | undefined> | undefined;
  imageBase64?: string; // Base64 encoded image for editing (single image)
  imagesBase64?: string[]; // Multiple base64 encoded images for combining
};

const createImage = async ({
  modelId,
  prompt,
  size,
  seed,
  abortSignal,
  headers,
  imageBase64,
  imagesBase64,
}: CreateImageParams) => {
  const [width, height] = size?.split('x').map(Number) ?? [1024, 1024];

  // Validate aspect ratio constraints
  const ratio = width / height;
  if (ratio > 3 || ratio < 1/3) {
    throw new Error('Aspect ratio must be between 1:3 and 3:1');
  }

  console.log(`Generating image with Nano Banana Pro ${modelId}:`, { prompt, width, height, seed });

  // Use Google Generative AI API key (fallback to NANO_BANANA_PRO_API_KEY for compatibility)
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || env.NANO_BANANA_PRO_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Google Generative AI API key is not configured. ' +
      'Please set GOOGLE_GENERATIVE_AI_API_KEY or NANO_BANANA_PRO_API_KEY environment variable.'
    );
  }

  // Get Gemini model name
  const geminiModel = modelMap[modelId];
  if (!geminiModel) {
    throw new Error(`Unknown model ID: ${modelId}`);
  }

  try {
    // Use Google Generative AI API endpoint
    // https://ai.google.dev/gemini-api/docs/image-generation
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    
    console.log('Calling Google Gemini API:', apiUrl);
    console.log('Model:', geminiModel);
    console.log('API Key present:', !!apiKey);
    
    const aspectRatio = getAspectRatio(width, height);
    const resolution = getResolution(width, height);
    
    let response: Response;
    try {
      // Create a timeout controller
      const timeoutMs = 60000; // 60 second timeout (image generation can take longer)
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
      
      // Use provided abortSignal or timeout signal
      const signalToUse = abortSignal || timeoutController.signal;

      try {
        // Build contents array - include images if provided for editing
        const parts: any[] = [];
        
        // Add input image(s) if provided (for image editing/combining)
        // Support both single image (imageBase64) and multiple images (imagesBase64)
        const imagesToProcess = imagesBase64 && imagesBase64.length > 0 
          ? imagesBase64 
          : imageBase64 
            ? [imageBase64] 
            : [];
        
        for (const img of imagesToProcess) {
          // Determine MIME type from base64 data URI or default to image/jpeg
          let mimeType = 'image/jpeg';
          let imageData = img;
          
          if (img.startsWith('data:')) {
            const mimeMatch = img.match(/data:([^;]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
            // Remove data URI prefix
            imageData = img.replace(/^data:[^;]+;base64,/, '');
          }
          
          parts.push({
            inlineData: {
              mimeType,
              data: imageData,
            },
          });
        }
        
        // Add text prompt
        parts.push({ text: prompt });

        // REST API format
        const requestBody: any = {
          contents: [{
            parts,
          }],
        };

        // Map calculated aspect ratio to Gemini API supported ratios
        // Gemini supports: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
        const geminiAspectRatio = mapToGeminiAspectRatio(aspectRatio);

        // Add generationConfig with imageConfig for aspect ratio
        // Note: Gemini API only supports aspectRatio, not resolution
        requestBody.generationConfig = {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: geminiAspectRatio,
          },
        };
        
        response = await fetch(`${apiUrl}?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(requestBody),
          signal: signalToUse,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (fetchError) {
      // Handle network errors (fetch failed, DNS errors, etc.)
      if (fetchError instanceof TypeError) {
        const errorMsg = fetchError.message.toLowerCase();
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('failed')) {
          throw new Error(
            `Failed to connect to Google Gemini API at ${apiUrl}. ` +
            `Possible causes: Network connectivity issues, invalid API key (check GOOGLE_GENERATIVE_AI_API_KEY), ` +
            `API service unavailable, or firewall/proxy blocking the connection.`
          );
        }
        if (errorMsg.includes('dns') || errorMsg.includes('getaddrinfo')) {
          throw new Error(
            `DNS resolution failed for ${apiUrl}. ` +
            `Please verify your network connection and API key configuration.`
          );
        }
      }
      // Handle abort errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Image generation was cancelled or timed out');
      }
      // Re-throw with context
      if (fetchError instanceof Error) {
        throw new Error(`Network error: ${fetchError.message}`);
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Handle Google API error format: { error: { message: "...", status: "..." } }
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Google Gemini API error: ${errorMessage}`);
    }

    const data = await response.json();

    // Handle Google Gemini API response format
    // Response structure: { candidates: [{ content: { parts: [{ inlineData: { data: "base64..." } }] }, finishReason, finishMessage }] }
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid response format from Gemini API. Response: ' + JSON.stringify(data));
    }

    const candidate = data.candidates[0];
    
    // Check finishReason first - if it's not STOP, the generation failed
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      // Extract the error message from finishMessage if available
      let errorMessage = candidate.finishMessage;
      
      // Also check for text parts that might contain error details
      if (candidate.content?.parts) {
        const textPart = candidate.content.parts.find((part: any) => part.text);
        if (textPart?.text) {
          errorMessage = textPart.text;
        }
      }
      
      // If no message found, provide helpful context based on finishReason
      if (!errorMessage) {
        switch (candidate.finishReason) {
          case 'NO_IMAGE':
            errorMessage = 'The model could not generate an image based on the prompt provided. Try rephrasing your prompt or adjusting the instructions.';
            break;
          case 'IMAGE_OTHER':
            errorMessage = 'Unable to generate the image. The model could not generate the image based on the prompt provided. Try rephrasing your prompt.';
            break;
          case 'SAFETY':
            errorMessage = 'Image generation was blocked due to safety concerns. Please adjust your prompt.';
            break;
          case 'RECITATION':
            errorMessage = 'Image generation was blocked due to potential copyright concerns. Please adjust your prompt.';
            break;
          default:
            errorMessage = `Image generation failed with reason: ${candidate.finishReason}. Please try rephrasing your prompt.`;
        }
      }
      
      throw new Error(errorMessage);
    }

    if (!candidate.content) {
      throw new Error('Invalid response format from Gemini API: no content in candidate. Response: ' + JSON.stringify(data));
    }

    const parts = candidate.content.parts;
    if (!parts || !Array.isArray(parts)) {
      throw new Error('No parts found in response. Response: ' + JSON.stringify(data));
    }

    // Find the image part (inlineData)
    const imagePart = parts.find((part: any) => part.inlineData);
    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      // Check if there's a text part with error message
      const textPart = parts.find((part: any) => part.text);
      if (textPart?.text) {
        throw new Error(textPart.text);
      }
      throw new Error('No image data found in response. Make sure responseModalities includes "IMAGE".');
    }

    // Decode base64 image data
    const base64Data = imagePart.inlineData.data;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    return new Uint8Array(imageBuffer);
  } catch (error) {
    console.error('Google Gemini API error:', error);
    // If error is already a well-formatted Error, re-throw it as-is
    if (error instanceof Error) {
      // Don't double-wrap if it's already a formatted error
      if (error.message.includes('Google Gemini') || 
          error.message.includes('Gemini') ||
          error.message.includes('Failed to connect') ||
          error.message.includes('API key') ||
          error.message.includes('cancelled')) {
        throw error;
      }
      throw new Error(`Google Gemini API error: ${error.message}`);
    }
    throw error;
  }
};

export const nanoBananaPro = {
  image: (modelId: (typeof models)[number]): ImageModel => ({
    modelId,
    provider: 'nano-banana-pro',
    specificationVersion: 'v1',
    maxImagesPerCall: 1,
    doGenerate: async ({
      prompt,
      seed,
      size,
      abortSignal,
      headers,
      providerOptions,
    }) => {
      // Extract image(s) from providerOptions for image editing/combining
      // Check multiple possible keys for compatibility
      let imageBase64: string | undefined;
      let imagesBase64: string[] | undefined;
      
      if (providerOptions) {
        // Check for nano-banana-pro provider key first
        const providerData = providerOptions['nano-banana-pro'];
        
        // Support both single image and multiple images
        if (providerData?.image) {
          imageBase64 = providerData.image;
        } else if (providerData?.images && Array.isArray(providerData.images)) {
          imagesBase64 = providerData.images;
        }
        
        // Fallback: check other common keys
        if (!imageBase64 && !imagesBase64) {
          const googleData = providerOptions.google;
          const geminiData = providerOptions.gemini;
          const bflData = providerOptions.bfl;
          
          if (googleData?.image) {
            imageBase64 = googleData.image;
          } else if (googleData?.images && Array.isArray(googleData.images)) {
            imagesBase64 = googleData.images;
          } else if (geminiData?.image) {
            imageBase64 = geminiData.image;
          } else if (geminiData?.images && Array.isArray(geminiData.images)) {
            imagesBase64 = geminiData.images;
          } else if (bflData?.image) {
            imageBase64 = bflData.image; // For backward compatibility
          }
        }
        
        // Last resort: find any provider option with an image key
        if (!imageBase64 && !imagesBase64) {
          for (const key in providerOptions) {
            const data = providerOptions[key];
            if (data?.image) {
              imageBase64 = data.image;
              break;
            } else if (data?.images && Array.isArray(data.images)) {
              imagesBase64 = data.images;
              break;
            }
          }
        }
      }

      const imageData = await createImage({
        modelId,
        prompt,
        size,
        seed,
        abortSignal,
        headers,
        imageBase64,
        imagesBase64,
      });

      return {
        images: [imageData],
        warnings: [],
        response: {
          timestamp: new Date(),
          modelId,
          headers: undefined,
        },
      };
    },
  }),
};
