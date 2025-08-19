import { useNodeConnections } from '@xyflow/react';
import { DesignAIPrimitive } from './primitive';
import { DesignAITransform } from './transform';

export type DesignAINodeProps = {
  type: string;
  data: {
    generated?: {
      code: string;
      explanation?: string;
      usedComponents?: string[];
    };
    model?: string;
    updatedAt?: string;
    instructions?: string;
    selectedComponents?: string[];
    componentLibrary?: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      tags: string[];
      imageUrl: string;
    }>;
    prompt?: string;
  };
  id: string;
};

export const DesignAINode = (props: DesignAINodeProps) => {
  const connections = useNodeConnections({
    id: props.id,
    handleType: 'target',
  });
  const Component = connections.length ? DesignAITransform : DesignAIPrimitive;

  return <Component {...props} title="Design AI" />;
};
