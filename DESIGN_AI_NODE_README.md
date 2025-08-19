# Design AI Node - Canvas Integration

The Design AI Tool has been successfully integrated into Tersa's node-based canvas system! 🎉

## 🎯 **How It Works**

### **As a Standalone Node (Primitive Mode)**
When the Design AI node has no input connections:
- Full-featured interface with tabbed layout (Prompt, Components, Output)
- Component library browser with selection capabilities
- Direct prompt input and AI generation
- Code preview and copy functionality

### **As a Connected Node (Transform Mode)**
When connected to other nodes in the workflow:
- Compact interface optimized for workflow integration
- Automatically incorporates context from connected nodes
- Enhanced prompts that include upstream node data
- Seamless data flow through the canvas

## 🚀 **Features**

### ✅ **Core Functionality**
- **AI Code Generation**: Uses OpenAI GPT-4 to generate React components
- **Component Library**: Integrated component management and selection
- **Context Awareness**: Incorporates data from connected nodes
- **Real-time Updates**: Live generation with progress indicators
- **Copy & Export**: Easy code copying and export functionality

### ✅ **Canvas Integration**
- **Visual Workflow**: Drag and drop Design AI nodes onto the canvas
- **Node Connections**: Connect to text, image, or other nodes for context
- **Data Flow**: Passes generated code to downstream nodes
- **State Management**: Persists node data with project saves
- **Responsive UI**: Adapts interface based on available space

## 🎨 **Usage Examples**

### Example 1: Standalone Design Generation
1. Add a Design AI node from the toolbar (✨ icon)
2. Switch to "Components" tab and select your UI components
3. Switch to "Prompt" tab and describe your design
4. Click "Generate Design" to create React code
5. View and copy the generated code from "Output" tab

### Example 2: Connected Workflow
1. Create a Text node with content description
2. Add a Design AI node and connect the Text node to it
3. Select components and add additional prompt context
4. Generate design - the AI will incorporate the text content
5. Connect output to a Code node for further processing

### Example 3: Multi-Input Design
1. Connect multiple nodes (Text, Image descriptions, etc.)
2. Design AI node will combine all input context
3. Generate comprehensive designs using all connected data
4. Pass results to downstream nodes for additional processing

## 🔧 **Technical Details**

### **File Structure**
```
/components/nodes/design-ai/
├── index.tsx          # Main node component with connection logic
├── primitive.tsx      # Full interface for standalone use
└── transform.tsx      # Compact interface for connected use
```

### **Node Data Structure**
```typescript
{
  generated?: {
    code: string;
    explanation?: string;
    usedComponents?: string[];
  };
  prompt?: string;
  selectedComponents?: string[];
  componentLibrary?: Component[];
  updatedAt?: string;
}
```

### **API Integration**
- Uses existing `/api/design-ai/generate` endpoint
- Enhanced prompts include context from connected nodes
- Automatic error handling and user feedback
- Real-time generation status updates

## 🎯 **Workflow Patterns**

### **Content → Design → Code**
```
[Text Node] → [Design AI Node] → [Code Node]
```
Text content flows into design generation, then to code processing.

### **Multi-Source Design**
```
[Text Node] ↘
              [Design AI Node] → [Output]
[Image Node] ↗
```
Multiple content sources inform the design generation.

### **Iterative Design**
```
[Design AI Node] → [Text Node] → [Design AI Node] → [Final Output]
```
Use generated designs as input for further refinement.

## 🚀 **Getting Started**

1. **Ensure API Key is Set**: Your OpenAI API key is already configured
2. **Add Components**: Use the component library to upload your UI components
3. **Create Workflow**: Add Design AI nodes to your canvas
4. **Connect & Generate**: Connect nodes and generate designs
5. **Export & Use**: Copy generated code for your projects

## 💡 **Pro Tips**

- **Use Connections**: Connect text/image nodes for richer context
- **Iterate Designs**: Use generated code as input for refinements
- **Component Selection**: Choose relevant components for better results
- **Prompt Engineering**: Be specific about layout, styling, and behavior
- **Workflow Patterns**: Create reusable workflow templates

## 🎉 **Ready to Use!**

The Design AI node is now fully integrated into the Tersa canvas system. You can:

1. **Access it**: Look for the ✨ (Sparkles) icon in the bottom toolbar
2. **Drag & Drop**: Add it to your canvas like any other node
3. **Connect**: Link it to other nodes for enhanced context
4. **Generate**: Create beautiful React components with AI
5. **Export**: Copy and use the generated code in your projects

The node-based approach makes the Design AI Tool much more powerful by allowing it to work with other data sources and be part of larger creative workflows! 🚀
