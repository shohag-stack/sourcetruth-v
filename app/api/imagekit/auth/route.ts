// app/api/imagekit/auth/route.ts
// Hands a signed-in user a short-lived signature for one direct-to-ImageKit upload.
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { imagekitConfigured, uploadSignature } from "@/lib/imagekit";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!imagekitConfigured()) {
    return NextResponse.json({ error: "Image uploads aren't configured yet." }, { status: 503 });
  }

  return NextResponse.json(
    { ...uploadSignature(), folder: `/sourcetruth/posts/${user.id}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
