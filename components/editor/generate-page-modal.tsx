"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Check, Settings2, ChevronDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { validateFileForUpload, generateFilePreview } from "@/lib/file-utils";
import { useS3Upload } from "next-s3-upload";
import { compressImage } from "@/lib/compress-image";
import { isContentPolicyViolation } from "@/lib/utils";
import { IMAGE_MODELS, PAGE_LAYOUTS, DEFAULT_IMAGE_MODEL, DEFAULT_PAGE_LAYOUT, type ImageModelId, type PageLayoutId } from "@/lib/constants";
import { getDefaultSystemPrompt } from "@/lib/prompt";

interface CharacterItem {
  url: string;
  isNew?: boolean;
  file?: File;
  preview?: string;
}

interface GeneratePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: {
    prompt: string;
    characterUrls?: string[];
    model?: ImageModelId;
    layout?: PageLayoutId;
    customSystemPrompt?: string;
  }) => Promise<void>;
  pageNumber: number;
  isRedrawMode?: boolean;
  existingPrompt?: string;
  existingCharacters?: string[]; // All characters from the story
  lastPageCharacters?: string[]; // Characters used on the last page
  previousPageCharacters?: string[]; // Characters used on the previous page (if last page had < 2)
  storyStyle?: string;
}

export function GeneratePageModal({
  isOpen,
  onClose,
  onGenerate,
  pageNumber,
  isRedrawMode = false,
  existingPrompt = "",
  existingCharacters = [],
  lastPageCharacters = [],
  previousPageCharacters = [],
  storyStyle = "noir",
}: GeneratePageModalProps) {
  const [prompt, setPrompt] = useState("");
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [selectedCharacterIndices, setSelectedCharacterIndices] = useState<
    Set<number>
  >(new Set());
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState<ImageModelId>(DEFAULT_IMAGE_MODEL);
  const [layout, setLayout] = useState<PageLayoutId>(DEFAULT_PAGE_LAYOUT);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showLayoutDropdown, setShowLayoutDropdown] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadToS3 } = useS3Upload();

  const MODEL_STORAGE_KEY = 'comic-model-preference';
  const LAYOUT_STORAGE_KEY = 'comic-layout-preference';
  const CUSTOM_PROMPT_STORAGE_KEY = 'comic-custom-prompt';

  // Reset form and initialize characters when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt(isRedrawMode ? existingPrompt : "");
      setShowPreview(null);
      setIsGenerating(false);
      setShowAdvanced(false);
      setShowModelDropdown(false);
      setShowLayoutDropdown(false);
      setShowPromptPreview(false);

      // Load preferences from localStorage
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (savedModel) setModel(savedModel as ImageModelId);
      
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) setLayout(savedLayout as PageLayoutId);
      
      const savedPrompt = localStorage.getItem(CUSTOM_PROMPT_STORAGE_KEY);
      if (savedPrompt) setCustomSystemPrompt(savedPrompt);
      else setCustomSystemPrompt("");



      // Initialize characters list with existing ones
      const existingItems: CharacterItem[] = existingCharacters.map((url) => ({
        url,
        isNew: false,
      }));
      setCharacters(existingItems);

      // Smart selection: Use last 2 characters from last page, or combine with previous page if needed
      const defaultSelected = new Set<number>();
      const charactersToSelect: string[] = [];

      // If last page has 2 characters, use those
      if (lastPageCharacters.length >= 2) {
        charactersToSelect.push(...lastPageCharacters.slice(0, 2));
      } else {
        // Start with last page characters (if any)
        charactersToSelect.push(...lastPageCharacters);

        // If we have less than 2, add from previous page (avoiding duplicates)
        if (
          charactersToSelect.length < 2 &&
          previousPageCharacters.length > 0
        ) {
          for (const charUrl of previousPageCharacters) {
            if (
              !charactersToSelect.includes(charUrl) &&
              charactersToSelect.length < 2
            ) {
              charactersToSelect.push(charUrl);
            }
          }
        }
      }

      // Find indices of characters to select (preserving order in existingItems)
      charactersToSelect.forEach((charUrl) => {
        const index = existingItems.findIndex((item) => item.url === charUrl);
        if (index !== -1) {
          defaultSelected.add(index);
        }
      });

      setSelectedCharacterIndices(defaultSelected);
    }
  }, [
    isOpen,
    isRedrawMode,
    existingPrompt,
    existingCharacters,
    lastPageCharacters,
    previousPageCharacters,
  ]);

  // Keyboard shortcut for form submission (disabled during generation)
  useKeyboardShortcut(
    () => {
      if (isOpen && !isGenerating && prompt.trim()) {
        handleGenerate();
      }
    },
    { disabled: !isOpen || isGenerating }
  );

  const handleFiles = async (newFiles: FileList | null) => {
    if (!newFiles) return;

    const filesArray = Array.from(newFiles);

    const validationResults = filesArray.map((file) => ({
      file,
      validation: validateFileForUpload(file, true),
    }));

    validationResults.forEach(({ validation }) => {
      if (!validation.valid && validation.error) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive",
          duration: 4000,
        });
      }
    });

    const validFiles = validationResults
      .filter(({ validation }) => validation.valid)
      .map(({ file }) => file);

    if (validFiles.length === 0) return;

    // Create new character items for the uploaded files
    const newCharacterItems: CharacterItem[] = await Promise.all(
      validFiles.map(async (file) => {
        const preview = await generateFilePreview(file);
        return {
          url: "", // Will be set after S3 upload
          isNew: true,
          file,
          preview,
        };
      })
    );

    // Add new characters to the list
    setCharacters((prev) => {
      const updated = [...prev, ...newCharacterItems];
      const newSelected = new Set(selectedCharacterIndices);

      // Add new characters to selection
      newCharacterItems.forEach((_, idx) => {
        newSelected.add(prev.length + idx);
      });

      // If we have more than 5 selected, deselect the oldest ones (keep most recent 5)
      if (newSelected.size > 5) {
        const selectedArray = Array.from(newSelected).sort((a, b) => b - a);
        const toKeep = selectedArray.slice(0, 5);
        newSelected.clear();
        toKeep.forEach((idx) => newSelected.add(idx));
      }

      setSelectedCharacterIndices(newSelected);
      return updated;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleCharacterSelection = (index: number) => {
    setSelectedCharacterIndices((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(index)) {
        // Allow deselection even if only 2 are selected
        newSelected.delete(index);
      } else {
        // If already at max (5), remove the oldest selected first
        if (newSelected.size >= 5) {
          const selectedArray = Array.from(newSelected).sort((a, b) => a - b);
          newSelected.delete(selectedArray[0]); // Remove oldest
        }
        newSelected.add(index);
      }
      return newSelected;
    });
  };

  const removeCharacter = (index: number) => {
    setCharacters((prev) => {
      const updated = prev.filter((_, i) => i !== index);

      // Adjust selected indices
      setSelectedCharacterIndices((prevSelected) => {
        const newSelected = new Set<number>();
        prevSelected.forEach((idx) => {
          if (idx < index) {
            newSelected.add(idx);
          } else if (idx > index) {
            newSelected.add(idx - 1);
          }
          // Skip the removed index
        });
        return newSelected;
      });

      return updated;
    });
    setShowPreview(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      // Get selected characters
      const selectedCharacters = Array.from(selectedCharacterIndices)
        .sort((a, b) => a - b)
        .map((idx) => characters[idx])
        .filter(Boolean);

      // Upload new files to S3 and get URLs, reuse existing URLs
      const characterUrls = await Promise.all(
        selectedCharacters.map(async (char) => {
          if (char.isNew && char.file) {
            // Compress and upload new file to S3
            const compressed = await compressImage(char.file);
            const { url } = await uploadToS3(compressed);
            return url;
          } else {
            // Reuse existing URL
            return char.url;
          }
        })
      );

      // Save preferences to localStorage
      localStorage.setItem(MODEL_STORAGE_KEY, model);
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
      if (customSystemPrompt) {
        localStorage.setItem(CUSTOM_PROMPT_STORAGE_KEY, customSystemPrompt);
      } else {
        localStorage.removeItem(CUSTOM_PROMPT_STORAGE_KEY);
      }

      await onGenerate({
        prompt,
        characterUrls: characterUrls.length > 0 ? characterUrls : undefined,
        model,
        layout,
        customSystemPrompt: customSystemPrompt || undefined,
      });
    } catch (error) {
      console.error("Error generating page:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate page. Please try again.";
      let title = "Generation failed";
      if (isContentPolicyViolation(errorMessage)) {
        title = "Content policy violation";
      }
      toast({
        title,
        description: errorMessage,
        variant: "destructive",
        duration: 4000,
      });
      setIsGenerating(false);
      throw error; // Re-throw so the parent handler knows generation failed
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent closing the modal if generation is running
    if (!open && isGenerating) {
      return;
    }
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="border border-border/50 rounded-lg bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl text-white font-heading">
              {isRedrawMode
                ? `Redraw Page ${pageNumber}`
                : `Generate Page ${pageNumber}`}
            </DialogTitle>
            <DialogClose
              disabled={isGenerating}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Prompt Input */}
            <div className="relative glass-panel p-1 rounded-xl group focus-within:border-indigo/30 transition-colors">
              <div className="bg-background/80 rounded-lg p-4 border border-border/50">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] uppercase text-muted-foreground tracking-[0.02em] font-medium">
                    Prompt
                  </label>
                </div>

                <textarea
                  autoFocus
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    isRedrawMode
                      ? "Tweak the prompt to improve this page..."
                      : "Continue the story... Describe what happens next."
                  }
                  disabled={isGenerating}
                  className="w-full bg-transparent border-none text-sm text-white placeholder-muted-foreground/50 focus:ring-0 focus:outline-none resize-none h-20 leading-relaxed tracking-tight"
                />

                <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                  {/* Character Selection */}
                  <div className="space-y-2">
                    {/* Existing and new characters list */}
                    {characters.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-2">
                        {characters.map((char, index) => {
                          const isSelected =
                            selectedCharacterIndices.has(index);
                          const imageUrl = char.preview || char.url;

                          return (
                            <div key={index} className="relative group/thumb">
                              <button
                                type="button"
                                onClick={() => toggleCharacterSelection(index)}
                                onDoubleClick={() => setShowPreview(imageUrl)}
                                disabled={isGenerating}
                                className={`w-10 h-10 rounded-md overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed relative ${
                                  isSelected
                                    ? "border-2 border-indigo-500"
                                    : "border-2 border-transparent hover:border-indigo/50"
                                }`}
                                title="Click to select/deselect, double-click to preview"
                              >
                                <img
                                  src={imageUrl || "/placeholder.svg"}
                                  alt={`Character ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {/* Selection indicator */}
                                {isSelected && (
                                  <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center pointer-events-none z-10 border border-background">
                                    <Check className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </button>

                              {/* Remove button (only for new uploads) */}
                              {char.isNew && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCharacter(index);
                                  }}
                                  disabled={isGenerating}
                                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity disabled:opacity-50 z-20"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload new character button */}
                    <button
                      type="button"
                      onClick={() =>
                        !isGenerating && fileInputRef.current?.click()
                      }
                      disabled={isGenerating}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {characters.length === 0
                          ? "Add characters (optional, max 5)"
                          : "Upload new character"}
                      </span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {/* Advanced Settings Toggle */}
                <div className="mt-3 pt-3 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => !isGenerating && setShowAdvanced(!showAdvanced)}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Advanced Settings</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Model Selector */}
                      <div className="relative dropdown-container">
                        <button
                          type="button"
                          onClick={() => !isGenerating && setShowModelDropdown(!showModelDropdown)}
                          disabled={isGenerating}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md glass-panel glass-panel-hover transition-all text-xs text-muted-foreground hover:text-white disabled:opacity-50"
                        >
                          <span className="text-muted-foreground/70">Model:</span>
                          <span>{IMAGE_MODELS.find((m) => m.id === model)?.name}</span>
                        </button>
                        {showModelDropdown && (
                          <div className="absolute left-0 bottom-full mb-2 w-48 bg-background rounded-lg p-1 z-70 shadow-2xl border border-border/50">
                            {IMAGE_MODELS.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setModel(m.id);
                                  setShowModelDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${model === m.id ? "bg-indigo/10 text-indigo" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{m.name}</span>
                                  {model === m.id && <Check className="w-3 h-3" />}
                                </div>
                                <div className="text-[10px] text-muted-foreground/70 mt-0.5">{m.description}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Layout Selector - hidden when custom prompt is set */}
                      {!customSystemPrompt && (
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => !isGenerating && setShowLayoutDropdown(!showLayoutDropdown)}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md glass-panel glass-panel-hover transition-all text-xs text-muted-foreground hover:text-white disabled:opacity-50"
                          >
                            <span className="text-muted-foreground/70">Layout:</span>
                            <span>{PAGE_LAYOUTS.find((l) => l.id === layout)?.name}</span>
                          </button>
                          {showLayoutDropdown && (
                            <div className="absolute left-0 bottom-full mb-2 w-52 bg-background rounded-lg p-1 z-70 shadow-2xl border border-border/50">
                              {PAGE_LAYOUTS.map((l) => (
                                <button
                                  key={l.id}
                                  type="button"
                                  onClick={() => {
                                    setLayout(l.id);
                                    setShowLayoutDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${layout === l.id ? "bg-indigo/10 text-indigo" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{l.name}</span>
                                    {layout === l.id && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{l.description}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* System Prompt Preview */}
                      <button
                        type="button"
                        onClick={() => !isGenerating && setShowPromptPreview(true)}
                        disabled={isGenerating}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md glass-panel glass-panel-hover transition-all text-xs disabled:opacity-50 ${customSystemPrompt ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground hover:text-white"}`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{customSystemPrompt ? "Custom Prompt ✓" : "View Prompt"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground/70">
              {isRedrawMode
                ? "Previous pages and characters automatically referenced."
                : "Previous page automatically referenced. " +
                  `${selectedCharacterIndices.size} selected characters.`}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full gap-2 bg-white hover:bg-neutral-200 text-black tracking-tight"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {isRedrawMode ? "Redrawing page..." : "Generating page..."}
                  </span>
                </>
              ) : (
                `${isRedrawMode ? "Redraw" : "Generate"} Page ${pageNumber}`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Character Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          onClick={() => setShowPreview(null)}
        >
          <div className="relative max-w-sm max-h-[80vh] glass-panel p-4 rounded-xl z-101">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 hover:bg-white/10 z-102"
              onClick={() => setShowPreview(null)}
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={showPreview || "/placeholder.svg"}
              alt="Character preview"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* System Prompt Preview Modal (read-only) */}
      {showPromptPreview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setShowPromptPreview(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] glass-panel p-6 rounded-xl z-[201] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">System Prompt Preview</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/10"
                onClick={() => setShowPromptPreview(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              This is the prompt that will be used for generation.
              {customSystemPrompt && (
                <span className="block mt-1 text-amber-500">
                  ⚠️ Using custom prompt from your settings.
                </span>
              )}
              {!customSystemPrompt && (
                <span className="block mt-1 text-muted-foreground/70">
                  To edit the system prompt, go to the home page and use Advanced Settings.
                </span>
              )}
            </p>
            <div className="flex-1 min-h-[300px] w-full bg-background/50 border border-border/50 rounded-lg p-3 text-xs text-white/70 overflow-auto font-mono whitespace-pre-wrap">
              {customSystemPrompt || getDefaultSystemPrompt({ style: storyStyle, characterImages: [], layout })}
            </div>
            <div className="flex justify-end mt-4">
              <Button
                className="bg-white hover:bg-neutral-200 text-black text-xs"
                onClick={() => setShowPromptPreview(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
