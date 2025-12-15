'use client';

import { updateProjectAction } from '@/app/actions/project/update';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSaveProject } from '@/hooks/use-save-project';
import { handleError } from '@/lib/error/handle';
import { uploadFile } from '@/lib/upload';
import { isValidSourceTarget } from '@/lib/xyflow';
import { NodeDropzoneProvider } from '@/providers/node-dropzone';
import { NodeOperationsProvider } from '@/providers/node-operations';
import { useProject } from '@/providers/project';
import {
  Background,
  type IsValidConnection,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  type ReactFlowProps,
  getOutgoers,
  useReactFlow,
} from '@xyflow/react';
import {
  type Edge,
  type Node,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import { BoxSelectIcon, PlusIcon } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { MouseEvent, MouseEventHandler } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { ConnectionLine } from './connection-line';
import { edgeTypes } from './edges';
import { nodeTypes } from './nodes';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu';

export const Canvas = ({ children, ...props }: ReactFlowProps) => {
  const project = useProject();
  const {
    onConnect,
    onConnectStart,
    onConnectEnd,
    onEdgesChange,
    onNodesChange,
    nodes: initialNodes,
    edges: initialEdges,
    ...rest
  } = props ?? {};
  const content = project?.content as { nodes: Node[]; edges: Edge[] };
  const [nodes, setNodes] = useState<Node[]>(
    initialNodes ?? content?.nodes ?? []
  );
  const [edges, setEdges] = useState<Edge[]>(
    initialEdges ?? content?.edges ?? []
  );
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const {
    getEdges,
    toObject,
    screenToFlowPosition,
    getNodes,
    getNode,
    updateNode,
    getViewport,
  } = useReactFlow();
  const analytics = useAnalytics();
  const [saveState, setSaveState] = useSaveProject();

  const save = useDebouncedCallback(async () => {
    if (saveState.isSaving || !project?.userId || !project?.id) {
      return;
    }

    try {
      setSaveState((prev) => ({ ...prev, isSaving: true }));

      const response = await updateProjectAction(project.id, {
        content: toObject(),
      });

      if ('error' in response) {
        throw new Error(response.error);
      }

      setSaveState((prev) => ({ ...prev, lastSaved: new Date() }));
    } catch (error) {
      handleError('Error saving project', error);
    } finally {
      setSaveState((prev) => ({ ...prev, isSaving: false }));
    }
  }, 1000);

  const handleNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      setNodes((current) => {
        const updated = applyNodeChanges(changes, current);
        save();
        onNodesChange?.(changes);
        return updated;
      });
    },
    [save, onNodesChange]
  );

  const handleEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      setEdges((current) => {
        const updated = applyEdgeChanges(changes, current);
        save();
        onEdgesChange?.(changes);
        return updated;
      });
    },
    [save, onEdgesChange]
  );

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      const newEdge: Edge = {
        id: nanoid(),
        type: 'animated',
        ...connection,
      };
      setEdges((eds: Edge[]) => eds.concat(newEdge));
      save();
      onConnect?.(connection);
    },
    [save, onConnect]
  );

  const addNode = useCallback(
    (type: string, options?: Record<string, unknown>) => {
      const { data: nodeData, ...rest } = options ?? {};
      const newNode: Node = {
        id: nanoid(),
        type,
        data: {
          ...(nodeData ? nodeData : {}),
        },
        position: { x: 0, y: 0 },
        origin: [0, 0.5],
        ...rest,
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
      save();

      analytics.track('toolbar', 'node', 'added', {
        type,
      });

      return newNode.id;
    },
    [save, analytics]
  );

  const duplicateNode = useCallback(
    (id: string) => {
      const node = getNode(id);

      if (!node || !node.type) {
        return;
      }

      const { id: oldId, ...rest } = node;

      const newId = addNode(node.type, {
        ...rest,
        position: {
          x: node.position.x + 200,
          y: node.position.y + 200,
        },
        selected: true,
      });

      setTimeout(() => {
        updateNode(id, { selected: false });
        updateNode(newId, { selected: true });
      }, 0);
    },
    [addNode, getNode, updateNode]
  );

  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid

      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const sourceId = connectionState.fromNode?.id;
        const isSourceHandle = connectionState.fromHandle?.type === 'source';

        if (!sourceId) {
          return;
        }

        const newNodeId = addNode('drop', {
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: {
            isSource: !isSourceHandle,
          },
        });

        setEdges((eds: Edge[]) =>
          eds.concat({
            id: nanoid(),
            source: isSourceHandle ? sourceId : newNodeId,
            target: isSourceHandle ? newNodeId : sourceId,
            type: 'temporary',
          })
        );
      }
    },
    [addNode, screenToFlowPosition]
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target);

      // Prevent connecting audio nodes to anything except transcribe nodes
      if (connection.source) {
        const source = nodes.find((node) => node.id === connection.source);

        if (!source || !target) {
          return false;
        }

        const valid = isValidSourceTarget(source, target);

        if (!valid) {
          return false;
        }
      }

      // Prevent cycles
      const hasCycle = (node: Node, visited = new Set<string>()) => {
        if (visited.has(node.id)) {
          return false;
        }

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source || hasCycle(outgoer, visited)) {
            return true;
          }
        }
      };

      if (!target || target.id === connection.source) {
        return false;
      }

      return !hasCycle(target);
    },
    [getNodes, getEdges]
  );

  const handleConnectStart = useCallback<OnConnectStart>(() => {
    // Delete any drop nodes when starting to drag a node
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.type !== 'drop'));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.type !== 'temporary'));
    save();
  }, [save]);

  const addDropNode = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const { x, y } = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode('drop', {
        position: { x, y },
      });
    },
    [addNode, screenToFlowPosition]
  );

  const handleSelectAll = useCallback(() => {
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) => ({ ...node, selected: true }))
    );
  }, []);

  const handleCopy = useCallback(() => {
    const selectedNodes = getNodes().filter((node) => node.selected);
    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
    }
  }, [getNodes]);

  const handlePasteImage = useCallback(
    async (file: File) => {
      // Upload the file
      const uploaded = await uploadFile(file, 'files');

      // Get the current viewport
      const viewport = getViewport();

      // Calculate the center of the current viewport
      const centerX =
        -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const centerY =
        -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

      // Create image node
      addNode('image', {
        data: {
          content: {
            url: uploaded.url,
            type: uploaded.type,
            name: file.name,
          },
        },
        position: {
          x: centerX,
          y: centerY,
        },
      });

      analytics.track('toolbar', 'node', 'added', {
        type: 'image',
        source: 'clipboard',
      });
    },
    [addNode, getViewport, analytics]
  );

  const handlePaste = useCallback(async () => {
    // Don't handle paste if user is typing in an input field
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable)
    ) {
      return;
    }

    // First, try to check clipboard for images using Clipboard API
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();

        for (const clipboardItem of clipboardItems) {
          const imageTypes = clipboardItem.types.filter((type) =>
            type.startsWith('image/')
          );

          if (imageTypes.length > 0) {
            const imageType = imageTypes[0];
            const blob = await clipboardItem.getType(imageType);

            // Convert blob to file
            const file = new File(
              [blob],
              `clipboard-image.${imageType.split('/')[1] || 'png'}`,
              {
                type: imageType,
              }
            );

            await handlePasteImage(file);
            return; // Image handled, don't proceed to node paste
          }
        }
      }
    } catch (error) {
      // Clipboard API might not be available or permission denied
      // Fall through to check for copied nodes
      console.debug('Clipboard API not available:', error);
    }

    // Fall back to pasting copied nodes if no image found
    if (copiedNodes.length === 0) {
      return;
    }

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: nanoid(),
      position: {
        x: node.position.x + 200,
        y: node.position.y + 200,
      },
      selected: true,
    }));

    // Unselect all existing nodes
    setNodes((nodes: Node[]) =>
      nodes.map((node: Node) => ({
        ...node,
        selected: false,
      }))
    );

    // Add new nodes
    setNodes((nodes: Node[]) => [...nodes, ...newNodes]);
  }, [copiedNodes, handlePasteImage]);

  const handleDuplicateAll = useCallback(() => {
    const selected = getNodes().filter((node) => node.selected);

    for (const node of selected) {
      duplicateNode(node.id);
    }
  }, [getNodes, duplicateNode]);

  const handleContextMenu = useCallback((event: MouseEvent) => {
    if (
      !(event.target instanceof HTMLElement) ||
      !event.target.classList.contains('react-flow__pane')
    ) {
      event.preventDefault();
    }
  }, []);

  useHotkeys('meta+a', handleSelectAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+d', handleDuplicateAll, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+c', handleCopy, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  useHotkeys('meta+v', handlePaste, {
    enableOnContentEditable: false,
    preventDefault: true,
  });

  // Also listen to paste events as a fallback (in case Clipboard API fails)
  useEffect(() => {
    if (!project) return;

    const handlePasteEvent = async (event: ClipboardEvent) => {
      // Don't handle paste if user is typing in an input field
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      // Check if clipboard contains image data using the paste event
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();

          const file = item.getAsFile();
          if (!file) continue;

          await handlePasteImage(file);
          break; // Only handle the first image
        }
      }
    };

    // Use capture phase to catch paste events early
    document.addEventListener('paste', handlePasteEvent, true);

    return () => {
      document.removeEventListener('paste', handlePasteEvent, true);
    };
  }, [project, handlePasteImage]);

  return (
    <NodeOperationsProvider addNode={addNode} duplicateNode={duplicateNode}>
      <NodeDropzoneProvider>
        <ContextMenu>
          <ContextMenuTrigger onContextMenu={handleContextMenu}>
            <ReactFlow
              deleteKeyCode={['Backspace', 'Delete']}
              nodes={nodes}
              onNodesChange={handleNodesChange}
              edges={edges}
              onEdgesChange={handleEdgesChange}
              onConnectStart={handleConnectStart}
              onConnect={handleConnect}
              onConnectEnd={handleConnectEnd}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              isValidConnection={isValidConnection}
              connectionLineComponent={ConnectionLine}
              panOnScroll
              fitView
              zoomOnDoubleClick={false}
              panOnDrag={false}
              selectionOnDrag={true}
              onDoubleClick={addDropNode}
              {...rest}
            >
              <Background />
              {children}
            </ReactFlow>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={addDropNode}>
              <PlusIcon size={12} />
              <span>Add a new node</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleSelectAll}>
              <BoxSelectIcon size={12} />
              <span>Select all</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </NodeDropzoneProvider>
    </NodeOperationsProvider>
  );
};
