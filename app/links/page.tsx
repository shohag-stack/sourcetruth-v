// app/links/page.tsx
import { createClient } from '@/utils/supabase/server'
import NewLinkClient from '@/components/links/NewLinksClient'

export default async function NewLinkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  if (error) console.error(error)

  return <NewLinkClient sites={sites ?? []} />
}