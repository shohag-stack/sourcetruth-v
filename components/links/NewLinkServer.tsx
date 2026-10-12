import React from "react";
import { AppShell } from "../layout/AppShell";
import { createClient } from "@/utils/supabase/server";
import NewLinkClient from "./NewLinkClient";
import { getPlanConfig } from "@/lib/pricing";

export default async function NewLinkServer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: sites, error }, { data: profile }, { count: postsUsed }] = await Promise.all([
    supabase.from("sites").select("id, name, domain").eq("user_id", user!.id).order("created_at", { ascending: true }),
    supabase.from("users").select("plan").eq("id", user!.id).maybeSingle(),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
  ]);
  const plan = getPlanConfig(profile?.plan);

  if (error) console.error(error);

  return (
    <AppShell>
      <NewLinkClient
        sites={sites ?? []}
        authorName={user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "You"}
        postsUsed={postsUsed ?? 0}
        postsLimit={plan.posts}
        planName={plan.name}
      />
    </AppShell>
  );
}
