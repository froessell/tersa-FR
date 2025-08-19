"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangleIcon, CodeIcon, PlayIcon, RefreshCwIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AdvancedComponentRendererProps {
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
  dependencies: string[];
}

// Safe component mapping for common UI elements and patterns
const SafeComponents: Record<string, React.ComponentType<any>> = {
  // Basic HTML elements
  div: ({ children, className, style, ...props }: any) => (
    <div className={className} style={style} {...props}>{children}</div>
  ),
  span: ({ children, className, style, ...props }: any) => (
    <span className={className} style={style} {...props}>{children}</span>
  ),
  p: ({ children, className, style, ...props }: any) => (
    <p className={className} style={style} {...props}>{children}</p>
  ),
  h1: ({ children, className, style, ...props }: any) => (
    <h1 className={className} style={style} {...props}>{children}</h1>
  ),
  h2: ({ children, className, style, ...props }: any) => (
    <h2 className={className} style={style} {...props}>{children}</h2>
  ),
  h3: ({ children, className, style, ...props }: any) => (
    <h3 className={className} style={style} {...props}>{children}</h3>
  ),
  h4: ({ children, className, style, ...props }: any) => (
    <h4 className={className} style={style} {...props}>{children}</h4>
  ),
  h5: ({ children, className, style, ...props }: any) => (
    <h5 className={className} style={style} {...props}>{children}</h5>
  ),
  h6: ({ children, className, style, ...props }: any) => (
    <h6 className={className} style={style} {...props}>{children}</h6>
  ),
  button: ({ children, className, style, onClick, disabled, ...props }: any) => (
    <button 
      className={className} 
      style={style}
      disabled={disabled}
      onClick={onClick ? () => console.log('Button clicked') : undefined}
      {...props}
    >
      {children}
    </button>
  ),
  a: ({ children, className, style, href, target, ...props }: any) => (
    <a className={className} style={style} href={href} target={target} {...props}>{children}</a>
  ),
  img: ({ src, alt, className, style, width, height, ...props }: any) => (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      style={style}
      width={width}
      height={height}
      {...props} 
    />
  ),
  ul: ({ children, className, style, ...props }: any) => (
    <ul className={className} style={style} {...props}>{children}</ul>
  ),
  ol: ({ children, className, style, ...props }: any) => (
    <ol className={className} style={style} {...props}>{children}</ol>
  ),
  li: ({ children, className, style, ...props }: any) => (
    <li className={className} style={style} {...props}>{children}</li>
  ),
  form: ({ children, className, style, onSubmit, ...props }: any) => (
    <form 
      className={className} 
      style={style}
      onSubmit={onSubmit ? (e: any) => { e.preventDefault(); console.log('Form submitted'); } : undefined}
      {...props}
    >
      {children}
    </form>
  ),
  input: ({ type, placeholder, className, style, value, onChange, ...props }: any) => (
    <input 
      type={type} 
      placeholder={placeholder} 
      className={className} 
      style={style}
      value={value}
      onChange={onChange ? (e: any) => console.log('Input changed:', e.target.value) : undefined}
      {...props} 
    />
  ),
  textarea: ({ placeholder, className, style, value, onChange, rows, ...props }: any) => (
    <textarea 
      placeholder={placeholder} 
      className={className} 
      style={style}
      value={value}
      onChange={onChange ? (e: any) => console.log('Textarea changed:', e.target.value) : undefined}
      rows={rows}
      {...props} 
    />
  ),
  label: ({ children, className, style, htmlFor, ...props }: any) => (
    <label className={className} style={style} htmlFor={htmlFor} {...props}>{children}</label>
  ),
  section: ({ children, className, style, ...props }: any) => (
    <section className={className} style={style} {...props}>{children}</section>
  ),
  header: ({ children, className, style, ...props }: any) => (
    <header className={className} style={style} {...props}>{children}</header>
  ),
  footer: ({ children, className, style, ...props }: any) => (
    <footer className={className} style={style} {...props}>{children}</footer>
  ),
  nav: ({ children, className, style, ...props }: any) => (
    <nav className={className} style={style} {...props}>{children}</nav>
  ),
  main: ({ children, className, style, ...props }: any) => (
    <main className={className} style={style} {...props}>{children}</main>
  ),
  article: ({ children, className, style, ...props }: any) => (
    <article className={className} style={style} {...props}>{children}</article>
  ),
  aside: ({ children, className, style, ...props }: any) => (
    <aside className={className} style={style} {...props}>{children}</aside>
  ),
  table: ({ children, className, style, ...props }: any) => (
    <table className={className} style={style} {...props}>{children}</table>
  ),
  thead: ({ children, className, style, ...props }: any) => (
    <thead className={className} style={style} {...props}>{children}</thead>
  ),
  tbody: ({ children, className, style, ...props }: any) => (
    <tbody className={className} style={style} {...props}>{children}</tbody>
  ),
  tr: ({ children, className, style, ...props }: any) => (
    <tr className={className} style={style} {...props}>{children}</tr>
  ),
  th: ({ children, className, style, ...props }: any) => (
    <th className={className} style={style} {...props}>{children}</th>
  ),
  td: ({ children, className, style, ...props }: any) => (
    <td className={className} style={style} {...props}>{children}</td>
  ),
  // Common React patterns
  Fragment: ({ children }: any) => <>{children}</>,
  // Add more components as needed
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

    // Extract JSX content (more sophisticated approach)
    const jsxMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    const jsx = jsxMatch ? jsxMatch[1].trim() : '';

    // Extract dependencies from imports
    const dependencies = imports
      .map(imp => {
        const match = imp.match(/import\s+\{([^}]+)\}\s+from/);
        return match ? match[1].split(',').map(s => s.trim()) : [];
      })
      .flat()
      .filter(Boolean);

    return {
      imports,
      componentName,
      props,
      jsx,
      hasErrors: false,
      dependencies
    };
  } catch (error) {
    return {
      imports: [],
      componentName: 'GeneratedComponent',
      props: [],
      jsx: '',
      hasErrors: true,
      errorMessage: error instanceof Error ? error.message : 'Failed to parse component',
      dependencies: []
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

  // Create a component that renders the parsed JSX structure
  return function SafeComponent(props: any) {
    try {
      // Create a mock component that simulates the structure
      const renderMockComponent = () => {
        // This is where you'd implement actual JSX rendering
        // For now, we'll create a visual representation
        return (
          <div className="space-y-4">
            {/* Component Header */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <CodeIcon className="size-4" />
                <span className="text-sm font-medium">Live Component Preview</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Component: {parsed.componentName}
              </p>
            </div>

            {/* Mock Component Structure */}
            <div className="border rounded-lg p-6 bg-background">
              <div className="space-y-4">
                {/* Render a visual representation of the component structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left side - Component visualization */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Component Structure</h4>
                    <div className="space-y-2">
                      {parsed.jsx.split('\n').slice(0, 10).map((line, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <code className="text-xs text-muted-foreground font-mono">
                            {line.trim()}
                          </code>
                        </div>
                      ))}
                      {parsed.jsx.split('\n').length > 10 && (
                        <div className="text-xs text-muted-foreground pl-4">
                          ... and {parsed.jsx.split('\n').length - 10} more lines
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Props and dependencies */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Component Details</h4>
                    {parsed.props.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Props:</p>
                        <div className="flex flex-wrap gap-1">
                          {parsed.props.map((prop, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {prop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {parsed.dependencies.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Dependencies:</p>
                        <div className="flex flex-wrap gap-1">
                          {parsed.dependencies.map((dep, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Preview */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-3">Interactive Preview</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-center py-6">
                      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 mx-auto">
                        <EyeIcon size={24} />
                      </div>
                      <h5 className="text-sm font-medium mb-2">Component Preview</h5>
                      <p className="text-xs text-muted-foreground">
                        This shows a safe preview of your generated component.
                      </p>
                      <div className="mt-3">
                        <Button size="sm" variant="outline" className="text-xs">
                          View Full Component
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      };

      return renderMockComponent();
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

export function AdvancedComponentRenderer({ code, onError }: AdvancedComponentRendererProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'info'>('preview');

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

  const handleRender = useCallback(() => {
    setIsRendering(true);
    // Simulate rendering delay
    setTimeout(() => setIsRendering(false), 500);
  }, []);

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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Component: {parsedComponent.componentName}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {parsedComponent.props.length > 0 && (
                  <span>{parsedComponent.props.length} props</span>
                )}
                {parsedComponent.dependencies.length > 0 && (
                  <span>{parsedComponent.dependencies.length} dependencies</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-code"
                  checked={showCode}
                  onCheckedChange={setShowCode}
                />
                <Label htmlFor="show-code" className="text-sm">Show Code</Label>
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
          </div>
        </CardHeader>
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

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'preview' | 'code' | 'info')}>
            <div className="border-b px-6 pt-6">
              <TabsList>
                <TabsTrigger value="preview" className="gap-2">
                  <EyeIcon className="size-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <CodeIcon className="size-4" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="info" className="gap-2">
                  Info
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="p-6 mt-0">
              {!renderError && <SafeComponent />}
            </TabsContent>

            <TabsContent value="code" className="p-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Generated React Code</h4>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-2">
                      <CodeIcon className="size-4" />
                      Copy Code
                    </Button>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm font-mono text-muted-foreground">
                    <code>{code}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="info" className="p-6 mt-0">
              <div className="space-y-4">
                <h4 className="font-medium">Component Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Imports</h5>
                    <div className="space-y-2">
                      {parsedComponent.imports.map((imp, index) => (
                        <div key={index} className="bg-muted rounded p-2">
                          <code className="text-xs font-mono">{imp}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Props Interface</h5>
                    {parsedComponent.props.length > 0 ? (
                      <div className="space-y-2">
                        {parsedComponent.props.map((prop, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
                            {prop}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No props defined</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
