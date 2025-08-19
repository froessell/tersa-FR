import { Canvas } from '@/components/canvas';
import { Controls } from '@/components/controls';
import { Reasoning } from '@/components/reasoning';
import { SaveIndicator } from '@/components/save-indicator';
import { Toolbar } from '@/components/toolbar';
import { TopLeft } from '@/components/top-left';
import { TopRight } from '@/components/top-right';
import { currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { ProjectProvider } from '@/providers/project';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Tersa',
  description: 'Create and share AI workflows',
};

export const maxDuration = 800; // 13 minutes

type ProjectProps = {
  params: Promise<{
    projectId: string;
  }>;
};

const Project = async ({ params }: ProjectProps) => {
  try {
    const { projectId } = await params;
    const profile = await currentUserProfile();

    if (!profile) {
      console.log('No profile found, redirecting...');
      return redirect('/welcome');
    }

    if (!profile.onboardedAt) {
      console.log('Profile not onboarded, redirecting...');
      return redirect('/welcome');
    }

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      console.log('Project not found:', projectId);
      notFound();
    }

    console.log('Project loaded successfully:', project.id);

  return (
    <div className="flex h-screen w-screen items-stretch overflow-hidden">
      <div className="relative flex-1">
        <ProjectProvider data={project}>
          <Canvas>
            <Controls />
            <Toolbar />
            <SaveIndicator />
          </Canvas>
        </ProjectProvider>
        <Suspense fallback={null}>
          <TopLeft id={projectId} />
        </Suspense>
        <Suspense fallback={null}>
          <TopRight id={projectId} />
        </Suspense>
      </div>
      <Reasoning />
    </div>
  );
  } catch (error) {
    console.error('Error loading project:', error);
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Project</h1>
          <p className="text-gray-600 mb-4">Something went wrong while loading the project.</p>
          <pre className="text-sm text-gray-500 bg-gray-100 p-4 rounded overflow-auto max-w-2xl">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    );
  }
};

export default Project;
