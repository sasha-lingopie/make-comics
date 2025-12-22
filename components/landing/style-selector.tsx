"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Label } from "@/components/ui/label"

const COMIC_STYLES = [
  { id: "american-modern", name: "American Modern" },
  { id: "manga", name: "Manga" },
  { id: "noir", name: "Noir" },
  { id: "vintage", name: "Vintage" },
]

export function StyleSelector() {
  const [selectedStyle, setSelectedStyle] = useState("noir")

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold font-display">Choose Your Style</Label>

      {/* Grid for style selection */}
      <div className="grid grid-cols-2 gap-3">
        {COMIC_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`
              relative text-left transition-all duration-200 rounded-lg p-3.5 border-2 group
              hover:scale-[1.02] active:scale-[0.98]
              ${
                selectedStyle === style.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 bg-card hover:bg-muted/50"
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-foreground font-display">{style.name}</h3>
                </div>
              </div>
              {selectedStyle === style.id && (
                <div className="bg-primary text-primary-foreground p-1 rounded-full shrink-0">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
