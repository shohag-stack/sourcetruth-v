// lib/imagekit.ts — server-only ImageKit helpers.
// Browsers upload straight to ImageKit with a short-lived signature from
// /api/imagekit/auth; the private key never leaves the server.
import crypto from "crypto";

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY ?? "";
export const IMAGEKIT_URL_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "").replace(/\/$/, "");

export function imagekitConfigured() {
  return Boolean(PRIVATE_KEY && process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY && IMAGEKIT_URL_ENDPOINT);
}

// ImageKit's client-upload auth: HMAC-SHA1(token + expire) with the private key
export function uploadSignature() {
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 10 * 60; // must be < 1 hour ahead
  const signature = crypto.createHmac("sha1", PRIVATE_KEY).update(token + expire).digest("hex");
  return { token, expire, signature };
}

// Only accept images that live in this account's ImageKit storage
export function isOwnImageUrl(url: unknown): url is string {
  return typeof url === "string" && Boolean(IMAGEKIT_URL_ENDPOINT) && url.startsWith(`${IMAGEKIT_URL_ENDPOINT}/`);
}

// Best effort — a leftover file costs a little storage, never breaks the app
export async function deleteImagekitFile(fileId: string | null | undefined) {
  if (!fileId || !PRIVATE_KEY) return;
  try {
    await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${Buffer.from(`${PRIVATE_KEY}:`).toString("base64")}` },
    });
  } catch (err) {
    console.error("[imagekit] delete failed", fileId, err);
  }
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Every user uploads into their own folder (see /api/imagekit/auth)
export const userImageFolder = (userId: string) => `/sourcetruth/posts/${userId}`;

type VerifiedImage = { ok: true; url: string; fileId: string } | { ok: false; error: string };

/**
 * Looks the file up on ImageKit before a post is allowed to reference it.
 * The client only sends a fileId, so without this a user could attach (and
 * later delete) someone else's file, or skip the browser-side size check.
 */
export async function verifyUserImage(fileId: unknown, userId: string): Promise<VerifiedImage> {
  if (typeof fileId !== "string" || !fileId || !PRIVATE_KEY) return { ok: false, error: "Invalid image" };

  const res = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}/details`, {
    headers: { Authorization: `Basic ${Buffer.from(`${PRIVATE_KEY}:`).toString("base64")}` },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: "Image not found — please upload it again." };

  const file: { url?: string; filePath?: string; size?: number; fileType?: string } = await res.json();

  if (!file.filePath?.startsWith(`${userImageFolder(userId)}/`) || !isOwnImageUrl(file.url)) {
    return { ok: false, error: "Invalid image" };
  }
  if (file.fileType !== "image" || (file.size ?? 0) > MAX_IMAGE_BYTES) {
    await deleteImagekitFile(fileId); // don't keep files that broke the rules
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }
  return { ok: true, url: file.url!, fileId };
}
