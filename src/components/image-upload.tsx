"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/api-client";

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    const res = await uploadImage(file);
    setUploading(false);
    if (!res.success || !res.url) {
      toast.error(res.error ?? "Upload failed");
      return;
    }
    onChange(res.url);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative border-2 border-dashed border-zinc-300 rounded-xl overflow-hidden bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
        style={{ aspectRatio: "16/9", minHeight: 140 }}
      >
        {value ? (
          <>
            <Image src={value} alt="Product image" fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black transition-colors z-10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400 p-4 text-center">
            <ImageIcon className="w-10 h-10" />
            <span className="text-sm font-medium">Click to upload image</span>
            <span className="text-xs">PNG, JPG, WEBP — max 5 MB</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
