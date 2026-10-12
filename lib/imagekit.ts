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
