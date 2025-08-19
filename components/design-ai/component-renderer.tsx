"use client";

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangleIcon, CodeIcon, PlayIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ComponentRendererProps {
  code: string;
  onError?: (error: string) => void;
}

interface ParsedComponent {
  imports: string[];
  componentName: string;
  props: string[];
  jsx: string;
  hasErrors: boolean;
  errorMessage?: string;
}

// Safe component mapping for common UI elements
const SafeComponents: Record<string, React.ComponentType<any>> = {
  // Basic HTML elements
  div: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  span: ({ children, className, ...props }: any) => (
    <span className={className} {...props}>{children}</span>
  ),
  p: ({ children, className, ...props }: any) => (
    <p className={className} {...props}>{children}</p>
  ),
  h1: ({ children, className, ...props }: any) => (
    <h1 className={className} {...props}>{children}</h1>
  ),
  h2: ({ children, className, ...props }: any) => (
    <h2 className={className} {...props}>{children}</h2>
  ),
  h3: ({ children, className, ...props }: any) => (
    <h3 className={className} {...props}>{children}</h3>
  ),
  h4: ({ children, className, ...props }: any) => (
    <h4 className={className} {...props}>{children}</h4>
  ),
  h5: ({ children, className, ...props }: any) => (
    <h5 className={className} {...props}>{children}</h5>
  ),
  h6: ({ children, className, ...props }: any) => (
    <h6 className={className} {...props}>{children}</h6>
  ),
  button: ({ children, className, onClick, ...props }: any) => (
    <button 
      className={className} 
      onClick={onClick ? () => console.log('Button clicked') : undefined}
      {...props}
    >
      {children}
    </button>
  ),
  a: ({ children, className, href, ...props }: any) => (
    <a className={className} href={href} {...props}>{children}</a>
  ),
  img: ({ src, alt, className, ...props }: any) => (
    <img src={src} alt={alt} className={className} {...props} />
  ),
  ul: ({ children, className, ...props }: any) => (
    <ul className={className} {...props}>{children}</ul>
  ),
  ol: ({ children, className, ...props }: any) => (
    <ol className={className} {...props}>{children}</ol>
  ),
  li: ({ children, className, ...props }: any) => (
    <li className={className} {...props}>{children}</li>
  ),
  form: ({ children, className, onSubmit, ...props }: any) => (
    <form 
      className={className} 
      onSubmit={onSubmit ? (e: any) => { e.preventDefault(); console.log('Form submitted'); } : undefined}
      {...props}
    >
      {children}
    </form>
  ),
  input: ({ type, placeholder, className, ...props }: any) => (
    <input type={type} placeholder={placeholder} className={className} {...props} />
  ),
  textarea: ({ placeholder, className, ...props }: any) => (
    <textarea placeholder={placeholder} className={className} {...props} />
  ),
  label: ({ children, className, ...props }: any) => (
    <label className={className} {...props}>{children}</label>
  ),
  section: ({ children, className, ...props }: any) => (
    <section className={className} {...props}>{children}</section>
  ),
  header: ({ children, className, ...props }: any) => (
    <header className={className} {...props}>{children}</header>
  ),
  footer: ({ children, className, ...props }: any) => (
    <footer className={className} {...props}>{children}</footer>
  ),
  nav: ({ children, className, ...props }: any) => (
    <nav className={className} {...props}>{children}</nav>
  ),
  main: ({ children, className, ...props }: any) => (
    <main className={className} {...props}>{children}</main>
  ),
  article: ({ children, className, ...props }: any) => (
    <article className={className} {...props}>{children}</article>
  ),
  aside: ({ children, className, ...props }: any) => (
    <aside className={className} {...props}>{children}</aside>
  ),
  table: ({ children, className, ...props }: any) => (
    <table className={className} {...props}>{children}</table>
  ),
  thead: ({ children, className, ...props }: any) => (
    <thead className={className} {...props}>{children}</thead>
  ),
  tbody: ({ children, className, ...props }: any) => (
    <tbody className={className} {...props}>{children}</tbody>
  ),
  tr: ({ children, className, ...props }: any) => (
    <tr className={className} {...props}>{children}</tr>
  ),
  th: ({ children, className, ...props }: any) => (
    <th className={className} {...props}>{children}</th>
  ),
  td: ({ children, className, ...props }: any) => (
    <td className={className} {...props}>{children}</td>
  ),
};

