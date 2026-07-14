import { DIRECT_META } from "./dummy-data";
import { PLATFORM_META } from "./dummy-data";
import { FALLBACK_META } from "./dummy-data";
export function metaFor(source: string) {
  if (source === "direct") return DIRECT_META;
  return PLATFORM_META[source as keyof typeof PLATFORM_META] ?? { ...FALLBACK_META, name: source };
}