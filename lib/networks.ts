// lib/networks.ts
// One source of truth for each social network's post limit and how it counts
// the tracked link — used by the New Post composer and the share kit.
import type { IconType } from "react-icons";
import { FaBluesky, FaFacebook, FaLinkedin, FaPinterest, FaThreads, FaXTwitter } from "react-icons/fa6";

export type NetworkKey = "x" | "bluesky" | "threads" | "linkedin" | "facebook" | "pinterest";

export type NetworkMeta = {
  key: NetworkKey;
  label: string;
  icon: IconType;
  color: string; // brand color
  limit: number;
  // How the shared link counts: X shortens every URL to 23 chars (t.co);
  // the others count the full link
  linkLength: (link: string) => number;
};

const full = (link: string) => Array.from(link).length;

export const NETWORKS: NetworkMeta[] = [
  { key: "x", label: "X", icon: FaXTwitter, color: "#000000", limit: 280, linkLength: () => 23 },
  { key: "bluesky", label: "Bluesky", icon: FaBluesky, color: "#1185FE", limit: 300, linkLength: full },
  { key: "threads", label: "Threads", icon: FaThreads, color: "#000000", limit: 500, linkLength: full },
  { key: "pinterest", label: "Pinterest", icon: FaPinterest, color: "#E60023", limit: 500, linkLength: () => 0 }, // link is a separate field
  { key: "linkedin", label: "LinkedIn", icon: FaLinkedin, color: "#0A66C2", limit: 3000, linkLength: full },
  { key: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2", limit: 63206, linkLength: full },
];

export const NETWORK_BY_KEY = Object.fromEntries(NETWORKS.map((n) => [n.key, n])) as Record<NetworkKey, NetworkMeta>;

// The most any network allows — posts longer than this can't go anywhere
export const MAX_POST_LENGTH = Math.max(...NETWORKS.map((n) => n.limit));

export type Fit = { used: number; limit: number; remaining: number; fits: boolean };

/** Characters the post will use on a network once the tracked link is added (text + space + link). */
export function measure(network: NetworkMeta, text: string, link: string | null): Fit {
  // Count characters the way people see them (an emoji is one, not two)
  const textLength = Array.from(text).length;
  const linkLength = link ? network.linkLength(link) : 0;
  const used = textLength + (linkLength ? linkLength + 1 : 0);
  return { used, limit: network.limit, remaining: network.limit - used, fits: used <= network.limit };
}
