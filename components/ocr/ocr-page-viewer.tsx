'use client';

import { useState, useEffect, useRef } from 'react';
import { TextOverlay } from './text-overlay';
import { Button } from '@/components/ui/button';
import { Loader2, ScanText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Page, PageTextBlock } from '@/lib/schema';

interface OCRPageViewerProps {
  pages: Page[];
  storyId: string;
}

export function OCRPageViewer({ pages, storyId }: OCRPageViewerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [textBlocksByPage, setTextBlocksByPage] = useState<Record<string, PageTextBlock[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [hasBeenProcessed, setHasBeenProcessed] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const currentPage = pages[currentPageIndex];

  // Check if OCR has already been processed for any page on mount
  useEffect(() => {
    const checkOCRStatus = async () => {
      setIsCheckingStatus(true);
      try {
        // Check first page with an image to see if OCR was done
        for (const page of pages) {
          if (page.generatedImageUrl) {
            const response = await fetch(`/api/ocr/${page.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.textBlocks && data.textBlocks.length > 0) {
                setHasBeenProcessed(true);
                setTextBlocksByPage((prev) => ({
                  ...prev,
                  [page.id]: data.textBlocks,
                }));
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to check OCR status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkOCRStatus();
  }, [pages]);

  // Load text blocks for current page
  useEffect(() => {
    if (!currentPage) return;

    const fetchTextBlocks = async () => {
      try {
        const response = await fetch(`/api/ocr/${currentPage.id}`);
        if (response.ok) {
          const data = await response.json();
          setTextBlocksByPage((prev) => ({
            ...prev,
            [currentPage.id]: data.textBlocks,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch text blocks:', error);
      }
    };

    if (!textBlocksByPage[currentPage.id]) {
      fetchTextBlocks();
    }
  }, [currentPage, textBlocksByPage]);

  
  const handleProcessOCR = async () => {
    setIsProcessing(true);
    setProcessingStatus('Starting OCR processing...');

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });

      if (!response.ok) {
        throw new Error('OCR processing failed');
      }

      const data = await response.json();
      setProcessingStatus(`Processed ${data.results.length} pages`);

      // Update text blocks for all processed pages
      const newTextBlocks: Record<string, PageTextBlock[]> = {};
      for (const result of data.results) {
        // Refetch to get the stored blocks with IDs
        const blockResponse = await fetch(`/api/ocr/${result.pageId}`);
        if (blockResponse.ok) {
          const blockData = await blockResponse.json();
          newTextBlocks[result.pageId] = blockData.textBlocks;
        }
      }
      setTextBlocksByPage((prev) => ({ ...prev, ...newTextBlocks }));
      setHasBeenProcessed(true);
    } catch (error) {
      console.error('OCR processing error:', error);
      setProcessingStatus('OCR processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextClick = (block: PageTextBlock) => {
    setSelectedText(block.text);
  };

  const currentTextBlocks = currentPage ? textBlocksByPage[currentPage.id] || [] : [];

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No pages available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
            disabled={currentPageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} of {pages.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPageIndex((i) => Math.min(pages.length - 1, i + 1))}
            disabled={currentPageIndex === pages.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {!hasBeenProcessed && (
          <Button 
            onClick={handleProcessOCR} 
            disabled={isProcessing || isCheckingStatus}
          >
            {isCheckingStatus ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ScanText className="mr-2 h-4 w-4" />
                Recognize Text (All Pages)
              </>
            )}
          </Button>
        )}
      </div>

      {processingStatus && (
        <div className="text-sm text-muted-foreground">{processingStatus}</div>
      )}

      {/* Image with text overlay */}
      <div className="border rounded-lg overflow-hidden bg-muted/50">
        {currentPage?.generatedImageUrl ? (
          <TextOverlay
            key={`${currentPage.id}-${currentTextBlocks.length}`}
            imageUrl={currentPage.generatedImageUrl}
            textBlocks={currentTextBlocks}
            onTextClick={handleTextClick}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No image generated for this page
          </div>
        )}
      </div>

      {/* Selected text display */}
      {selectedText && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium text-muted-foreground mb-1">Selected Text:</div>
          <div className="text-lg">{selectedText}</div>
        </div>
      )}

      {/* Text blocks list */}
      {currentTextBlocks.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Recognized Text ({currentTextBlocks.length} blocks)</h3>
          <div className="flex flex-wrap gap-2">
            {currentTextBlocks.map((block) => (
              <span
                key={block.id}
                className="px-2 py-1 bg-muted rounded text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => setSelectedText(block.text)}
              >
                {block.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
