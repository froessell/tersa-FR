# Design AI Tool - Product Requirements Document

## Overview
A web application that enables design teams to generate React component layouts using AI by combining their existing component library with design prompts. Users upload screenshots of their components, then use a chat interface to generate new design concepts using those components.

## Tech Stack
- **Framework**: Next.js 14+ (using Tersa starter)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **AI Integration**: OpenAI API or Anthropic Claude API
- **File Upload**: react-dropzone
- **Icons**: lucide-react
- **Database**: Start with localStorage, migrate to database later

## MVP Feature Requirements

### 1. Component Library Management

#### 1.1 Component Upload
- **File Upload Interface**: Drag-and-drop zone for image uploads (PNG, JPG, WebP)
- **Component Form**:
  - Name (required, string)
  - Description (required, textarea)
  - Category (dropdown: Layout, Navigation, Content, Forms, E-commerce, Other)
  - Tags (optional, comma-separated)
- **Image Preview**: Display uploaded screenshot with component details
- **Validation**: Ensure name is unique, description is at least 10 characters

#### 1.2 Component Library View
- **Grid Layout**: Display all components in responsive grid
- **Component Cards**: Show screenshot, name, category, and description
- **Filter/Search**: Filter by category, search by name/tags
- **Edit/Delete**: Ability to modify or remove components
- **Empty State**: Helpful onboarding when library is empty

### 2. Design Generation Interface

#### 2.1 Chat Interface
- **Message Input**: Text area for design prompts
- **Message History**: Display conversation between user and AI
- **Component Reference**: Show selected components from library in sidebar
- **Loading States**: Clear indication when AI is generating
- **Error Handling**: Graceful error messages for API failures

#### 2.2 AI Integration
- **API Endpoint**: `/api/generate` for handling AI requests
- **Prompt Engineering**: 
  - Include component library context
  - Brand guidelines (spacing, colors, layout principles)
  - Component relationships and best practices
  - React/Tailwind code generation instructions
- **Response Processing**: Parse AI response to extract React JSX code
- **Fallback Handling**: Handle cases where AI doesn't generate valid code

### 3. Design Preview & Output

#### 3.1 Code Preview
- **Live Preview**: Render generated React components in real-time
- **Code Display**: Syntax-highlighted JSX code with copy functionality
- **Responsive Preview**: Toggle between desktop/tablet/mobile views
- **Error Boundaries**: Handle rendering errors gracefully

#### 3.2 Export Options
- **Copy Code**: One-click copy of generated JSX
- **Download**: Save as .tsx file
- **Share**: Generate shareable link to preview (stretch goal)

## Data Models

### Component
```typescript
interface Component {
  id: string;
  name: string;
  description: string;
  category: 'Layout' | 'Navigation' | 'Content' | 'Forms' | 'E-commerce' | 'Other';
  tags: string[];
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Generation Request
```typescript
interface GenerationRequest {
  id: string;
  prompt: string;
  selectedComponents: Component[];
  generatedCode: string;
  createdAt: Date;
}
```

## API Specifications

### POST /api/components
**Purpose**: Create new component
**Body**:
```json
{
  "name": "Primary Button",
  "description": "Main CTA button with hover states",
  "category": "Forms",
  "tags": ["button", "cta", "primary"],
  "imageFile": "File object"
}
```

### GET /api/components
**Purpose**: Retrieve all components
**Response**:
```json
{
  "components": [Component[]],
  "total": number
}
```

### POST /api/generate
**Purpose**: Generate design with AI
**Body**:
```json
{
  "prompt": "Create a landing page with hero section and CTA",
  "componentIds": ["comp-1", "comp-2"],
  "brandGuidelines": "Use 16px spacing, primary color blue"
}
```
**Response**:
```json
{
  "generatedCode": "JSX string",
  "explanation": "Brief explanation of design decisions",
  "usedComponents": ["comp-1", "comp-2"]
}
```

## File Structure
```
/app
  /components
    /ui
      - button.tsx
      - input.tsx
      - card.tsx
    /library
      - component-upload.tsx
      - component-grid.tsx
      - component-card.tsx
    /chat
      - chat-interface.tsx
      - message-list.tsx
      - prompt-input.tsx
    /preview
      - code-preview.tsx
      - design-preview.tsx
  /api
    /components
      - route.ts
    /generate
      - route.ts
  /lib
    - ai-service.ts
    - storage.ts
    - types.ts
  /page.tsx (main layout with component library + chat)
```

## UI/UX Requirements

### Layout
- **Split Screen**: Component library on left (30%), chat + preview on right (70%)
- **Responsive**: Collapse to tabs on mobile
- **Navigation**: Simple header with app name and basic navigation

### Design System
- **Colors**: Use Tailwind default palette, primary blue theme
- **Typography**: Clean, readable fonts (Inter/system fonts)
- **Spacing**: Consistent 4px grid system
- **Components**: Use shadcn/ui patterns where possible

### User Flow
1. **Onboarding**: Guide users to upload first component
2. **Component Building**: Easy upload flow with clear validation
3. **Generation**: Intuitive chat interface with component context
4. **Preview**: Clear code output with copy functionality

## Success Metrics
- **Time to First Generation**: User can upload components and generate design in < 5 minutes
- **Code Quality**: Generated React code is syntactically correct 90% of time
- **User Engagement**: Users generate multiple designs per session

## Technical Considerations

### Performance
- **Image Optimization**: Compress uploaded screenshots
- **Code Parsing**: Validate generated JSX before display
- **API Rate Limiting**: Handle AI API rate limits gracefully

### Security
- **File Upload**: Validate file types and sizes
- **Input Sanitization**: Clean user prompts before sending to AI
- **Error Handling**: Never expose internal errors to users

### Scalability
- **Storage**: Start with localStorage, plan for database migration
- **API Costs**: Monitor AI API usage and implement usage limits
- **Caching**: Cache component library data

## Out of Scope (Future Features)
- User authentication
- Team collaboration
- Visual editor for generated designs
- Figma integration
- Advanced component relationships
- Design system rules engine
- Version control for components
- Real-time collaboration

## Definition of Done
- [ ] Users can upload and manage component library
- [ ] Chat interface generates valid React code using uploaded components
- [ ] Preview renders generated designs correctly
- [ ] Code can be copied and used in external projects
- [ ] Basic error handling and loading states implemented
- [ ] Responsive design works on desktop and mobile
- [ ] Performance is acceptable (< 3s for generation)