"use client";
// components/posts/ShareDialog.tsx
// "Share kit" for a post: open each network's composer with the text and
// tracked link pre-filled, plus copy/download for the image. Social share
// intents can't attach images, so the image is pasted or uploaded by hand
// (Pinterest is the exception — it takes the image URL directly).
import { useEffect, useState } from "react";
import { Check, Copy, Download, ImageIcon, X } from "lucide-react";
import { NETWORK_BY_KEY, measure, type NetworkKey } from "@/lib/networks";
import { DbPost } from "@/types/posts";
import { ImageUploader, type PostImage } from "./ImageUploader";

// Icon, color and length limit come from lib/networks; this adds how to open each composer
type Network = {
  key: NetworkKey;
  href: (text: string, link: string, image: string | null) => string;
  // Facebook won't take pre-filled text, so the text goes to the clipboard first
  copiesText?: boolean;
  needsImage?: boolean;
};

const enc = encodeURIComponent;

const NETWORKS: Network[] = [
  {
    key: "linkedin",
    href: (text, link) => `https://www.linkedin.com/feed/?shareActive=true&text=${enc(`${text}\n\n${link}`)}`,
  },
  {
    key: "x",
    href: (text, link) => `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`,
  },
  {
    key: "facebook",
    href: (_text, link) => `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`,
    copiesText: true,
  },
  {
    key: "threads",
    href: (text, link) => `https://www.threads.net/intent/post?text=${enc(`${text} ${link}`)}`,
  },
  {
    key: "bluesky",
    href: (text, link) => `https://bsky.app/intent/compose?text=${enc(`${text} ${link}`)}`,
  },
  {
    key: "pinterest",
    href: (text, link, image) =>
      `https://pinterest.com/pin/create/button/?url=${enc(link)}&media=${enc(image ?? "")}&description=${enc(text)}`,
    needsImage: true,
  },
];

export function ShareDialog({
  post,
  onClose,
  onImageChange,
  onMarkPosted,
}: {
  post: DbPost;
  onClose: () => void;
  onImageChange: (image: PostImage | null) => Promise<void>;
  onMarkPosted: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const image = post.image_url && post.image_file_id ? { url: post.image_url, fileId: post.image_file_id } : null;
  const fullText = `${post.content}\n\n${post.tracked_link}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 2500);
  }

  async function copyText() {
    await navigator.clipboard.writeText(fullText);
    flash("Post text + tracked link copied");
  }

  async function copyImage() {
    if (!image) return;
    try {
      // Clipboard only accepts PNG reliably — ask ImageKit to convert. The promise
      // form keeps Safari happy (it needs the write to start inside the click).
      const blob = fetch(`${image.url}?tr=f-png`).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Image copied — paste it into your post");
    } catch {
      flash("Your browser blocked copying images — use Download instead");
    }
  }

  async function share(n: Network) {
    if (n.copiesText) {
      await navigator.clipboard.writeText(fullText);
      flash(`Text copied — paste it into ${NETWORK_BY_KEY[n.key].label}`);
    }
    window.open(n.href(post.content, post.tracked_link, image?.url ?? null), "_blank", "noopener,noreferrer,width=720,height=640");
    setShared(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
    >
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-heading-sm text-ink">Share post</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Image */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">Image</div>
          {image ? (
            <>
              <div className="rounded-xl overflow-hidden border border-line bg-surface-muted mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${image.url}?tr=w-800`} alt="" className="w-full max-h-64 object-contain" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={copyImage} className="btn-ghost !px-3 !py-1.5 text-[12px] border border-line inline-flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" aria-hidden /> Copy image
                </button>
                <a
                  href={`${image.url}?ik-attachment=true`}
                  className="btn-ghost !px-3 !py-1.5 text-[12px] border border-line inline-flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> Download
                </a>
                <button
                  onClick={() => onImageChange(null)}
                  className="btn-ghost !px-3 !py-1.5 text-[12px] border border-line text-muted hover:!text-red-500"
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <ImageUploader value={null} onChange={(img) => img && onImageChange(img)} />
          )}
        </div>

        {/* Text */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-widest">Post text</div>
            <button onClick={copyText} className="text-[12px] font-medium text-primary hover:text-primary-hover inline-flex items-center gap-1">
              <Copy className="h-3.5 w-3.5" aria-hidden /> Copy text + link
            </button>
          </div>
          <div className="rounded-xl bg-surface-muted p-3 text-body-sm text-ink whitespace-pre-wrap max-h-40 overflow-y-auto">
            {post.content}
            <div className="mt-2 text-primary font-mono text-[12px] break-all">{post.tracked_link}</div>
          </div>
        </div>

        {/* Networks */}
        <div className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">Share to</div>
        <div className="grid grid-cols-3 gap-2">
          {NETWORKS.map((n) => {
            const meta = NETWORK_BY_KEY[n.key];
            const fit = measure(meta, post.content, post.tracked_link);
            const disabled = n.needsImage && !image;
            return (
              <button
                key={n.key}
                onClick={() => share(n)}
                disabled={disabled}
                title={
                  disabled
                    ? "Add an image to pin it"
                    : fit.fits
                      ? `Share on ${meta.label}`
                      : `${Math.abs(fit.remaining)} characters over ${meta.label}'s ${meta.limit.toLocaleString()} limit — trim it in the composer`
                }
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2.5 text-body-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  fit.fits ? "text-ink hover:brightness-95" : "border-line bg-surface-muted text-muted hover:bg-surface"
                }`}
                style={fit.fits ? { borderColor: `${meta.color}33`, backgroundColor: `${meta.color}0F` } : undefined}
              >
                <span className="flex items-center gap-2">
                  <meta.icon
                    className={`h-4 w-4 shrink-0 ${fit.fits ? "" : "opacity-40 grayscale"}`}
                    style={fit.fits ? { color: meta.color } : undefined}
                    aria-hidden
                  />
                  {meta.label}
                </span>
                {!fit.fits && <span className="text-[11px] font-normal text-red-500">{Math.abs(fit.remaining)} over</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-muted inline-flex items-start gap-1.5">
          <ImageIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
          Social sites don&apos;t let share buttons attach images — copy or download it above and add it in the composer.
        </p>

        {/* Nudge to mark as posted once they've shared it */}
        {shared && post.status === "ready" && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-success-tint px-4 py-3">
            <span className="text-body-sm text-ink">Posted it? Start tracking clicks and sales.</span>
            <button
              onClick={onMarkPosted}
              className="text-[12px] font-medium text-success border border-success/30 bg-surface rounded-lg px-3 py-1.5 whitespace-nowrap"
            >
              Mark posted ✓
            </button>
          </div>
        )}

        {notice && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-body-sm text-white">
            <Check className="h-4 w-4" aria-hidden /> {notice}
          </div>
        )}
      </div>
    </div>
  );
}
