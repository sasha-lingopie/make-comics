"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface StorySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storySlug: string;
  title: string;
  summary: string | null;
  characterDescriptions: string | null;
  onUpdate: (data: { title?: string; summary?: string | null; characterDescriptions?: string | null }) => void;
}

export function StorySettingsModal({
  isOpen,
  onClose,
  storySlug,
  title: initialTitle,
  summary: initialSummary,
  characterDescriptions: initialCharDesc,
  onUpdate,
}: StorySettingsModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary || "");
  const [characterDescriptions, setCharacterDescriptions] = useState(initialCharDesc || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setSummary(initialSummary || "");
      setCharacterDescriptions(initialCharDesc || "");
    }
  }, [isOpen, initialTitle, initialSummary, initialCharDesc]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Story title cannot be empty.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/stories/${storySlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || null,
          characterDescriptions: characterDescriptions.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update story");
      }

      onUpdate({
        title: title.trim(),
        summary: summary.trim() || null,
        characterDescriptions: characterDescriptions.trim() || null,
      });

      toast({
        title: "Story updated",
        description: "Story settings have been saved.",
        duration: 2000,
      });

      onClose();
    } catch (error) {
      console.error("Error updating story:", error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="border border-border/50 rounded-lg bg-background max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-white font-heading">
            Story Settings
          </DialogTitle>
          <DialogClose
            disabled={isSaving}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-[0.02em] font-medium mb-1.5 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              className="w-full bg-background/50 border border-border/50 rounded-md text-sm text-white placeholder-muted-foreground/40 focus:ring-1 focus:ring-indigo/30 focus:outline-none p-2.5 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-[0.02em] font-medium mb-1.5 block">
              Story Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe the overall story, setting, and tone. This context is included in every page generation for consistency."
              disabled={isSaving}
              className="w-full bg-background/50 border border-border/50 rounded-md text-xs text-white placeholder-muted-foreground/40 focus:ring-1 focus:ring-indigo/30 focus:outline-none resize-none h-24 p-2.5 leading-relaxed disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground tracking-[0.02em] font-medium mb-1.5 block">
              Character Descriptions
            </label>
            <textarea
              value={characterDescriptions}
              onChange={(e) => setCharacterDescriptions(e.target.value)}
              placeholder={"Name: Detective Noir\nAppearance: Tall man in dark trenchcoat, sharp jawline, grey eyes\n\nName: Femme Fatale\nAppearance: Mysterious woman with red lips, dark curly hair"}
              disabled={isSaving}
              className="w-full bg-background/50 border border-border/50 rounded-md text-xs text-white placeholder-muted-foreground/40 focus:ring-1 focus:ring-indigo/30 focus:outline-none resize-none h-28 p-2.5 leading-relaxed disabled:opacity-50"
            />
          </div>

          <p className="text-[10px] text-muted-foreground/60">
            Summary and character descriptions are included in every page generation prompt to maintain story and character consistency.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs text-muted-foreground hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="gap-2 bg-white hover:bg-neutral-200 text-black text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
