"use client";

import { useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from '@/components/nodes';
import { edgeTypes } from '@/components/edges';
import { Button } from '@/components/ui/button';
import { SparklesIcon, PlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Toaster } from '@/components/ui/sonner';

const initialNodes = [
  {
    id: 'welcome',
    type: 'text',
    position: { x: 100, y: 100 },
    data: {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Welcome to the Design AI Node Test! Click the "Add Design AI Node" button to test the functionality.'
              }
            ]
          }
        ]
      },
      text: 'Welcome to the Design AI Node Test! Click the "Add Design AI Node" button to test the functionality.'
    }
  }
];

export default function TestCanvasPage() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);

  const addDesignAINode = () => {
    const newNode = {
      id: nanoid(),
      type: 'design-ai',
      position: { x: 400, y: 200 },
      data: {
        prompt: '',
        selectedComponents: [],
      }
    };

    setNodes(prev => [...prev, newNode]);
  };

  const addTextNode = () => {
    const newNode = {
      id: nanoid(),
      type: 'text',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Sample text content for Design AI context'
                }
              ]
            }
          ]
        },
        text: 'Sample text content for Design AI context'
      }
    };

    setNodes(prev => [...prev, newNode]);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Design AI Node Test</h1>
          <p className="text-gray-600">Test the Design AI node integration in the canvas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={addTextNode} variant="outline">
            <PlusIcon className="size-4 mr-2" />
            Add Text Node
          </Button>
          <Button onClick={addDesignAINode}>
            <SparklesIcon className="size-4 mr-2" />
            Add Design AI Node
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={(changes) => {
              setNodes(prev => {
                const updated = prev.map(node => {
                  const change = changes.find(c => c.id === node.id);
                  if (change && change.type === 'position' && change.position) {
                    return { ...node, position: change.position };
                  }
                  if (change && change.type === 'remove') {
                    return null;
                  }
                  return node;
                }).filter(Boolean);
                return updated;
              });
            }}
            onEdgesChange={(changes) => {
              setEdges(prev => {
                return prev.filter(edge => 
                  !changes.some(change => 
                    change.type === 'remove' && change.id === edge.id
                  )
                );
              });
            }}
            onConnect={(connection) => {
              const newEdge = {
                id: nanoid(),
                type: 'animated',
                ...connection,
              };
              setEdges(prev => [...prev, newEdge]);
            }}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-t p-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-semibold mb-2">🧪 Testing Instructions:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Basic Test:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Click "Add Design AI Node"</li>
                <li>Upload components in the Components tab</li>
                <li>Enter a prompt in the Prompt tab</li>
                <li>Click Generate Design</li>
                <li>View results in Output tab</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-1">Advanced Test:</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Add a Text Node with content</li>
                <li>Connect Text Node to Design AI Node</li>
                <li>Notice the compact Transform interface</li>
                <li>Generate with enhanced context</li>
                <li>Verify context integration</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
