// app/posts/page.tsx
import PostClient from "@/components/posts/PostClient"
import { createClient } from "@/utils/supabase/server"
import { DbPost } from "@/types/posts"

export default async function PostsPage() {
  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) console.error(error)

  const postIds = (posts ?? []).map(p => p.id)

  // Real, actual source(s) that drove sales for each post — same data
  // used on the Analytics page's "Sold via" column. Fetched here (not
  // inside PostClient, which is a client component) and passed down as
  // a plain prop.
  const { data: conversions } = postIds.length
    ? await supabase.from("conversions").select("post_id, source").in("post_id", postIds)
    : { data: [] as { post_id: string; source: string | null }[] }

  const postSources: Record<string, string[]> = {}
  conversions?.forEach(c => {
    if (!c.post_id) return
    const set = new Set(postSources[c.post_id] ?? [])
    set.add(c.source ?? "direct")
    postSources[c.post_id] = Array.from(set)
  })

  return <PostClient posts={(posts as DbPost[]) ?? []} postSources={postSources} />
}