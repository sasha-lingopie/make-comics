import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { processPageOCR, processStoryOCR } from '@/lib/ocr';
import { getStoryById } from '@/lib/db-actions';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, storyId } = body;

    if (!pageId && !storyId) {
      return NextResponse.json(
        { error: 'Either pageId or storyId is required' },
        { status: 400 }
      );
    }

    // If processing a story, verify ownership
    if (storyId) {
      const story = await getStoryById(storyId);
      if (!story) {
        return NextResponse.json({ error: 'Story not found' }, { status: 404 });
      }
      if (story.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const results = await processStoryOCR(storyId);
      return NextResponse.json({
        success: true,
        message: `Processed ${results.length} pages`,
        results,
      });
    }

    // Process single page
    const result = await processPageOCR(pageId);
    if (!result) {
      return NextResponse.json(
        { error: 'Page not found or has no generated image' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process OCR' },
      { status: 500 }
    );
  }
}