// Parse the generated code to extract component information
function parseComponentCode(code: string): ParsedComponent {
  try {
    // Extract imports
    const importMatches = code.match(/import\s+.*?from\s+['"][^'"]+['"];?/g) || [];
    const imports = importMatches.map(imp => imp.trim());

    // Extract component name
    const componentNameMatch = code.match(/export\s+(?:const|function)\s+(\w+)/);
    const componentName = componentNameMatch ? componentNameMatch[1] : 'GeneratedComponent';

    // Extract props interface if it exists
    const propsMatch = code.match(/interface\s+(\w+)Props\s*\{([^}]+)\}/);
    const props = propsMatch ? 
      propsMatch[2].split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'))
        .map(line => line.split(':')[0].trim())
        .filter(Boolean) : [];

    // Extract JSX content (simplified approach)
    const jsxMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    const jsx = jsxMatch ? jsxMatch[1].trim() : '';

    return {
      imports,
      componentName,
      props,
      jsx,
      hasErrors: false
    };
  } catch (error) {
    return {
      imports: [],
      componentName: 'GeneratedComponent',
      props: [],
      jsx: '',
      hasErrors: true,
      errorMessage: error instanceof Error ? error.message : 'Failed to parse component'
    };
  }
}

// Create a safe component from parsed code
function createSafeComponent(parsed: ParsedComponent): React.ComponentType<any> {
  if (parsed.hasErrors) {
    return () => (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertTriangleIcon className="size-4" />
          <span className="text-sm font-medium">Parse Error</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
          {parsed.errorMessage}
        </p>
      </div>
    );
  }

  // Create a simple component that renders the parsed JSX structure
  return function SafeComponent(props: any) {
    try {
      // This is a simplified renderer that creates safe HTML
      // In a production app, you'd want a more sophisticated approach
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <CodeIcon className="size-4" />
              <span className="text-sm font-medium">Component Preview</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Component: {parsed.componentName}
            </p>
            {parsed.props.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Props:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {parsed.props.map((prop, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {prop}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Render a simplified version of the component structure */}
          <div className="border rounded-lg p-6 bg-background">
            <div className="space-y-4">
              {/* This would be where you'd render the actual component */}
              {/* For now, we'll show a placeholder */}
              <div className="text-center py-8">
                <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4 mx-auto">
                  <CodeIcon size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">Component Preview</h3>
                <p className="text-muted-foreground">
                  This is a safe preview of the generated component.
                </p>
                <div className="mt-4 text-left">
                  <p className="text-sm font-medium mb-2">Generated JSX:</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                    {parsed.jsx}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangleIcon className="size-4" />
            <span className="text-sm font-medium">Render Error</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Failed to render component'}
          </p>
        </div>
      );
    }
  };
}

export function ComponentRenderer({ code, onError }: ComponentRendererProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const parsedComponent = useMemo(() => parseComponentCode(code), [code]);
  const SafeComponent = useMemo(() => createSafeComponent(parsedComponent), [parsedComponent]);

  useEffect(() => {
    if (parsedComponent.hasErrors) {
      setRenderError(parsedComponent.errorMessage || 'Failed to parse component');
      onError?.(parsedComponent.errorMessage || 'Failed to parse component');
    } else {
      setRenderError(null);
    }
  }, [parsedComponent, onError]);

  const handleRender = () => {
    setIsRendering(true);
    // Simulate rendering delay
    setTimeout(() => setIsRendering(false), 500);
  };

  if (!code.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
          <CodeIcon size={24} />
        </div>
        <h3 className="text-lg font-semibold mb-2">No code to render</h3>
        <p className="text-muted-foreground">
          Generate a design using the chat interface to see the component preview here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Component Info Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold">Component: {parsedComponent.componentName}</h3>
              {parsedComponent.props.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Props:</span>
                  <div className="flex flex-wrap gap-1">
                    {parsedComponent.props.map((prop, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {prop}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleRender}
              disabled={isRendering || parsedComponent.hasErrors}
              className="gap-2"
            >
              {isRendering ? (
                <RefreshCwIcon className="size-4 animate-spin" />
              ) : (
                <PlayIcon className="size-4" />
              )}
              {isRendering ? 'Rendering...' : 'Render'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {renderError && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangleIcon className="size-4" />
              <span className="text-sm font-medium">Render Error</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {renderError}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Component Preview */}
      {!renderError && (
        <Card>
          <CardContent className="p-4">
            <SafeComponent />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
