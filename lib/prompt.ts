import { COMIC_STYLES, PAGE_LAYOUTS, DEFAULT_PAGE_LAYOUT, type PageLayoutId } from "./constants";

export interface BuildComicPromptOptions {
  prompt: string;
  style?: string;
  characterImages?: string[];
  isContinuation?: boolean;
  previousContext?: string;
  isAddPage?: boolean;
  previousPages?: Array<{ prompt: string }>;
  layout?: PageLayoutId;
  customSystemPrompt?: string;
  summary?: string;
  characterDescriptions?: string;
}

export function buildComicPrompt({
  prompt,
  style,
  characterImages = [],
  isContinuation = false,
  previousContext = "",
  isAddPage = false,
  previousPages = [],
  layout = DEFAULT_PAGE_LAYOUT,
  customSystemPrompt,
  summary,
  characterDescriptions,
}: BuildComicPromptOptions): string {
  // If custom system prompt is provided, use it directly
  if (customSystemPrompt) {
    return `${customSystemPrompt}\n\nSTORY:\n${prompt}`;
  }

  const styleInfo = COMIC_STYLES.find((s) => s.id === style);
  const styleDesc = styleInfo?.prompt || COMIC_STYLES[2].prompt;

  const layoutInfo = PAGE_LAYOUTS.find((l) => l.id === layout);
  const layoutPrompt = layoutInfo?.prompt || PAGE_LAYOUTS[1].prompt;

  // Determine panel count for character consistency instructions
  const panelCount = getPanelCount(layout);

  let storyOverview = "";
  if (summary) {
    storyOverview += `\nSTORY OVERVIEW:\n${summary}\n`;
  }
  if (characterDescriptions) {
    storyOverview += `\nCHARACTER GUIDE:\n${characterDescriptions}\nUse these descriptions to maintain character consistency across all panels.\n`;
  }

  let continuationContext = "";
  if (isContinuation && previousContext) {
    continuationContext = `\nCONTINUATION CONTEXT:\nThis is a continuation of an existing story. The previous page showed: ${previousContext}\nMaintain visual consistency with the previous panels. Continue the narrative naturally.\n`;
  }

  if (isAddPage && previousPages.length > 0) {
    const storyHistory = previousPages
      .map((page, index) => `Page ${index + 1}: ${page.prompt}`)
      .join("\n");

    continuationContext = `\nSTORY CONTINUATION CONTEXT:\nThis is a continuation of an existing comic story. Here are the previous pages:\n${storyHistory}\n\nThe new page should naturally continue this story. Maintain the same characters, setting, and narrative style. Reference previous events and build upon them.\n`;
  }

  let characterSection = "";
  if (characterImages.length > 0) {
    if (characterImages.length === 1) {
      const panelText = panelCount === 1 ? "the panel" : `ALL ${panelCount} panels`;
      characterSection = `
CRITICAL FACE CONSISTENCY INSTRUCTIONS:
- REFERENCE CHARACTER: Use the uploaded image as EXACT reference for the protagonist's face and appearance
- FACE MATCHING: The character's face must be IDENTICAL to the reference image - same eyes, nose, mouth, hair, facial structure
- APPEARANCE PRESERVATION: Maintain exact skin tone, hair color/style, eye color, and distinctive facial features
- CHARACTER CONSISTENCY: This exact same character must appear in ${panelText} with the same face throughout
- STYLE APPLICATION: Apply ${style} comic art style to the body/pose/action but KEEP THE FACE EXACTLY AS IN THE REFERENCE IMAGE
- NO VARIATION: Do not alter, modify, or change the character's face in any way from the reference`;
    } else if (characterImages.length === 2) {
      const presenceText = panelCount === 1 ? "the panel" : `at least ${Math.max(1, panelCount - 1)} of the ${panelCount} panels`;
      characterSection = `
CRITICAL DUAL CHARACTER FACE CONSISTENCY INSTRUCTIONS:
- CHARACTER 1 REFERENCE: Use the FIRST uploaded image as EXACT reference for Character 1's face and appearance
- CHARACTER 2 REFERENCE: Use the SECOND uploaded image as EXACT reference for Character 2's face and appearance
- FACE MATCHING: Both characters' faces must be IDENTICAL to their respective reference images
- VISUAL DISTINCTION: Keep both characters clearly visually distinct with their unique faces, hair, and features
- CONSISTENT PRESENCE: Both characters must appear together in ${presenceText}
- STYLE APPLICATION: Apply ${style} comic art style while maintaining EXACT facial features from references
- NO FACE VARIATION: Never alter or modify either character's face from their reference images`;
    } else if (characterImages.length >= 3) {
      const ordinals = ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"];
      const charCount = characterImages.length;
      const presenceText = panelCount === 1 ? "the panel" : `at least ${Math.max(1, panelCount - 1)} of the ${panelCount} panels`;
      const charLines = characterImages
        .map((_, i) => `- CHARACTER ${i + 1} REFERENCE: Use the ${ordinals[i]} uploaded image as EXACT reference for Character ${i + 1}'s face and appearance`)
        .join("\n");
      characterSection = `
CRITICAL MULTI-CHARACTER FACE CONSISTENCY INSTRUCTIONS (${charCount} CHARACTERS):
${charLines}
- FACE MATCHING: Every character's face must be IDENTICAL to their respective reference image - same eyes, nose, mouth, hair, facial structure
- VISUAL DISTINCTION: Keep all ${charCount} characters clearly visually distinct with their unique faces, hair, and features
- CONSISTENT PRESENCE: Characters should appear together in ${presenceText}
- STYLE APPLICATION: Apply ${style} comic art style to body/pose/action but KEEP EACH CHARACTER'S FACE EXACTLY AS IN THEIR REFERENCE IMAGE
- NO FACE VARIATION: Never alter or modify any character's face from their reference images`;
    }
  }

  const systemPrompt = `Professional comic book page illustration.
${storyOverview}${continuationContext}
${characterSection}

CHARACTER CONSISTENCY RULES (HIGHEST PRIORITY):
- If reference images are provided, the characters' FACES must be 100% identical to the reference images
- Never change hair color, eye color, facial structure, or distinctive features
- Apply comic style to body/pose/action but preserve exact facial appearance
- Same character must look identical across all panels they appear in

TEXT AND LETTERING (CRITICAL):
- All text in speech bubbles must be PERFECTLY CLEAR, LEGIBLE, and correctly spelled
- Use bold clean comic book lettering, large and easy to read
- Speech bubbles: crisp white fill, solid black outline, pointed tail toward speaker
- Keep dialogue SHORT: maximum 1-2 sentences per bubble
- NO blurry, warped, or unreadable text

${layoutPrompt}

ART STYLE:
${styleDesc}
${characterSection}

COMPOSITION:
- Vary camera angles across panels: close-up, medium shot, wide establishing shot
- Natural visual flow: left-to-right, top-to-bottom reading order
- Dynamic character poses with clear expressive acting
- Detailed backgrounds matching the scene and mood`;

  return `${systemPrompt}\n\nSTORY:\n${prompt}`;
}

function getPanelCount(layout: PageLayoutId): number {
  switch (layout) {
    case "webtoon-2-panel": return 2;
    case "webtoon-3-panel": return 3;
    case "webtoon-4-panel": return 4;
    case "webtoon-5-panel": return 5;
    case "webtoon-6-panel": return 6;
    default: return 6;
  }
}

export function getDefaultSystemPrompt(options: Omit<BuildComicPromptOptions, 'prompt' | 'customSystemPrompt'>): string {
  const fullPrompt = buildComicPrompt({ ...options, prompt: "[USER_STORY_HERE]" });
  return fullPrompt.replace("\n\nSTORY:\n[USER_STORY_HERE]", "");
}
