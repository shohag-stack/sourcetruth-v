// app/connect/page.tsx
import { createClient, getAuthUser } from "@/utils/supabase/server";
import ConnectClient from "@/components/connect/ConnectClient";
import { AppShell } from "@/components/layout/AppShell";

export default async function ConnectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getAuthUser();

  const { data: site } = await supabase
    .from("sites")
    .select("id, site_key")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: connections } = await supabase
    .from("payment_connections")
    .select("*")
    .eq("user_id", user!.id);

  return (
    <AppShell>
      <ConnectClient site={site} connections={connections ?? []} />
    </AppShell>
  );
}
