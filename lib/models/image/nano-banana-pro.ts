import { env } from '@/lib/env';
import type { ImageModel } from 'ai';
import { Runware } from '@runware/sdk-js';

const models = [
  'nano-banana-pro-v1',
  'nano-banana-pro-v2',
  'nano-banana-pro-ultra',
  'seedream-4.5',
  'midjourney-7',
] as const;

// Map model IDs to Runware AIR identifiers
// Runware requires AIR IDs in format: "runware:101@1" or "civitai:xxx@xxx" or "bytedance:xxx@x.x" or "openai:2@3" or "google:4@2"
// Find AIR IDs at: https://runware.ai/docs/en/image-inference/models
// Or use the Model Explorer: https://runware.ai/docs/en/image-inference/models
// API Reference: https://runware.ai/docs/en/image-inference/api-reference
// Common format: provider:MODEL_ID@VERSION
const modelMap: Record<string, string> = {
  // Google Gemini models via Runware
  'nano-banana-pro-v1': 'google:4@2', // Gemini 3 Pro Image Preview (Nano Banana 2)
  'nano-banana-pro-v2': 'google:4@2', // Gemini 3 Pro Image Preview (Nano Banana 2)
  'nano-banana-pro-ultra': 'google:4@2', // Gemini 3 Pro Image Preview (Nano Banana 2)
  
  // FLUX models from Black Forest Labs (BFL) via Runware
  'flux-dev': 'runware:101@1', // FLUX.1 Dev
  'flux-pro': 'runware:106@1', // FLUX.1 Pro
  'flux-pro-1.1': 'runware:106@1', // FLUX.1 Pro (1.1 version uses same AIR ID as flux-pro)
  'flux-2-pro': 'bfl:5@1', // FLUX.2 Pro
  'flux-2-dev': 'runware:400@1', // FLUX.2 Dev
  
  // ByteDance models via Runware
  'seedream-4.5': 'bytedance:seedream@4.5', // Seedream 4.5 from ByteDance
  
  // OpenAI models via Runware
  'dall-e-2': 'openai:2@2', // DALL·E 2 via OpenAI provider on Runware
  
  // Midjourney via Runware
  'midjourney-7': 'midjourney:3@1', // Midjourney V7 via Midjourney provider on Runware
  
  // Note: Photon Flash from Luma may not be available on Runware
  // If not available, use Luma API directly via the luma provider in imageModels
  'photon-flash-1': 'runware:101@1', // Placeholder - Photon Flash may need Luma API directly
};

// Runware supports flexible dimensions, no need for aspect ratio mapping

type CreateImageParams = {
  modelId: string; // Allow any string model ID
  prompt: string;
  size: `${string}x${string}` | undefined;
  seed: number | undefined;
  abortSignal: AbortSignal | undefined;
  headers: Record<string, string | undefined> | undefined;
  imageBase64?: string; // Base64 encoded image for editing (single image)
  imagesBase64?: string[]; // Multiple base64 encoded images for combining
  modelOverride?: string; // Override default model (for switching between Runware models)
};

// Create a singleton Runware instance to reuse WebSocket connections
let runwareInstance: InstanceType<typeof Runware> | null = null;

