#!/usr/bin/env node

import { FigmaMCPServer } from '../lib/figma-mcp.js';

async function main() {
  try {
    console.log('Starting Figma MCP Server...');
    
    // Check if required environment variables are set
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      console.error('❌ FIGMA_ACCESS_TOKEN environment variable is required');
      console.log('Please set it in your .env file or export it in your shell');
      process.exit(1);
    }
    
    const server = new FigmaMCPServer();
    await server.start();
    
    console.log('✅ Figma MCP Server started successfully');
    console.log('Server is now listening for MCP connections');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Figma MCP Server...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start Figma MCP Server:', error);
    process.exit(1);
  }
}

main();
