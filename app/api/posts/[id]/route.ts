import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { deleteImagekitFile, isOwnImageUrl } from "@/lib/imagekit";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// Updates whichever of { status, image } the body includes
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    update.status = body.status;
    update.posted_at = body.status === "posted" ? new Date().toISOString() : null;
  }

  // image: { url, fileId } to set/replace, or null to remove
  let oldFileId: string | null = null;
  if (body.image !== undefined) {
    if (body.image !== null && !isOwnImageUrl(body.image?.url)) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("posts")
      .select("image_file_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    oldFileId = existing?.image_file_id ?? null;
    update.image_url = body.image?.url ?? null;
    update.image_file_id = body.image?.fileId ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replaced or removed — clean up the old file
  if (oldFileId && oldFileId !== update.image_file_id) await deleteImagekitFile(oldFileId);

  return NextResponse.json(data);
}

// Deletes the post and its clicks. Revenue (conversions) is kept but no
// longer credited to a post — see migration 20261012_post_images_and_delete.
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ownership check with the user's own session first…
  const { data: post } = await supabase
    .from("posts")
    .select("id, image_file_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // …then delete with the service client so it doesn't depend on a delete RLS policy
  const { error } = await createServiceClient().from("posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("[posts] delete failed", error);
    return NextResponse.json({ error: "Couldn't delete this post. Please try again." }, { status: 500 });
  }

  await deleteImagekitFile(post.image_file_id);
  return NextResponse.json({ ok: true });
}
