import { ComponentLibrary } from '@/components/design-ai/component-library';

export default function LibraryPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Component Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage your design system components. Upload, organize, and edit your UI component screenshots.
          </p>
        </div>
        
        <ComponentLibrary 
          selectionMode={false}
        />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Component Library',
  description: 'Manage your design system components and UI screenshots',
};
