// app/settings/page.tsx
import { createClient } from '@/utils/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import SettingsClient from '@/components/settings/SettingsClient'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, email, plan, sites_limit, links_limit')
    .eq('id', user.id)
    .single()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, domain, site_key, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <AppShell>
      <SettingsClient
        user={profile ?? {
          name: null,
          email: user.email ?? '',
          plan: 'free',
          sites_limit: 1,
          links_limit: 10,
        }}
        sites={sites ?? []}
      />
    </AppShell>
  )
}