import React from "react";
import { AppShell } from "../layout/AppShell";
import { createClient } from "@/utils/supabase/server";
import NewLinkClient from "./NewLinkClient";

export default async function NewLinkServer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, name, domain")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  if (error) console.error(error);

  return (
    <AppShell>
      <NewLinkClient sites={sites ?? []} />
    </AppShell>
  );
}
