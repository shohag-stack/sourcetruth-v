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

  return <PostClient posts={(posts as DbPost[]) ?? []} />
}