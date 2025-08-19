import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { env } from './env.js';

interface FigmaComponent {
  id: string;
  name: string;
  description?: string;
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
  thumbnail_url?: string;
  components: Record<string, FigmaComponent>;
  component_sets: Record<string, any>;
}

class FigmaMCPServer {
  private server: Server;
  private figmaAccessToken: string;
  private teamId?: string;
  private projectId?: string;

  constructor() {
    if (!env.FIGMA_ACCESS_TOKEN) {
      throw new Error('FIGMA_ACCESS_TOKEN is required for Figma MCP server');
    }
    
    this.figmaAccessToken = env.FIGMA_ACCESS_TOKEN;
    this.teamId = env.FIGMA_TEAM_ID;
    this.projectId = env.FIGMA_PROJECT_ID;

    this.server = new Server(
      {
        name: 'figma-mcp-server',
        version: '1.0.0',
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_figma_components',
            description: 'List all components from a Figma file',
            inputSchema: {
              type: 'object',
              properties: {
                file_key: {
                  type: 'string',
                  description: 'The Figma file key to fetch components from',
                },
              },
              required: ['file_key'],
            },
          },
          {
            name: 'get_figma_component_details',
            description: 'Get detailed information about a specific Figma component',
            inputSchema: {
              type: 'object',
              properties: {
                file_key: {
                  type: 'string',
                  description: 'The Figma file key',
                },
                component_id: {
                  type: 'string',
                  description: 'The component ID to fetch details for',
                },
              },
              required: ['file_key', 'component_id'],
            },
          },
          {
            name: 'sync_figma_design_system',
            description: 'Sync all components from a Figma file to create a design system',
            inputSchema: {
              type: 'object',
              properties: {
                file_key: {
                  type: 'string',
                  description: 'The Figma file key to sync',
                },
                include_thumbnails: {
                  type: 'boolean',
                  description: 'Whether to include component thumbnails',
                  default: true,
                },
              },
              required: ['file_key'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args || typeof args !== 'object') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Invalid arguments provided',
            },
          ],
        };
      }

      try {
        switch (name) {
          case 'list_figma_components':
            if (typeof args.file_key === 'string') {
              return await this.listFigmaComponents(args.file_key);
            }
            break;
          case 'get_figma_component_details':
            if (typeof args.file_key === 'string' && typeof args.component_id === 'string') {
              return await this.getFigmaComponentDetails(args.file_key, args.component_id);
            }
            break;
          case 'sync_figma_design_system':
            if (typeof args.file_key === 'string') {
              const includeThumbnails = typeof args.include_thumbnails === 'boolean' ? args.include_thumbnails : true;
              return await this.syncFigmaDesignSystem(args.file_key, includeThumbnails);
            }
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        throw new Error('Invalid arguments for tool');
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'figma://components',
            name: 'Figma Components',
            description: 'Access to Figma design system components',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'figma://components') {
        try {
          const components = await this.listFigmaComponents(this.projectId || '');
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(components, null, 2),
              },
            ],
          };
        } catch (error) {
          throw new Error(`Failed to read Figma components: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async listFigmaComponents(fileKey: string): Promise<any> {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': this.figmaAccessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const file: FigmaFile = await response.json();
    
    const components = Object.values(file.components).map(component => ({
      id: component.id,
      name: component.name,
      key: component.key,
      file_key: component.file_key,
      thumbnail_url: component.thumbnail_url,
      created_at: component.created_at,
      updated_at: component.updated_at,
      containing_frame: component.containing_frame,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${components.length} components in Figma file "${file.name}":\n\n${components.map(comp => 
            `- ${comp.name} (ID: ${comp.id})\n  Frame: ${comp.containing_frame?.name || 'N/A'}\n  Updated: ${new Date(comp.updated_at).toLocaleDateString()}`
          ).join('\n\n')}`,
        },
      ],
      metadata: {
        components,
        file_info: {
          name: file.name,
          key: file.key,
          last_modified: file.last_modified,
        },
      },
    };
  }

  private async getFigmaComponentDetails(fileKey: string, componentId: string): Promise<any> {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/component_sets/${componentId}`, {
      headers: {
        'X-Figma-Token': this.figmaAccessToken,
      },
    });

    if (!response.ok) {
      // Try getting as individual component if component set fails
      const componentResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/components/${componentId}`, {
        headers: {
          'X-Figma-Token': this.figmaAccessToken,
        },
      });

      if (!componentResponse.ok) {
        throw new Error(`Figma API error: ${componentResponse.status} ${componentResponse.statusText}`);
      }

      const component = await componentResponse.json();
      return {
        content: [
          {
            type: 'text',
            text: `Component Details:\n\nName: ${component.name}\nID: ${component.id}\nKey: ${component.key}\nCreated: ${new Date(component.created_at).toLocaleDateString()}\nUpdated: ${new Date(component.updated_at).toLocaleDateString()}`,
          },
        ],
        metadata: { component },
      };
    }

    const componentSet = await response.json();
    return {
      content: [
        {
          type: 'text',
          text: `Component Set Details:\n\nName: ${componentSet.name}\nID: ${componentSet.id}\nKey: ${componentSet.key}\nCreated: ${new Date(componentSet.created_at).toLocaleDateString()}\nUpdated: ${new Date(componentSet.updated_at).toLocaleDateString()}`,
        },
      ],
      metadata: { componentSet },
    };
  }

  private async syncFigmaDesignSystem(fileKey: string, includeThumbnails: boolean = true): Promise<any> {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': this.figmaAccessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const file: FigmaFile = await response.json();
    
    const components = Object.values(file.components).map(component => ({
      id: component.id,
      name: component.name,
      key: component.key,
      file_key: component.file_key,
      thumbnail_url: includeThumbnails ? component.thumbnail_url : undefined,
      created_at: component.created_at,
      updated_at: component.updated_at,
      containing_frame: component.containing_frame,
      component_properties: component.component_properties,
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Successfully synced ${components.length} components from Figma file "${file.name}". The components are now available for use in your design system.`,
        },
      ],
      metadata: {
        synced_components: components,
        file_info: {
          name: file.name,
          key: file.key,
          last_modified: file.last_modified,
        },
        sync_timestamp: new Date().toISOString(),
      },
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Figma MCP Server started');
  }
}

export { FigmaMCPServer };
