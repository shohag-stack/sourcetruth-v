// app/api/imagekit/auth/route.ts
// Hands a signed-in user a short-lived signature for one direct-to-ImageKit upload.
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { imagekitConfigured, uploadSignature, userImageFolder } from "@/lib/imagekit";
import { getPlanConfig } from "@/lib/pricing";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!imagekitConfigured()) {
    return NextResponse.json({ error: "Image uploads aren't configured yet." }, { status: 503 });
  }

  // Monthly upload quota — each signature allows exactly one upload (ImageKit
  // tokens are single-use), so counting signatures counts uploads
  const service = createServiceClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle();
  const plan = getPlanConfig(profile?.plan);
  const { count } = await service
    .from("image_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth);

  if ((count ?? 0) >= plan.imageUploads) {
    return NextResponse.json(
      {
        error: `You've used all ${plan.imageUploads} image uploads on the ${plan.name} plan this month. Upgrade for more.`,
        code: "image_quota",
      },
      { status: 429 },
    );
  }

  const { error } = await service.from("image_uploads").insert({ user_id: user.id });
  if (error) {
    console.error("[imagekit/auth] quota insert failed", error);
    return NextResponse.json({ error: "Couldn't start the upload. Please try again." }, { status: 500 });
  }

  return NextResponse.json(
    { ...uploadSignature(), folder: userImageFolder(user.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
