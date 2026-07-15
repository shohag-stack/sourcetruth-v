// app/api/posts/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 7);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // channel is now optional — attribution comes from the real referrer
  // at click time, not a declared plan, so we no longer require picking
  // one when creating a post. Column stays on the table (see note below),
  // it just isn't collected or shown as attribution anymore.
  const { content, channel, destination, campaign, site_id } = await request.json();
  if (!content || !destination || !site_id) {
    return NextResponse.json(
      { error: "content, destination, site_id required" },
      { status: 400 },
    );
  }

  const slug = nanoid();
  const url = new URL(destination);
  url.searchParams.set("st", slug);
  const tracked_link = url.toString(); // real destination, not a redirect domain — per your trust-issue call


  // check posts limit

  const { data: profile } = await supabase.from('users').select('plan, links_limit').eq('id', user.id).single()
    const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)


  const limit = profile?.links_limit ?? 1
    if (limit !== -1 && (count ?? 0) >= limit) {
    return NextResponse.json(
      { error: `Links limit reached. Upgrade your plan to add more sites.` },
      { status: 403 }
    )
  }


  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      site_id,
      content,
      channel: channel ?? null,
      destination,
      campaign,
      slug,
      tracked_link,
      status: "ready",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
