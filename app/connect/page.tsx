// app/connect/page.tsx
import { createClient } from '@/utils/supabase/server'
import ConnectClient from '@/components/connect/ConnectClient'

export default async function ConnectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: site } = await supabase
    .from('sites')
    .select('id, site_key')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: connections } = await supabase
    .from('payment_connections')
    .select('*')
    .eq('user_id', user!.id)

  return <ConnectClient site={site} connections={connections ?? []} />
}