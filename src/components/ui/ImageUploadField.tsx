"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDisplayImageUrl } from "@/lib/supabase/proxy-url";

export function ImageUploadField({
  bucket,
  name,
  defaultValue,
  label,
}: {
  bucket: "products" | "avatars";
  name: string;
  defaultValue?: string | null;
  label?: string;
}) {
  const [url, setUrl] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        setError("Lỗi tải ảnh lên: " + uploadError.message);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      // Lưu dạng tương đối khi đi qua app, vì tên miền link công khai đổi mỗi lần khởi động.
      const origin = window.location.origin;
      setUrl(data.publicUrl.startsWith(origin) ? data.publicUrl.slice(origin.length) : data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 hover:bg-gray-100 shrink-0"
        >
          {uploading ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={toDisplayImageUrl(url)} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="text-gray-400" size={20} />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <span className="text-xs text-gray-400">Nhấn để chọn ảnh (JPG, PNG)</span>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
