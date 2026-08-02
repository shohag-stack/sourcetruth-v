'use client'
// app/settings/page.tsx (client half)

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

// ─── Plan badge — solid primary for paid-looking emphasis on Free too,
// matches the mockup's filled orange "Free" pill ─────────────────────
const PLAN_STYLES: Record<string, string> = {
  free: 'badge-primary',
  starter: 'badge-primary-tint',
  pro: 'badge-primary-tint',
  agency: 'badge-primary-tint',
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

function snippetFor(siteKey: string): string {
  return `<script src="https://sourcetruth.io/track.js" data-site="${siteKey}"></script>`
}

// ─── Main Component ───────────────────────────────────────────
export default function SettingsClient({ user, sites }: SettingsClientProps) {
  const router = useRouter()

  const [showAddSite, setShowAddSite] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [siteDomain, setSiteDomain] = useState('')
  const [addingSite, setAddingSite] = useState(false)
  const [siteError, setSiteError] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState(user.name || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const atSiteLimit = user.plan === 'free'
    ? sites.length >= 1
    : user.plan === 'starter'
    ? sites.length >= 3
    : false

  async function handleAddSite() {
    if (!siteName.trim() || !siteDomain.trim()) {
      setSiteError('Both name and domain are required.')
      return
    }
    setAddingSite(true)
    setSiteError('')

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

  async function handleDeleteSite(id: string) {
    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    router.refresh()
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: displayName }),
    })
    setSavingProfile(false)
    router.refresh()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-heading-lg text-ink mb-0.5">Settings</h1>
        <p className="text-body-sm text-muted">Manage your sites, profile and plan.</p>
      </div>

      {/* ── Current plan ─────────────────────────────────────── */}
      <section className="card border-primary/30 p-5 mb-8 relative overflow-hidden">
        {/* decorative brand blob, purely visual */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 w-64 h-64 rounded-full opacity-[0.06]"
          style={{ background: 'var(--primary-hex)' }}
        />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-caption text-muted uppercase tracking-widest mb-2">Current Plan</div>
            <div className="flex items-center gap-2">
              <span className={`capitalize font-semibold ${PLAN_STYLES[user.plan] || PLAN_STYLES.free}`}>
                {user.plan}
              </span>
              <span className="text-body-sm text-body">
                {sites.length} / {user.sites_limit === -1 ? '∞' : user.sites_limit} sites used
              </span>
            </div>
          </div>
          <a href="/pricing" className="btn-primary relative">
            Upgrade
          </a>
        </div>
      </section>

      {/* ── Sites ────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h2 className="text-heading-sm text-ink">Sites</h2>
            <p className="text-body-sm text-muted mt-0.5">
              Each site gets its own tracking script and tracked links.
            </p>
          </div>
          {!atSiteLimit && (
            <button onClick={() => setShowAddSite(v => !v)} className="btn-secondary">
              + Add Site
            </button>
          )}
        </div>

        {/* Add site form */}
        {showAddSite && (
          <div className="card p-5 mb-4 border-primary/20">
            <div className="text-caption text-muted uppercase tracking-widest mb-4">New Site</div>
            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-medium text-body mb-1.5">Site name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  placeholder="e.g. My SaaS Product"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-body mb-1.5">Domain</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">https://</span>
                  <input
                    type="text"
                    value={siteDomain}
                    onChange={e => setSiteDomain(e.target.value)}
                    placeholder="yoursite.com"
                    className="input pl-20"
                  />
                </div>
              </div>

              {siteError && (
                <div className="bg-primary-tint border border-primary/20 rounded-xl px-4 py-2.5 text-primary text-sm">
                  {siteError}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleAddSite} disabled={addingSite} className="btn-primary disabled:opacity-50">
                  {addingSite ? 'Adding...' : 'Add Site'}
                </button>
                <button
                  onClick={() => { setShowAddSite(false); setSiteError('') }}
                  className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sites table */}
        {sites.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-2">🌐</div>
            <div className="font-medium text-ink mb-1">No sites yet</div>
            <div className="text-body-sm text-muted">Add your first site to start tracking</div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line">
                  {['Name', 'Domain', 'Site Key', 'Tracking Script', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-caption text-muted uppercase tracking-widest font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.map((site, i) => {
                  const snippet = snippetFor(site.site_key)
                  return (
                    <tr key={site.id} className={i !== sites.length - 1 ? 'border-b border-line' : ''}>
                      <td className="px-5 py-4 text-body-sm text-ink font-medium whitespace-nowrap">
                        {site.name}
                      </td>
                      <td className="px-5 py-4 text-body-sm text-body whitespace-nowrap">
                        https://{site.domain}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button
                          onClick={() => copyToClipboard(site.site_key, `key-${site.id}`)}
                          className="inline-flex items-center gap-1.5 text-body-sm text-success font-mono hover:opacity-70 transition-opacity">
                          {copiedKey === `key-${site.id}` ? '✓ copied' : site.site_key}
                          <span aria-hidden><img src='/src/images/copy.svg'/></span>
                        </button>
                      </td>
                      <td className="px-5 py-3 max-w-[280px]">
                        <button
                          onClick={() => copyToClipboard(snippet, `snippet-${site.id}`)}
                          className="w-full flex items-center justify-between gap-2 bg-surface-muted border border-line rounded-lg px-3 py-2 text-left hover:border-strong transition-colors">
                          <code className="text-[11px] text-muted font-mono truncate">{snippet}</code>
                          <span className="text-muted text-xs flex-shrink-0">
                            {copiedKey === `snippet-${site.id}` ? '✓' : <img src='/src/images/copy.svg'/>}
                          </span>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setDeletingId(site.id)}
                          className="inline-flex items-center gap-1.5 text-body-sm text-primary border border-primary/30 hover:bg-primary-tint px-3 py-1.5 rounded-xl transition-all">
                          <img src='/src/images/remove.svg'/> Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Plan limit warning */}
        {atSiteLimit && (
          <div className="mt-4 bg-primary-tint border border-primary/30 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-body-sm font-semibold text-ink">Site limit reached</div>
              <div className="text-body-sm text-body mt-0.5">
                {user.plan === 'free' ? 'Free plan allows 1 site. Upgrade for more.' : 'Upgrade to Pro for unlimited sites.'}
              </div>
            </div>
            <a href="/pricing" className="btn-primary flex-shrink-0">
              Upgrade
            </a>
          </div>
        )}
      </section>

      {/* ── Profile ───────────────────────────────────────────── */}
      <section className="card p-5 mb-8">
        <h2 className="text-heading-sm text-ink mb-4">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-body-sm font-medium text-body mb-1.5">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input"
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-body mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="input bg-surface-muted text-muted cursor-not-allowed"
            />
            <p className="text-caption text-muted mt-1 normal-case font-normal">Email cannot be changed</p>
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-success disabled:opacity-50">
          {savingProfile ? 'Saving...' : 'Save Profile'}
        </button>
      </section>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <section className="card p-5">
        <h2 className="text-heading-sm text-ink mb-1">Danger Zone</h2>
        <p className="text-body-sm text-muted mb-4">These actions are permanent and cannot be undone.</p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This will delete your account and all data permanently.')) {
              // TODO: DELETE /api/user
              console.log('TODO: delete account')
            }
          }}
          className="btn-outline-primary flex gap-2">
          <img src='/src/images/remove.svg'/> Delete Account
        </button>
      </section>

      {/* ── Delete confirm modal ──────────────────────────────── */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-xl mb-2">⚠️</div>
            <h3 className="text-heading-sm text-ink mb-2">Remove this site?</h3>
            <p className="text-body-sm text-body mb-5 leading-relaxed">
              All tracked links, clicks, and conversions for this site will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteSite(deletingId)}
                className="flex-1 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl py-2.5 text-sm transition-all">
                Yes, remove it
              </button>
              <button onClick={() => setDeletingId(null)} className="flex-1 btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}