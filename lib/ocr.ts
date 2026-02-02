import vision from '@google-cloud/vision';
import { db } from './db';
import { pageTextBlocks, pages, type NewPageTextBlock } from './schema';
import { eq } from 'drizzle-orm';

// Initialize the Vision API client
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
// Or GOOGLE_CLOUD_PROJECT and individual credential env vars
function getVisionClient() {
  // Check if we have credentials as a JSON string (for serverless environments)
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    return new vision.ImageAnnotatorClient({ credentials });
  }
  // Otherwise, use default credentials (GOOGLE_APPLICATION_CREDENTIALS file path)
  return new vision.ImageAnnotatorClient();
}

export interface TextBlock {
  text: string;
  boundingBox: {
    vertices: { x: number; y: number }[];
  };
  confidence?: number;
}

export interface OCRResult {
  pageId: string;
  textBlocks: TextBlock[];
  fullText: string;
}

/**
 * Perform OCR on an image URL using Google Cloud Vision API
 */
export async function recognizeTextFromImage(imageUrl: string): Promise<TextBlock[]> {
  const client = getVisionClient();

  const [result] = await client.textDetection({
    image: { source: { imageUri: imageUrl } },
  });

  const textAnnotations = result.textAnnotations;
  if (!textAnnotations || textAnnotations.length === 0) {
    return [];
  }

  // Skip the first annotation (it's the full text), process individual words/blocks
  const textBlocks: TextBlock[] = textAnnotations.slice(1).map((annotation) => {
    const vertices = annotation.boundingPoly?.vertices || [];
    return {
      text: annotation.description || '',
      boundingBox: {
        vertices: vertices.map((v) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
      },
      confidence: undefined, // textDetection doesn't provide confidence per word
    };
  });

  return textBlocks;
}

/**
 * Perform OCR on a page and store results in the database
 */
export async function processPageOCR(pageId: string): Promise<OCRResult | null> {
  // Get the page with its generated image
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);

  if (!page || !page.generatedImageUrl) {
    return null;
  }

  // Clear existing text blocks for this page
  await db.delete(pageTextBlocks).where(eq(pageTextBlocks.pageId, pageId));

  // Perform OCR
  const textBlocks = await recognizeTextFromImage(page.generatedImageUrl);

  if (textBlocks.length === 0) {
    return {
      pageId,
      textBlocks: [],
      fullText: '',
    };
  }

  // Store text blocks in database
  const newBlocks: NewPageTextBlock[] = textBlocks.map((block) => ({
    pageId,
    text: block.text,
    boundingBox: block.boundingBox,
    confidence: block.confidence ? Math.round(block.confidence * 100) : null,
  }));

  await db.insert(pageTextBlocks).values(newBlocks);

  return {
    pageId,
    textBlocks,
    fullText: textBlocks.map((b) => b.text).join(' '),
  };
}

/**
 * Process OCR for all pages in a story
 */
export async function processStoryOCR(storyId: string): Promise<OCRResult[]> {
  const storyPages = await db
    .select()
    .from(pages)
    .where(eq(pages.storyId, storyId))
    .orderBy(pages.pageNumber);

  const results: OCRResult[] = [];

  for (const page of storyPages) {
    if (page.generatedImageUrl) {
      const result = await processPageOCR(page.id);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Get text blocks for a specific page
 */
export async function getPageTextBlocks(pageId: string) {
  return db.select().from(pageTextBlocks).where(eq(pageTextBlocks.pageId, pageId));
}

/**
 * Get all text blocks for a story (grouped by page)
 */
export async function getStoryTextBlocks(storyId: string) {
  const storyPages = await db
    .select({ id: pages.id, pageNumber: pages.pageNumber })
    .from(pages)
    .where(eq(pages.storyId, storyId))
    .orderBy(pages.pageNumber);

  const result: { pageId: string; pageNumber: number; textBlocks: typeof pageTextBlocks.$inferSelect[] }[] = [];

  for (const page of storyPages) {
    const blocks = await db.select().from(pageTextBlocks).where(eq(pageTextBlocks.pageId, page.id));
    result.push({
      pageId: page.id,
      pageNumber: page.pageNumber,
      textBlocks: blocks,
    });
  }

  return result;
}
