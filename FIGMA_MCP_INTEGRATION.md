# Figma MCP Integration for Design AI

This integration allows you to automatically sync your Figma design system components into the Design AI tool, eliminating the need for manual component uploads.

## 🚀 Features

- **Automatic Component Sync**: Import all components from a Figma file with one click
- **Smart Categorization**: Components are automatically categorized based on names and frames
- **Property Extraction**: Component properties and variants are preserved
- **Thumbnail Support**: Optional component thumbnails for visual previews
- **Bidirectional Linking**: Each component maintains a link back to its Figma source
- **Incremental Updates**: Sync again anytime to get the latest changes from Figma

## 🛠️ Setup

### 1. Get Figma Access Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Navigate to "Personal access tokens"
3. Click "Create new token"
4. Give it a name (e.g., "Design AI Integration")
5. Copy the generated token

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Required
FIGMA_ACCESS_TOKEN=your_figma_access_token_here

# Optional (for team/project-specific syncs)
FIGMA_TEAM_ID=your_team_id_here
FIGMA_PROJECT_ID=your_project_id_here
```

### 3. Install Dependencies

```bash
npm install
```

## 📖 Usage

### Basic Component Sync

1. **Open the Design AI Tool**
   - Navigate to your Design AI workspace
   - Click on the "Figma Sync" tab

2. **Enter Figma File Information**
   - Paste your Figma file URL or enter the file key
   - Click "Check File Info" to verify access
   - Optionally enable/disable thumbnails

3. **Sync Components**
   - Click "Sync Components from Figma"
   - Wait for the sync to complete
   - View your imported components in the Component Library

### Finding Your Figma File Key

The file key is the long string in your Figma file URL:
```
https://www.figma.com/file/ABC123DEF456/My-Design-System
                    ^^^^^^^^^^^^^^^^
                    This is your file key
```

## 🔧 MCP Server (Advanced)

For advanced integrations, you can run the Figma MCP server directly:

```bash
# Set environment variable
export FIGMA_ACCESS_TOKEN=your_token_here

# Start the MCP server
node scripts/start-figma-mcp.js
```

### MCP Tools Available

- `list_figma_components`: List all components from a Figma file
- `get_figma_component_details`: Get detailed information about a specific component
- `sync_figma_design_system`: Sync all components to create a design system

## 🎯 How It Works

### 1. Component Discovery
- Fetches all components from your Figma file
- Extracts component metadata (name, description, properties)
- Identifies component relationships and variants

### 2. Smart Categorization
Components are automatically categorized based on:
- **Component names** (e.g., "Button" → Forms, "NavBar" → Navigation)
- **Frame names** (e.g., "Form Components" → Forms)
- **Component properties** (e.g., form fields → Forms)

### 3. Tag Generation
Tags are automatically created from:
- Component properties and variants
- Frame names and hierarchies
- Component categories
- Custom naming conventions

### 4. Data Preservation
Each synced component maintains:
- Original Figma ID and key
- File reference and URL
- Creation and update timestamps
- Component properties and variants
- Frame hierarchy information

## 🔄 Syncing Workflow

### Initial Sync
1. First sync imports all components
2. Components are categorized and tagged
3. Thumbnails are generated (if enabled)
4. Components appear in your library

### Incremental Updates
1. Run sync again anytime
2. New components are added
3. Existing components are updated
4. Deleted components remain (for safety)

### Best Practices
- **Regular Syncs**: Sync weekly to keep components up-to-date
- **Thumbnails**: Enable for visual previews, disable for faster syncs
- **Naming**: Use consistent naming conventions in Figma for better categorization
- **Organization**: Group related components in frames for better organization

## 🎨 Component Categories

The system automatically categorizes components into:

- **Layout**: Containers, sections, grids, wrappers
- **Navigation**: Headers, footers, menus, breadcrumbs
- **Content**: Cards, lists, tables, media displays
- **Forms**: Inputs, buttons, checkboxes, form layouts
- **E-commerce**: Product cards, cart components, checkout flows
- **Other**: Uncategorized components

## 🔗 Integration Points

### Design AI Generation
- Synced components are automatically available in the AI generation
- Component properties inform AI suggestions
- Frame hierarchies provide context for layouts

### Component Library
- All Figma components appear in your component library
- Filter and search by category, tags, or Figma source
- Edit component metadata while preserving Figma links

### Code Generation
- AI uses Figma component context for better code generation
- Component properties inform responsive behavior
- Frame hierarchies suggest layout structures

## 🚨 Troubleshooting

### Common Issues

**"Figma API error: 403 Forbidden"**
- Check your access token is valid
- Ensure you have access to the Figma file
- Verify the file is not private or restricted

**"No components found"**
- Check the file contains published components
- Ensure components are not in private frames
- Verify the file key is correct

**"Sync failed"**
- Check your internet connection
- Verify Figma API is accessible
- Check browser console for detailed errors

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=figma-mcp:*
```

## 🔮 Future Enhancements

- **Auto-sync**: Periodic automatic syncing
- **Component Variants**: Support for Figma component variants
- **Design Tokens**: Extract color, typography, and spacing tokens
- **Collaboration**: Team-based component sharing
- **Version History**: Track component changes over time

## 📚 API Reference

### Figma Sync Endpoint

```typescript
POST /api/figma/sync
{
  "fileKey": "string",
  "includeThumbnails": boolean
}
```

### Response Format

```typescript
{
  "success": boolean,
  "message": string,
  "components": Component[],
  "fileInfo": {
    "name": string,
    "key": string,
    "lastModified": string,
    "componentCount": number
  },
  "syncTimestamp": string
}
```

## 🤝 Contributing

To contribute to this integration:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This integration is part of the Tersa Design AI tool and follows the same license terms.

## 🆘 Support

For support with the Figma integration:

1. Check this documentation
2. Review the troubleshooting section
3. Check existing GitHub issues
4. Create a new issue with detailed information

---

**Happy designing! 🎨✨**
