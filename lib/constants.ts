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
    dimensionsWithoutRef: { width: 896, height: 1152 },
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    modelId: "google/gemini-3-pro-image",
    description: "Best quality, slower",
    supportsReferenceImages: true,
    dimensionsWithRef: { width: 896, height: 1200 },
    dimensionsWithoutRef: { width: 896, height: 1200 },
  },
] as const;

export const PAGE_LAYOUTS = [
  {
    id: "single-panel",
    name: "Single Panel",
    description: "One full-page portrait panel",
    prompt: `PAGE LAYOUT:
Single full-page portrait panel filling the entire page.
- No panel borders or gutters
- One large cinematic illustration
- Maximum visual impact and detail`,
  },
  {
    id: "classic-5-panel",
    name: "Classic 5-Panel",
    description: "Traditional 5-panel layout",
    prompt: `PAGE LAYOUT:
5-panel comic page arranged as:
[Panel 1] [Panel 2] — top row, 2 equal panels
[    Panel 3      ] — middle row, 1 large cinematic hero panel
[Panel 4] [Panel 5] — bottom row, 2 equal panels
- Solid black panel borders with clean white gutters between panels
- Each panel clearly separated and distinct`,
  },
  {
    id: "4-panel-grid",
    name: "4-Panel Grid",
    description: "2x2 equal panels",
    prompt: `PAGE LAYOUT:
4-panel comic page in a 2x2 grid:
[Panel 1] [Panel 2] — top row
[Panel 3] [Panel 4] — bottom row
- All panels equal size
- Solid black panel borders with clean white gutters
- Each panel clearly separated`,
  },
  {
    id: "3-panel-vertical",
    name: "3-Panel Vertical",
    description: "Three horizontal strips",
    prompt: `PAGE LAYOUT:
3-panel comic page with horizontal strips:
[    Panel 1    ] — top strip
[    Panel 2    ] — middle strip
[    Panel 3    ] — bottom strip
- Wide cinematic panels
- Solid black panel borders with clean white gutters`,
  },
  {
    id: "6-panel-grid",
    name: "6-Panel Grid",
    description: "Classic 2x3 grid",
    prompt: `PAGE LAYOUT:
6-panel comic page in a 2x3 grid:
[Panel 1] [Panel 2] — top row
[Panel 3] [Panel 4] — middle row
[Panel 5] [Panel 6] — bottom row
- All panels equal size
- Solid black panel borders with clean white gutters`,
  },
] as const;

export type ImageModelId = typeof IMAGE_MODELS[number]["id"];
export type PageLayoutId = typeof PAGE_LAYOUTS[number]["id"];

export const DEFAULT_IMAGE_MODEL: ImageModelId = "flash-image-2.5";
export const DEFAULT_PAGE_LAYOUT: PageLayoutId = "classic-5-panel";
