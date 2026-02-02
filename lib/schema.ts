import { pgTable, text, integer, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Stories table
export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  style: text('style').default('noir').notNull(),
  userId: text('user_id').notNull(),
  usesOwnApiKey: boolean('uses_own_api_key').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pages table
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id').references(() => stories.id, { onDelete: 'cascade' }).notNull(),
  pageNumber: integer('page_number').notNull(),
  prompt: text('prompt').notNull(),
  characterImageUrls: jsonb('character_image_urls').$type<string[]>().default([]).notNull(),
  generatedImageUrl: text('generated_image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const storiesRelations = relations(stories, ({ many }) => ({
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  story: one(stories, {
    fields: [pages.storyId],
    references: [stories.id],
  }),
}));

// Page text blocks table - stores OCR recognized text with positions
export const pageTextBlocks = pgTable('page_text_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  // Bounding box coordinates (normalized 0-1 relative to image dimensions)
  boundingBox: jsonb('bounding_box').$type<{
    vertices: { x: number; y: number }[];
  }>().notNull(),
  // Confidence score from OCR (0-1)
  confidence: integer('confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Update pages relations to include text blocks
export const pageTextBlocksRelations = relations(pageTextBlocks, ({ one }) => ({
  page: one(pages, {
    fields: [pageTextBlocks.pageId],
    references: [pages.id],
  }),
}));

// Types
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type PageTextBlock = typeof pageTextBlocks.$inferSelect;
export type NewPageTextBlock = typeof pageTextBlocks.$inferInsert;