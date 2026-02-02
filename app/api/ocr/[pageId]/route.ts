import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPageTextBlocks } from '@/lib/ocr';
import { db } from '@/lib/db';
import { pages, stories } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pageId } = await params;

    // Get page and verify ownership through story
    const [page] = await db
      .select({ storyId: pages.storyId })
      .from(pages)
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const [story] = await db
      .select({ userId: stories.userId })
      .from(stories)
      .where(eq(stories.id, page.storyId))
      .limit(1);

    if (!story || story.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const textBlocks = await getPageTextBlocks(pageId);

    return NextResponse.json({
      pageId,
      textBlocks,
    });
  } catch (error) {
    console.error('Error fetching text blocks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch text blocks' },
      { status: 500 }
    );
  }
}
