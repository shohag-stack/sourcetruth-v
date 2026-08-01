// app/posts/page.tsx
import PostClient from "@/components/posts/PostClient";
import { createClient } from "@/utils/supabase/server";
import { DbPost } from "@/types/posts";
import { AppShell } from "@/components/layout/AppShell";

export default async function PostsPage() {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) console.error(error);

  const postRows = (posts as DbPost[]) ?? [];
  const postIds = postRows.map((p) => p.id);

  const [{ data: conversions }, { data: clicks }] = postIds.length
    ? await Promise.all([
        supabase
          .from("conversions")
          .select("post_id, source")
          .in("post_id", postIds),
        supabase
          .from("clicks")
          .select("post_id, country")
          .in("post_id", postIds),
      ])
    : [
        { data: [] as { post_id: string; source: string | null }[] },
        { data: [] as { post_id: string; country: string | null }[] },
      ];

  const postSources: Record<string, string[]> = {};

  conversions?.forEach((c) => {
    if (!c.post_id) return;

    const set = new Set(postSources[c.post_id] ?? []);
    set.add(c.source ?? "direct");
    postSources[c.post_id] = Array.from(set);
  });

  const countryCountByPost: Record<string, Record<string, number>> = {};

  clicks?.forEach((c) => {
    if (!c.post_id || !c.country) return;

    countryCountByPost[c.post_id] ??= {};
    countryCountByPost[c.post_id][c.country] =
      (countryCountByPost[c.post_id][c.country] ?? 0) + 1;
  });

  return (
    <AppShell>
      <PostClient
        posts={postRows}
        postSources={postSources}
        countryCountByPost={countryCountByPost}
      />
    </AppShell>
  );
}
