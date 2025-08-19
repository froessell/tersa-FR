import { ReactFlowProvider } from '@xyflow/react';
import { ThemeProvider } from '@/providers/theme';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

export default function TestCanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <ReactFlowProvider>
          {children}
        </ReactFlowProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
