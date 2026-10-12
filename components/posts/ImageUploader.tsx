"use client";
// components/posts/ImageUploader.tsx
// Uploads straight from the browser to ImageKit using a signature from
// /api/imagekit/auth, so files never pass through our server.
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

export type PostImage = { url: string; fileId: string };

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function uploadToImagekit(file: File): Promise<PostImage> {
  if (!ACCEPT.includes(file.type)) throw new Error("Use a PNG, JPG, WebP or GIF image.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 5 MB or smaller.");

  const authRes = await fetch("/api/imagekit/auth", { cache: "no-store" });
  const auth = await authRes.json();
  if (!authRes.ok) throw new Error(auth.error ?? "Couldn't start the upload.");

  const form = new FormData();
  form.append("file", file);
  form.append("fileName", file.name);
  form.append("publicKey", process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "");
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  form.append("folder", auth.folder);
  form.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Upload failed. Please try again.");
  return { url: data.url, fileId: data.fileId };
}

export function ImageUploader({
  value,
  onChange,
}: {
  value: PostImage | null;
  onChange: (image: PostImage | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadToImagekit(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-line bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${value.url}?tr=w-800`} alt="Post image" className="w-full max-h-72 object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          disabled={uploading}
          className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary-tint" : "border-line hover:border-primary/40 hover:bg-surface-muted"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted" aria-hidden />
          )}
          <span className="text-body-sm font-medium text-ink">
            {uploading ? "Uploading…" : "Add an image"}
          </span>
          <span className="text-[12px] text-muted">Drag & drop or click · PNG, JPG, WebP, GIF · up to 5 MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
