export const COMIC_STYLES = [
  {
    id: "american-modern",
    name: "American Modern",
    prompt: "contemporary American superhero comic style, bold vibrant colors, dynamic heroic poses, detailed muscular anatomy, cinematic action scenes, modern digital art",
  },
  {
    id: "manga",
    name: "Manga",
    prompt: "Japanese manga style, clean precise black linework, screen tone shading, expressive eyes, dynamic speed lines, black and white with impact effects",
  },
  {
    id: "noir",
    name: "Noir",
    prompt: "film noir style, high contrast black and white, deep dramatic shadows, 1940s detective aesthetic, heavy bold inking, moody atmospheric lighting",
  },
  {
    id: "vintage",
    name: "Vintage",
    prompt: "Golden Age 1950s comic style, visible halftone Ben-Day dots, limited retro color palette, nostalgic warm tones, classic adventure comics",
  },
] as const;

export const IMAGE_MODELS = [
  {
    id: "flash-image-2.5",
    name: "Flash 2.5",
    modelId: "google/flash-image-2.5",
    description: "Fast, good quality",
    supportsReferenceImages: true,
    dimensionsWithRef: { width: 864, height: 1184 },
    dimensionsWithoutRef: { width: 768, height: 1344 },
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    modelId: "google/gemini-3-pro-image",
    description: "Best quality, slower",
    supportsReferenceImages: true,
    dimensionsWithRef: { width: 896, height: 1200 },
    dimensionsWithoutRef: { width: 768, height: 1376 },
  },
] as const;

export const PAGE_LAYOUTS = [
  {
    id: "webtoon-2-panel",
    name: "2 Panels",
    description: "Vertical scroll, 1 column × 2 rows",
    prompt: `PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 2 stacked rows:
[  Panel 1  ] — row 1 (top)
[  Panel 2  ] — row 2 (bottom)
- All panels stacked vertically in a SINGLE COLUMN, NO side-by-side panels
- Each panel is a wide horizontal strip spanning the full width
- Solid black panel borders with clean white gutters between rows
- Reading order: top to bottom (vertical scroll format)
- This is a webtoon/vertical scroll format — NOT a traditional comic page grid`,
  },
  {
    id: "webtoon-3-panel",
    name: "3 Panels",
    description: "Vertical scroll, 1 column × 3 rows",
    prompt: `PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 3 stacked rows:
[  Panel 1  ] — row 1 (top)
[  Panel 2  ] — row 2
[  Panel 3  ] — row 3 (bottom)
- All panels stacked vertically in a SINGLE COLUMN, NO side-by-side panels
- Each panel is a wide horizontal strip spanning the full width
- Solid black panel borders with clean white gutters between rows
- Reading order: top to bottom (vertical scroll format)
- This is a webtoon/vertical scroll format — NOT a traditional comic page grid`,
  },
  {
    id: "webtoon-4-panel",
    name: "4 Panels",
    description: "Vertical scroll, 1 column × 4 rows",
    prompt: `PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 4 stacked rows:
[  Panel 1  ] — row 1 (top)
[  Panel 2  ] — row 2
[  Panel 3  ] — row 3
[  Panel 4  ] — row 4 (bottom)
- All panels stacked vertically in a SINGLE COLUMN, NO side-by-side panels
- Each panel is a wide horizontal strip spanning the full width
- Solid black panel borders with clean white gutters between rows
- Reading order: top to bottom (vertical scroll format)
- This is a webtoon/vertical scroll format — NOT a traditional comic page grid`,
  },
  {
    id: "webtoon-5-panel",
    name: "5 Panels",
    description: "Vertical scroll, 1 column × 5 rows",
    prompt: `PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 5 stacked rows:
[  Panel 1  ] — row 1 (top)
[  Panel 2  ] — row 2
[  Panel 3  ] — row 3
[  Panel 4  ] — row 4
[  Panel 5  ] — row 5 (bottom)
- All panels stacked vertically in a SINGLE COLUMN, NO side-by-side panels
- Each panel is a wide horizontal strip spanning the full width
- Solid black panel borders with clean white gutters between rows
- Reading order: top to bottom (vertical scroll format)
- This is a webtoon/vertical scroll format — NOT a traditional comic page grid`,
  },
  {
    id: "webtoon-6-panel",
    name: "6 Panels",
    description: "Vertical scroll, 1 column × 6 rows",
    prompt: `PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 6 stacked rows:
[  Panel 1  ] — row 1 (top)
[  Panel 2  ] — row 2
[  Panel 3  ] — row 3
[  Panel 4  ] — row 4
[  Panel 5  ] — row 5
[  Panel 6  ] — row 6 (bottom)
- All panels stacked vertically in a SINGLE COLUMN, NO side-by-side panels
- Each panel is a wide horizontal strip spanning the full width
- Solid black panel borders with clean white gutters between rows
- Reading order: top to bottom (vertical scroll format)
- This is a webtoon/vertical scroll format — NOT a traditional comic page grid`,
  },
] as const;

export type ImageModelId = typeof IMAGE_MODELS[number]["id"];
export type PageLayoutId = typeof PAGE_LAYOUTS[number]["id"];

export const DEFAULT_IMAGE_MODEL: ImageModelId = "flash-image-2.5";
export const DEFAULT_PAGE_LAYOUT: PageLayoutId = "webtoon-6-panel";

