# Design AI Tool

A React component generation tool that uses AI to create layouts based on your existing component library.

## Features Implemented

### ✅ Core Features
- **Component Library Management**: Upload, organize, and manage UI component screenshots
- **AI-Powered Generation**: Generate React JSX code using OpenAI GPT-4
- **Interactive Chat Interface**: Natural language prompts for design generation
- **Live Code Preview**: View and copy generated React code
- **Responsive Design**: Works on desktop and mobile devices

### ✅ Component Upload
- Drag-and-drop image upload with react-dropzone
- Form validation with react-hook-form and zod
- Image preview and file size validation (5MB limit)
- Component categorization (Layout, Navigation, Content, Forms, E-commerce, Other)
- Tag system for better organization
- Edit and delete functionality

### ✅ Component Library
- Grid-based component display
- Search functionality by name, description, and tags
- Category filtering
- Component selection for AI generation
- CRUD operations (Create, Read, Update, Delete)
- Empty state with onboarding guidance

### ✅ AI Integration
- OpenAI GPT-4 integration via Vercel AI SDK
- Intelligent prompt engineering for React code generation
- Component context awareness
- Brand guidelines integration
- Error handling for API failures

### ✅ Chat Interface
- Message history with user and AI responses
- Selected components display
- Real-time generation status
- Code output with syntax highlighting
- Component selection management

### ✅ Code Preview
- Syntax-highlighted code display using react-syntax-highlighter
- Copy to clipboard functionality
- Download as .tsx file
- Responsive viewport preview (Desktop/Tablet/Mobile)
- Tab-based interface (Preview/Code)

### ✅ Data Management
- localStorage-based storage for MVP
- Type-safe data models with TypeScript
- Component and generation history persistence
- Image handling with base64 encoding

## File Structure

```
/components/design-ai/
├── component-upload.tsx      # Upload form with validation
├── component-library.tsx     # Grid view with search/filter
├── chat-interface.tsx        # AI chat for generation
├── code-preview.tsx          # Code display and export
└── index.ts                  # Exports

/components/nodes/design-ai/
├── index.tsx                 # Main node component with connection logic
├── primitive.tsx             # Full interface for standalone use
└── transform.tsx             # Compact interface for connected use

/app/api/design-ai/
├── generate/route.ts         # AI generation endpoint
└── components/route.ts       # Component CRUD API

/lib/
├── types.ts                  # TypeScript interfaces
└── storage.ts                # localStorage utilities
```

## Usage

1. **Access the Tool**: Add a Design AI node (✨ icon) to your canvas from the toolbar
2. **Upload Components**: Use the component library in the node to add screenshots of your UI components
3. **Select Components**: Choose components you want to use for generation
4. **Generate Designs**: Describe what you want to create in the chat interface
5. **Preview & Export**: View the generated code and copy/download it

## API Endpoints

### POST /api/design-ai/generate
Generates React code using selected components and user prompt.

**Request:**
```json
{
  "prompt": "Create a landing page with hero section",
  "selectedComponents": [Component[]],
  "brandGuidelines": "Use modern, clean design"
}
```

**Response:**
```json
{
  "generatedCode": "React JSX string",
  "explanation": "Description of generated design",
  "usedComponents": ["component-id-1", "component-id-2"]
}
```

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI GPT-4** - AI code generation
- **react-dropzone** - File uploads
- **react-hook-form** - Form handling
- **react-syntax-highlighter** - Code display
- **shadcn/ui** - UI components
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## Environment Setup

Ensure you have the OpenAI API key configured:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Future Enhancements

### Planned Features
- **Database Integration**: Replace localStorage with persistent database
- **User Authentication**: Multi-user support with component sharing
- **Live Preview**: Safe JSX rendering with component preview
- **Figma Integration**: Import components directly from Figma
- **Team Collaboration**: Share component libraries across teams
- **Version Control**: Track component and design changes
- **Advanced AI**: Better context understanding and design patterns
- **Export Options**: Multiple output formats (React, Vue, Angular)

### Technical Improvements
- Server-side component storage
- Image optimization and CDN integration
- Real-time collaboration features
- Advanced search with fuzzy matching
- Component dependency tracking
- Design system rules engine
- Performance optimizations

## Security Considerations

- File upload validation (type, size limits)
- Input sanitization for AI prompts
- Rate limiting for API endpoints
- Error handling without exposing internals
- Safe code preview (no arbitrary code execution)

## Performance Notes

- Images stored as base64 in localStorage (5MB limit per image)
- Client-side storage has browser limits (~5-10MB total)
- AI generation typically takes 2-5 seconds
- Responsive design optimized for mobile and desktop

## Contributing

The Design AI Tool is built with extensibility in mind. Key areas for contribution:

1. **AI Prompt Engineering**: Improve code generation quality
2. **Component Recognition**: Better understanding of component relationships
3. **UI/UX**: Enhanced user experience and design
4. **Performance**: Optimization for large component libraries
5. **Integrations**: Connect with design tools and frameworks

## License

This implementation is part of the Tersa project and follows the same license terms.
