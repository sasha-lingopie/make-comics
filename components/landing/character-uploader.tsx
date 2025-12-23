"use client"

import type React from "react"
import { useState, useRef } from "react"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { validateFileForUpload, generateFilePreview } from "@/lib/file-utils"

export function CharacterUploader() {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFile = async (file: File) => {
    const validation = validateFileForUpload(file, true)
    if (validation.valid) {
      const previewUrl = await generateFilePreview(file)
      setPreview(previewUrl)
    } else if (validation.error) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
        duration: 4000,
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const clearPreview = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (preview) {
    return (
      <div className="relative h-24 rounded-lg overflow-hidden glass-panel group transition-all">
        <img src={preview || "/placeholder.svg"} alt="Character preview" className="w-full h-full object-contain p-2" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 opacity-70 group-hover:opacity-100 transition-opacity"
          onClick={clearPreview}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  return (
    <button
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md transition-all text-xs
        ${
          isDragging
            ? "glass-panel border-indigo/50 text-white"
            : "glass-panel glass-panel-hover text-muted-foreground hover:text-white"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <Upload className="w-3.5 h-3.5" />
      <span>Upload Character</span>
      <span className="text-muted-foreground/50">(Optional)</span>
    </button>
  )
}