const getRunwareInstance = (): InstanceType<typeof Runware> => {
  if (!runwareInstance) {
    const apiKey = env.RUNWARE_API_KEY || env.NANO_BANANA_PRO_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Runware API key is not configured. ' +
        'Please set RUNWARE_API_KEY or NANO_BANANA_PRO_API_KEY environment variable.'
      );
    }
    
    console.log('Creating new Runware SDK instance...');
    runwareInstance = new Runware({
      apiKey,
      shouldReconnect: true,
      globalMaxRetries: 3,
      timeoutDuration: 300000, // 5 minutes for long operations
    });
    console.log('Runware SDK instance created');
  }
  return runwareInstance;
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
  modelOverride,
}: CreateImageParams) => {
  console.log('=== RUNWARE createImage CALLED (SDK) ===');
  console.log('Model ID:', modelId);
  console.log('Prompt:', prompt?.substring(0, 100));
  console.log('Size (ignored, using model defaults):', size);
  console.log('===============================');

  console.log(`Generating image with Runware ${modelId}:`, { prompt, seed });

  // Get Runware model identifier (can be overridden via providerOptions)
  const defaultModel = modelOverride || modelMap[modelId];
  if (!defaultModel) {
    throw new Error(`Unknown model ID: ${modelId}. Available models: ${Object.keys(modelMap).join(', ')}`);
  }
  
  // Runware SDK requires AIR IDs in format: "runware:101@1" or "civitai:xxx@xxx"
  // Ensure the model identifier is a valid AIR ID
  let runwareModel = defaultModel;
  if (!runwareModel.includes(':')) {
    // If not an AIR ID format, throw an error
    throw new Error(
      `Model "${runwareModel}" is not in AIR ID format. ` +
      `Runware requires AIR IDs like "runware:101@1". ` +
      `Please update the modelMap with the correct AIR ID for ${modelId}.`
    );
  }
  
  console.log(`Using Runware model AIR ID: ${runwareModel}`);

  try {
    const runware = getRunwareInstance();
    
    console.log('Ensuring Runware connection...');
    // Ensure connection is established
    try {
      await Promise.race([
        runware.ensureConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30s')), 30000)
        ),
      ]);
      console.log('Runware connection established');
    } catch (connError) {
      console.error('Failed to establish Runware connection:', connError);
      throw new Error(`Failed to connect to Runware: ${connError instanceof Error ? connError.message : String(connError)}`);
    }
    
    // Prepare request parameters
    // Note: We only need 1 image, so set numberResults to 1
    // If Runware requires a minimum (like 4), it will error and we can handle it
    // Note: We're NOT passing width/height to let Runware use the model's default dimensions
    // This avoids dimension validation errors since different models support different sizes
    const requestParams: any = {
      positivePrompt: prompt,
      model: runwareModel,
      numberResults: 1, // Request only 1 image
    };
    
    // Add seed if provided
    if (seed !== undefined && seed !== null) {
      requestParams.seed = seed;
    }
    
    // Add input image for image-to-image if provided
    // Different models use different parameters:
    // - FLUX/BFL models use 'seedImage'
    // - Google models use 'referenceImages' (array)
    if (imageBase64 || (imagesBase64 && imagesBase64.length > 0)) {
      const inputImages = imagesBase64 && imagesBase64.length > 0 ? imagesBase64 : [imageBase64!];
      
      // Process images - remove data URI prefix if present
      const processedImages = inputImages.map((img) => {
        return img.startsWith('data:') 
          ? img.replace(/^data:[^;]+;base64,/, '')
          : img;
      });
      
      // Google models use referenceImages array, others use seedImage
      if (runwareModel.startsWith('google:')) {
        requestParams.referenceImages = processedImages;
      } else {
        // Use seedImage for FLUX/BFL and other models (single image)
        requestParams.seedImage = processedImages[0];
      }
    }
    
    console.log('Runware SDK Request:', JSON.stringify({
      ...requestParams,
      seedImage: requestParams.seedImage ? `[base64 image data, length: ${requestParams.seedImage.length}]` : undefined,
      referenceImages: requestParams.referenceImages ? `[${requestParams.referenceImages.length} base64 image(s)]` : undefined,
    }, null, 2));
    
    // Handle abort signal if provided
    if (abortSignal?.aborted) {
      throw new Error('Image generation was cancelled');
    }
    
    console.log('Calling runware.requestImages()...');
    const requestStartTime = Date.now();
    
    // Request images using SDK - handles WebSocket, polling, etc. automatically
    // Add timeout wrapper to detect if it hangs
    // Using 2 minute timeout initially to catch issues faster
    let images: Awaited<ReturnType<typeof runware.requestImages>>;
    try {
      images = await Promise.race([
        runware.requestImages(requestParams),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            console.error('Runware requestImages timeout after 2 minutes');
            reject(new Error('Request timeout after 2 minutes'));
          }, 120000); // 2 minutes
        }),
      ]);
    } catch (requestError) {
      const requestDuration = Date.now() - requestStartTime;
      console.error(`Error during runware.requestImages() after ${requestDuration}ms:`, requestError);
      // Check if it's a timeout or other error
      if (requestError instanceof Error) {
        if (requestError.message.includes('timeout')) {
          throw new Error('Image generation timed out after 2 minutes. Please try again.');
        }
        // Re-throw with more context
        throw new Error(`Runware request failed: ${requestError.message}`);
      }
      throw requestError;
    }
    
    const requestDuration = Date.now() - requestStartTime;
    console.log(`Runware requestImages completed in ${requestDuration}ms`);
    console.log(`Received ${images?.length ?? 0} images from Runware`);
    
    if (!images || images.length === 0) {
      throw new Error('No images returned from Runware API');
    }
    
    const firstImage = images[0];
    console.log('Runware SDK Response:', {
      imageURL: firstImage.imageURL,
      hasImageBase64Data: !!firstImage.imageBase64Data,
      hasImageDataURI: !!firstImage.imageDataURI,
    });
    
    // Get image data - prefer base64 data, then data URI, then URL
    let imageBase64Data: string;
    
    if (firstImage.imageBase64Data) {
      // Already base64 data without prefix
      console.log('Using imageBase64Data from response');
      imageBase64Data = firstImage.imageBase64Data;
    } else if (firstImage.imageDataURI) {
      // Remove data URI prefix if present
      console.log('Using imageDataURI from response');
      imageBase64Data = firstImage.imageDataURI.replace(/^data:[^;]+;base64,/, '');
    } else if (firstImage.imageURL) {
      // Fetch image from URL
      console.log(`Fetching image from URL: ${firstImage.imageURL}`);
      try {
        const imageResponse = await fetch(firstImage.imageURL, { 
          signal: abortSignal,
          // Add headers to ensure we can fetch the image
          headers: {
            'Accept': 'image/*',
          },
        });
        console.log(`Image fetch response status: ${imageResponse.status} ${imageResponse.statusText}`);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from Runware: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        console.log(`Image buffer size: ${imageBuffer.byteLength} bytes`);
        imageBase64Data = Buffer.from(imageBuffer).toString('base64');
        console.log(`Successfully fetched and converted image, base64 length: ${imageBase64Data.length}`);
      } catch (fetchError) {
        console.error('Error fetching image from URL:', fetchError);
        throw new Error(`Failed to fetch image from Runware URL: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      }
    } else {
      throw new Error('No image data found in Runware SDK response');
    }

    // Decode base64 image data
    console.log(`Converting base64 to Uint8Array, base64 length: ${imageBase64Data.length}`);
    const imageBuffer = Buffer.from(imageBase64Data, 'base64');
    const uint8Array = new Uint8Array(imageBuffer);
    console.log(`Returning Uint8Array with length: ${uint8Array.length}`);
    return uint8Array;
  } catch (error) {
    console.error('Runware SDK error:', error);
    // If error is already a well-formatted Error, re-throw it as-is
    if (error instanceof Error) {
      // Don't double-wrap if it's already a formatted error
      if (error.message.includes('Runware') || 
          error.message.includes('Failed to connect') ||
          error.message.includes('API key') ||
          error.message.includes('cancelled')) {
        throw error;
      }
      throw new Error(`Runware API error: ${error.message}`);
    }
    throw error;
  }
};

export const nanoBananaPro = {
  image: (modelId: string): ImageModel => ({
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
      
      // Extract model override from providerOptions if provided
      let modelOverride: string | undefined;
      
      if (providerOptions) {
        // Check for nano-banana-pro provider key first
        const providerData = providerOptions['nano-banana-pro'];
        
        // Support model override for switching between Runware models
        if (providerData?.model && typeof providerData.model === 'string') {
          modelOverride = providerData.model;
        }
        
        // Support both single image and multiple images
        if (providerData?.image && typeof providerData.image === 'string') {
          imageBase64 = providerData.image;
        } else if (providerData?.images && Array.isArray(providerData.images)) {
          // Type guard: ensure all items in array are strings
          const validImages = providerData.images.filter((img): img is string => typeof img === 'string');
          if (validImages.length > 0) {
            imagesBase64 = validImages;
          }
        }
        
        // Fallback: check other common keys
        if (!imageBase64 && !imagesBase64) {
          const runwareData = providerOptions.runware;
          const bflData = providerOptions.bfl;
          
          if (runwareData?.image && typeof runwareData.image === 'string') {
            imageBase64 = runwareData.image;
          } else if (runwareData?.images && Array.isArray(runwareData.images)) {
            // Type guard: ensure all items in array are strings
            const validImages = runwareData.images.filter((img): img is string => typeof img === 'string');
            if (validImages.length > 0) {
              imagesBase64 = validImages;
            }
          } else if (runwareData?.model && typeof runwareData.model === 'string' && !modelOverride) {
            modelOverride = runwareData.model;
          } else if (bflData?.image && typeof bflData.image === 'string') {
            imageBase64 = bflData.image; // For backward compatibility
          }
        }
        
        // Last resort: find any provider option with an image key
        if (!imageBase64 && !imagesBase64) {
          for (const key in providerOptions) {
            const data = providerOptions[key];
            if (data?.image && typeof data.image === 'string') {
              imageBase64 = data.image;
              break;
            } else if (data?.images && Array.isArray(data.images)) {
              // Type guard: ensure all items in array are strings
              const validImages = data.images.filter((img): img is string => typeof img === 'string');
              if (validImages.length > 0) {
                imagesBase64 = validImages;
                break;
              }
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
        modelOverride,
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
