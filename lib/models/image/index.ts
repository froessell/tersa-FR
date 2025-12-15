import {
  type TersaModel,
  type TersaProvider,
  providers,
} from '@/lib/providers';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { luma } from '@ai-sdk/luma';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import type { ImageModel } from 'ai';
import { AmazonBedrockIcon, GrokIcon, NanoBanaProIcon } from '../../icons';
import { blackForestLabs } from './black-forest-labs';
import { nanoBananaPro } from './nano-banana-pro';

const million = 1000000;

export type ImageSize = `${number}x${number}`;

type TersaImageModel = TersaModel & {
  providers: (TersaProvider & {
    model: ImageModel;
    getCost: (props?: {
      textInput?: number;
      imageInput?: number;
      output?: number;
      size?: string;
    }) => number;
  })[];
  sizes?: ImageSize[];
  supportsEdit?: boolean;
  providerOptions?: Record<string, Record<string, string>>;
};

export const imageModels: Record<string, TersaImageModel> = {
  'nano-banana-pro': {
    label: 'Nano Banana Pro',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-v1'),
        getCost: () => 0.05, // $0.05 per image
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
    default: true,
  },
  'nano-banana-pro-v1': {
    label: 'Nano Banana Pro V1',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-v1'),
        getCost: () => 0.05, // $0.05 per image
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'nano-banana-pro-v2': {
    label: 'Nano Banana Pro V2',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-v2'),
        getCost: () => 0.08, // $0.08 per image
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'nano-banana-pro-ultra': {
    label: 'Nano Banana Pro Ultra',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-ultra'),
        getCost: () => 0.12, // Simplified pricing - using default size
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'dall-e-2': {
    label: 'DALL-E 2',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('dall-e-2'),
        getCost: () => 0.02, // Simplified pricing - using default size
      },
    ],
    // sizes removed - using model defaults from Runware
    priceIndicator: 'low',
  },
  'flux-pro-1.1': {
    label: 'FLUX Pro 1.1',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('flux-pro-1.1'),
        getCost: () => 0.04,
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'flux-pro': {
    label: 'FLUX Pro',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('flux-pro'),
        getCost: () => 0.05,
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'flux-dev': {
    label: 'FLUX Dev',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('flux-dev'),
        getCost: () => 0.025,
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
    priceIndicator: 'low',
  },
  'flux-2-pro': {
    label: 'FLUX.2 Pro',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('flux-2-pro'),
        getCost: () => 0.05,
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'flux-2-dev': {
    label: 'FLUX.2 Dev',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('flux-2-dev'),
        getCost: () => 0.025,
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
    priceIndicator: 'low',
  },
  'photon-flash-1': {
    label: 'Photon Flash 1',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('photon-flash-1'),
        getCost: () => 0.003, // Simplified pricing - using default size (estimated)
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'seedream-4.5': {
    label: 'Seedream 4.5',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('seedream-4.5'),
        getCost: () => 0.06, // Estimated pricing
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: true,
  },
  'midjourney-7': {
    label: 'Midjourney 7',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('midjourney-7'),
        getCost: () => 0.10, // Estimated pricing - Midjourney tends to be premium
      },
    ],
    // sizes removed - using model defaults from Runware
    supportsEdit: false, // Midjourney typically doesn't support image editing
  },
};

// Backup of all models (commented out)
/*
export const allImageModels: Record<string, TersaImageModel> = {
  'grok-2-image': {
    icon: GrokIcon,
    label: 'Grok 2 Image',
    chef: providers.xai,
    providers: [
      {
        ...providers.xai,
        model: xai.image('grok-2-image'),

        // https://docs.x.ai/docs/models#models-and-pricing
        getCost: () => 0.07,
      },
    ],

    // xAI does not support size or quality
    // size: '1024x1024',
    // providerOptions: {},
  },
  'dall-e-3': {
    label: 'DALL-E 3',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.image('dall-e-3'),

        // https://platform.openai.com/docs/pricing#image-generation
        getCost: (props) => {
          if (!props) {
            throw new Error('Props are required');
          }

          if (!props.size) {
            throw new Error('Size is required');
          }

          if (props.size === '1024x1024') {
            return 0.08;
          }

          if (props.size === '1024x1792' || props.size === '1792x1024') {
            return 0.12;
          }

          throw new Error('Size is not supported');
        },
      },
    ],
    sizes: ['1024x1024', '1024x1792', '1792x1024'],
    providerOptions: {
      openai: {
        quality: 'hd',
      },
    },
  },
  'dall-e-2': {
    label: 'DALL-E 2',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.image('dall-e-2'),

        // https://platform.openai.com/docs/pricing#image-generation
        getCost: (props) => {
          if (!props) {
            throw new Error('Props are required');
          }

          const { size } = props;

          if (size === '1024x1024') {
            return 0.02;
          }

          if (size === '512x512') {
            return 0.018;
          }

          if (size === '256x256') {
            return 0.016;
          }

          throw new Error('Size is not supported');
        },
      },
    ],
    sizes: ['1024x1024', '512x512', '256x256'],
    priceIndicator: 'low',
    providerOptions: {
      openai: {
        quality: 'standard',
      },
    },
  },
  'gpt-image-1': {
    label: 'GPT Image 1',
    chef: providers.openai,
    providers: [
      {
        ...providers.openai,
        model: openai.image('gpt-image-1'),

        // Input (Text): https://platform.openai.com/docs/pricing#latest-models
        // Input (Image): https://platform.openai.com/docs/pricing#text-generation
        // Output: https://platform.openai.com/docs/pricing#image-generation
        getCost: (props) => {
          const priceMap: Record<ImageSize, number> = {
            '1024x1024': 0.167,
            '1024x1536': 0.25,
            '1536x1024': 0.25,
          };

          if (!props) {
            throw new Error('Props are required');
          }

          if (typeof props.size !== 'string') {
            throw new Error('Size is required');
          }

          if (typeof props.output !== 'number') {
            throw new Error('Output is required');
          }

          if (typeof props.textInput !== 'number') {
            throw new Error('Text input is required');
          }

          if (typeof props.imageInput !== 'number') {
            throw new Error('Image input is required');
          }

          const { textInput, imageInput, output, size } = props;
          const textInputCost = textInput ? (textInput / million) * 5 : 0;
          const imageInputCost = imageInput ? (imageInput / million) * 10 : 0;
          const outputCost = (output / million) * priceMap[size as ImageSize];

          return textInputCost + imageInputCost + outputCost;
        },
      },
    ],
    supportsEdit: true,
    sizes: ['1024x1024', '1024x1536', '1536x1024'],
    default: true,
    providerOptions: {
      openai: {
        quality: 'high',
      },
    },
  },
  'amazon-nova-canvas-v1': {
    label: 'Nova Canvas',
    icon: AmazonBedrockIcon,
    chef: providers.amazon,
    providers: [
      {
        ...providers['amazon-bedrock'],
        icon: AmazonBedrockIcon,
        model: bedrock.image('amazon.nova-canvas-v1:0'),

        // https://aws.amazon.com/bedrock/pricing/
        getCost: (props) => {
          if (!props) {
            throw new Error('Props are required');
          }

          const { size } = props;

          if (size === '1024x1024') {
            return 0.06;
          }

          if (size === '2048x2048') {
            return 0.08;
          }

          throw new Error('Size is not supported');
        },
      },
    ],

    // Each side must be between 320-4096 pixels, inclusive.
    sizes: ['1024x1024', '2048x2048'],

    providerOptions: {
      bedrock: {
        quality: 'premium',
      },
    },
  },
  'flux-pro-1.1': {
    label: 'FLUX Pro 1.1',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-pro-1.1'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.04,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'flux-pro': {
    label: 'FLUX Pro',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-pro'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.05,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'flux-dev': {
    label: 'FLUX Dev',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-dev'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.025,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
    priceIndicator: 'low',
  },
  'flux-pro-1.0-canny': {
    label: 'FLUX Pro 1.0 Canny',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-pro-1.0-canny'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.05,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'flux-pro-1.0-depth': {
    label: 'FLUX Pro 1.0 Depth',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-pro-1.0-depth'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.05,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'flux-kontext-pro': {
    label: 'FLUX Kontext Pro',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-kontext-pro'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.04,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'flux-kontext-max': {
    label: 'FLUX Kontext Max',
    chef: providers['black-forest-labs'],
    providers: [
      {
        ...providers['black-forest-labs'],
        model: blackForestLabs.image('flux-kontext-max'),

        // https://bfl.ai/pricing/api
        getCost: () => 0.08,
      },
    ],
    sizes: ['1024x1024', '832x1440', '1440x832'],
    supportsEdit: true,
  },
  'photon-1': {
    label: 'Photon 1',
    chef: providers.luma,
    providers: [
      {
        ...providers.luma,
        model: luma.image('photon-1'),

        // https://lumalabs.ai/api/pricing
        getCost: (props) => {
          if (!props) {
            throw new Error('Props are required');
          }

          const { size } = props;

          if (!size) {
            throw new Error('Size is required');
          }

          const [width, height] = size.split('x').map(Number);
          const pixels = width * height;

          return (pixels * 0.0073) / million;
        },
      },
    ],
    sizes: ['1024x1024', '1820x1024', '1024x1820'],
    supportsEdit: true,
  },
  'photon-flash-1': {
    label: 'Photon Flash 1',
    chef: providers.luma,
    providers: [
      {
        ...providers.luma,
        model: luma.image('photon-flash-1'),

        // https://lumalabs.ai/api/pricing
        getCost: (props) => {
          if (!props) {
            throw new Error('Props are required');
          }

          const { size } = props;

          if (!size) {
            throw new Error('Size is required');
          }

          const [width, height] = size.split('x').map(Number);
          const pixels = width * height;

          return (pixels * 0.0019) / million;
        },
      },
    ],
    sizes: ['1024x1024', '1820x1024', '1024x1820'],
    supportsEdit: true,
  },
  'nano-banana-pro-v1': {
    label: 'Nano Banana Pro V1',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-v1'),
        getCost: () => 0.05, // $0.05 per image
      },
    ],
    sizes: ['512x512', '1024x1024', '1536x1536'],
  },
  'nano-banana-pro-v2': {
    label: 'Nano Banana Pro V2',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-v2'),
        getCost: () => 0.08, // $0.08 per image
      },
    ],
    sizes: ['512x512', '1024x1024', '1536x1536', '2048x2048'],
  },
  'nano-banana-pro-ultra': {
    label: 'Nano Banana Pro Ultra',
    chef: providers['nano-banana-pro'],
    providers: [
      {
        ...providers['nano-banana-pro'],
        model: nanoBananaPro.image('nano-banana-pro-ultra'),
        getCost: (props) => {
          if (!props?.size) return 0.12;
          
          const [width, height] = props.size.split('x').map(Number);
          const pixels = width * height;
          
          // Pricing based on resolution
          if (pixels <= 1024 * 1024) return 0.12;
          if (pixels <= 2048 * 2048) return 0.20;
          return 0.35;
        },
      },
    ],
    sizes: ['512x512', '1024x1024', '1536x1536', '2048x2048', '4096x4096'],
    supportsEdit: true,
    default: false,
  },
};
*/
