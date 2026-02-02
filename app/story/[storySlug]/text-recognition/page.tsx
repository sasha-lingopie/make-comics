import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getStoryWithPagesBySlug } from '@/lib/db-actions';
import { OCRPageViewer } from '@/components/ocr/ocr-page-viewer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextRecognitionPageProps {
  params: Promise<{ storySlug: string }>;
}

export default async function TextRecognitionPage({ params }: TextRecognitionPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const { storySlug } = await params;
  const result = await getStoryWithPagesBySlug(storySlug);

  if (!result) {
    notFound();
  }

  const { story, pages } = result;

  // Verify ownership
  if (story.userId !== userId) {
    redirect('/stories');
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href={`/story/${storySlug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Story
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{story.title}</h1>
          <p className="text-muted-foreground mt-1">Text Recognition</p>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">How it works</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Recognize Text&quot; to scan all pages for text using OCR. 
              Once processed, hover over the image to see detected text blocks. 
              Click on any text block to select it.
            </p>
          </div>

          <OCRPageViewer pages={pages} storyId={story.id} />
        </div>
      </div>
    </div>
  );
}
