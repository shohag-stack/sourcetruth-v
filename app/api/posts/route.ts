// app/api/posts/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { verifyUserImage } from "@/lib/imagekit";
import { getPlanConfig } from "@/lib/pricing";

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
  const { content, channel, destination, campaign, site_id, image_file_id, x_content } = await request.json();
  const xContent = typeof x_content === "string" && x_content.trim() ? x_content.trim().slice(0, 1000) : null;
  if (!content || !destination || !site_id) {
    return NextResponse.json(
      { error: "content, destination, site_id required" },
      { status: 400 },
    );
  }

  let url: URL;
  try {
    url = new URL(destination);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Enter a full destination URL, starting with https://" }, { status: 400 });
  }

  // Plan limits come from lib/pricing.ts — the same numbers the pricing page shows
  const [{ data: profile }, { count }, { data: site }] = await Promise.all([
    supabase.from("users").select("plan").eq("id", user.id).maybeSingle(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("sites").select("id").eq("id", site_id).eq("user_id", user.id).maybeSingle(),
  ]);

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const plan = getPlanConfig(profile?.plan);
  if ((count ?? 0) >= plan.posts) {
    return NextResponse.json(
      {
        error: `You've used all ${plan.posts} posts on the ${plan.name} plan. Delete an old post or upgrade to add more.`,
        code: "post_limit",
      },
      { status: 403 },
    );
  }

  // Image must be a file this user uploaded (checked against ImageKit, not trusted from the client)
  let image: { url: string; fileId: string } | null = null;
  if (image_file_id) {
    const verified = await verifyUserImage(image_file_id, user.id);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });
    image = { url: verified.url, fileId: verified.fileId };
  }

  const slug = nanoid();
  url.searchParams.set("st", slug);
  const tracked_link = url.toString(); // real destination, not a redirect domain — per your trust-issue call

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
      image_url: image?.url ?? null,
      image_file_id: image?.fileId ?? null,
      x_content: xContent,
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
