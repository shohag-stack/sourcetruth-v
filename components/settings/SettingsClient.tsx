'use client'
// app/settings/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────
interface Site {
  id: string
  name: string
  domain: string
  site_key: string
  created_at: string
}

interface User {
  name: string | null
  email: string
  plan: string
  sites_limit: number
  links_limit: number
}

interface SettingsClientProps {
  user: User
  sites: Site[]
}

// ─── Plan badge colors ────────────────────────────────────────
const PLAN_STYLES: Record<string, string> = {
  free: 'bg-[#F1F4F9] text-[#475569]',
  starter: 'bg-[#EEF2FF] text-[#6366F1]',
  pro: 'bg-[#ECFDF5] text-[#059669]',
  agency: 'bg-[#FFF7ED] text-[#EA580C]',
}

// ─── Generate site key ────────────────────────────────────────
function generateSiteKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'st_'
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)]
  }
  return key
}

function cleanDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim()
}

// ─── Main Component ───────────────────────────────────────────
export default function SettingsClient({ user, sites }: SettingsClientProps) {
  const router = useRouter()

  // Site form state
  const [showAddSite, setShowAddSite] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteDomain, setSiteDomain] = useState('')
  const [addingSite, setAddingSite] = useState(false)
  const [siteError, setSiteError] = useState('')

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Profile state
  const [displayName, setDisplayName] = useState(user.name || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Copied state per site
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const atSiteLimit = user.plan === 'free'
    ? sites.length >= 1
    : user.plan === 'starter'
    ? sites.length >= 3
    : false // pro/agency = unlimited

  // ── Add site ───────────────────────────────────────────────
  async function handleAddSite() {
    if (!siteName.trim() || !siteDomain.trim()) {
      setSiteError('Both name and domain are required.')
      return
    }
    setAddingSite(true)
    setSiteError('')

    // TODO: POST /api/sites
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: siteName.trim(),
        domain: cleanDomain(siteDomain),
        site_key: generateSiteKey(),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setSiteError(data.error || 'Failed to add site.')
      setAddingSite(false)
      return
    }

    setSiteName('')
    setSiteDomain('')
    setShowAddSite(false)
    setAddingSite(false)
    router.refresh()
  }

  // ── Delete site ────────────────────────────────────────────
  async function handleDeleteSite(id: string) {
    // TODO: DELETE /api/sites/:id
    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    router.refresh()
  }

  // ── Copy site key ──────────────────────────────────────────
  function copySiteKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // ── Save profile ───────────────────────────────────────────
  async function handleSaveProfile() {
    setSavingProfile(true)
    // TODO: PATCH /api/user { name: displayName }
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: displayName }),
    })
    setSavingProfile(false)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Settings</h1>
        <p className="text-[#94A3B8] text-sm">Manage your sites, profile and plan.</p>
      </div>

      {/* ── Plan ─────────────────────────────────────────────── */}
      <section className="card shadow-card p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Current Plan</div>
            <div className="flex items-center gap-2">
              <span className={`badge capitalize font-semibold ${PLAN_STYLES[user.plan] || PLAN_STYLES.free}`}>
                {user.plan}
              </span>
              <span className="text-[13px] text-[#94A3B8]">
                {sites.length} / {user.sites_limit === -1 ? '∞' : user.sites_limit} sites used
              </span>
            </div>
          </div>
          {user.plan === 'free' && (
            <a href="/pricing"
              className="btn-primary text-sm py-2 px-4">
              Upgrade →
            </a>
          )}
        </div>

        {/* Usage bars */}
        <div className="mt-4 space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-[#94A3B8] mb-1">
              <span>Sites</span>
              <span>{sites.length} / {user.sites_limit === -1 ? '∞' : user.sites_limit}</span>
            </div>
            <div className="h-1.5 bg-[#F1F4F9] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#6366F1] transition-all"
                style={{
                  width: user.sites_limit === -1 ? '20%'
                    : `${Math.min((sites.length / user.sites_limit) * 100, 100)}%`
                }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Sites ────────────────────────────────────────────── */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-[#0F172A]">Sites</h2>
            <p className="text-[12px] text-[#94A3B8] mt-0.5">
              Each site gets its own tracking script and tracked links.
            </p>
          </div>
          {!atSiteLimit && (
            <button
              onClick={() => setShowAddSite(v => !v)}
              className="btn-primary text-sm py-2 px-4">
              + Add Site
            </button>
          )}
        </div>

        {/* Add site form */}
        {showAddSite && (
          <div className="card shadow-card p-5 mb-3 border-[#6366F1]/20">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">New Site</div>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Site name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  placeholder="e.g. My SaaS Product"
                  className="w-full border border-[#E8ECF2] focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Domain</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">https://</span>
                  <input
                    type="text"
                    value={siteDomain}
                    onChange={e => setSiteDomain(e.target.value)}
                    placeholder="yoursite.com"
                    className="w-full border border-[#E8ECF2] focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl pl-20 pr-3.5 py-2.5 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {siteError && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-2.5 text-[#DC2626] text-sm">
                  {siteError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAddSite}
                  disabled={addingSite}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
                  {addingSite ? 'Adding...' : 'Add Site'}
                </button>
                <button
                  onClick={() => { setShowAddSite(false); setSiteError('') }}
                  className="btn-secondary text-sm py-2 px-4">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Site list */}
        <div className="space-y-3">
          {sites.length === 0 && (
            <div className="card shadow-card p-8 text-center">
              <div className="text-3xl mb-2">🌐</div>
              <div className="font-medium text-[#0F172A] mb-1">No sites yet</div>
              <div className="text-[13px] text-[#94A3B8]">Add your first site to start tracking</div>
            </div>
          )}

          {sites.map(site => (
            <div key={site.id} className="card shadow-card p-5">

              {/* Site header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="font-semibold text-[#0F172A]">{site.name}</div>
                  <div className="text-[13px] text-[#94A3B8] mt-0.5">https://{site.domain}</div>
                </div>
                <button
                  onClick={() => setDeletingId(site.id)}
                  className="text-[12px] text-[#94A3B8] hover:text-[#EF4444] border border-[#E8ECF2] hover:border-[#FECACA] px-3 py-1.5 rounded-xl transition-all flex-shrink-0">
                  Remove
                </button>
              </div>

              {/* Site key */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Site Key</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#F8F9FC] border border-[#E8ECF2] rounded-xl px-3 py-2 text-[12px] text-[#6366F1] font-mono">
                    {site.site_key}
                  </code>
                  <button
                    onClick={() => copySiteKey(site.site_key)}
                    className="btn-secondary text-[12px] py-2 px-3 flex-shrink-0">
                    {copiedKey === site.site_key ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Tracking snippet */}
              <div>
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                  Tracking Script
                </div>
                <div className="bg-[#F8F9FC] rounded-xl p-3 relative overflow-x-auto">
                  <pre className="text-[11px] text-[#475569] font-mono whitespace-pre-wrap break-all">
{`<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`
                      )
                      setCopiedKey(`snippet-${site.site_key}`)
                      setTimeout(() => setCopiedKey(null), 2000)
                    }}
                    className="absolute top-2 right-2 bg-white border border-[#E8ECF2] text-[#475569] hover:text-[#0F172A] text-[11px] px-2.5 py-1.5 rounded-lg transition-all">
                    {copiedKey === `snippet-${site.site_key}` ? '✓' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-[#94A3B8] mt-1.5">
                  Paste before &lt;/head&gt; on every page of {site.domain}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Plan limit warning */}
        {atSiteLimit && (
          <div className="mt-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#92400E]">Site limit reached</div>
              <div className="text-[12px] text-[#B45309] mt-0.5">
                {user.plan === 'free' ? 'Free plan allows 1 site. Upgrade for more.' : 'Upgrade to Pro for unlimited sites.'}
              </div>
            </div>
            <a href="/pricing" className="btn-primary text-sm py-2 px-4 flex-shrink-0">
              Upgrade →
            </a>
          </div>
        )}
      </section>

      {/* ── Profile ───────────────────────────────────────────── */}
      <section className="card shadow-card p-5 mb-5">
        <h2 className="font-semibold text-[#0F172A] mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-[#E8ECF2] focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF] rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full border border-[#E8ECF2] rounded-xl px-3.5 py-2.5 text-sm bg-[#F8F9FC] text-[#94A3B8] cursor-not-allowed"
            />
            <p className="text-[11px] text-[#94A3B8] mt-1">Email cannot be changed</p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <section className="card shadow-card p-5 border-[#FCA5A5]/30">
        <h2 className="font-semibold text-[#0F172A] mb-1">Danger Zone</h2>
        <p className="text-[13px] text-[#94A3B8] mb-4">These actions are permanent and cannot be undone.</p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This will delete your account and all data permanently.')) {
              // TODO: DELETE /api/user
              console.log('TODO: delete account')
            }
          }}
          className="text-sm px-4 py-2 rounded-xl border border-[#FECACA] text-[#EF4444] hover:bg-[#FEF2F2] transition-all">
          Delete Account
        </button>
      </section>

      {/* ── Delete confirm modal ──────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-xl mb-2">⚠️</div>
            <h3 className="font-bold text-[#0F172A] mb-2">Remove this site?</h3>
            <p className="text-[13px] text-[#475569] mb-5 leading-relaxed">
              All tracked links, clicks, and conversions for this site will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteSite(deletingId)}
                className="flex-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-medium rounded-xl py-2.5 text-sm transition-all">
                Yes, remove it
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 btn-secondary text-sm py-2.5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}