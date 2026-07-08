'use client'
// components/settings/SettingsClient.tsx

import { AppShell } from '@/components/layout/AppShell'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Site {
  id: string
  name: string
  domain: string
  site_key: string
}

interface SettingsClientProps {
  site: Site | null
}

export default function SettingsClient({ site }: SettingsClientProps) {
  const router = useRouter()
  const [siteName, setSiteName] = useState(site?.name ?? '')
  const [siteUrl, setSiteUrl] = useState(site?.domain ? `https://${site.domain}` : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // These stay local-only for now — no columns on `sites` for them yet.
  // Wire these up once you add the corresponding fields to the schema.
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [attribution, setAttribution] = useState<'first' | 'last' | 'linear'>('first')
  const [cookieDays, setCookieDays] = useState(30)

  async function save() {
    if (!siteName.trim() || !siteUrl.trim()) {
      setError('Site name and URL are required.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/sites', {
        method: site ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          site
            ? { id: site.id, name: siteName, domain: siteUrl }
            : { name: siteName, domain: siteUrl }
        ),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        setSaving(false)
        return
      }

      router.refresh() // re-fetches the server page, gets the real site_key
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  function copySiteKey() {
    if (!site) return
    navigator.clipboard.writeText(site.site_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell>
      <div className="p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Settings</h1>
          <p className="text-[#94A3B8] text-sm">Configure your workspace and attribution model.</p>
        </div>

        {!site && (
          <div className="card shadow-card p-4 mb-6 border-[#C7D2FE] bg-[#EEF2FF]">
            <p className="text-[13px] text-[#4338CA]">
              You haven't added a site yet. Fill this in and save to get your tracking Site ID.
            </p>
          </div>
        )}

        {error && (
          <div className="card shadow-card p-4 mb-6 border-[#FCA5A5] bg-[#FEF2F2]">
            <p className="text-[13px] text-[#B91C1C]">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          {/* Workspace */}
          <div className="card shadow-card p-5">
            <h2 className="font-semibold text-[#0F172A] mb-4">Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Site name</label>
                <input value={siteName} onChange={e => setSiteName(e.target.value)}
                  placeholder="Raysa Studio" className="input" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Website URL</label>
                <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)}
                  placeholder="https://yoursite.com" className="input" type="url" />
              </div>
              {site && (
                <div>
                  <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Site ID</label>
                  <div className="flex gap-2">
                    <code className="flex-1 input bg-[#F8F9FC] text-[#6366F1] font-mono text-[12px]">
                      {site.site_key}
                    </code>
                    <button onClick={copySiteKey} className="btn-secondary text-xs px-3">
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-2">
                    Add to your site: <code className="text-[#6366F1]">{`<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`}</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attribution model — UI only until schema supports it */}
          <div className="card shadow-card p-5">
            <h2 className="font-semibold text-[#0F172A] mb-1">Attribution Model</h2>
            <p className="text-[12px] text-[#94A3B8] mb-4">How revenue is credited across multiple touchpoints.</p>
            <div className="space-y-2">
              {[
                { id: 'first', label: 'First touch', desc: 'Credit goes to the first post the customer ever clicked.' },
                { id: 'last', label: 'Last touch', desc: 'Credit goes to the last post clicked before purchase.' },
                { id: 'linear', label: 'Linear', desc: 'Revenue split equally across all posts the customer clicked.' },
              ].map(opt => (
                <label key={opt.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${attribution === opt.id ? 'bg-[#EEF2FF] border-[#C7D2FE]' : 'bg-[#F8F9FC] border-transparent hover:border-[#E8ECF2]'}`}>
                  <input type="radio" name="attribution" value={opt.id}
                    checked={attribution === opt.id}
                    onChange={() => setAttribution(opt.id as typeof attribution)}
                    className="mt-0.5 accent-[#6366F1]" />
                  <div>
                    <div className="text-[13px] font-medium text-[#0F172A]">{opt.label}</div>
                    <div className="text-[12px] text-[#94A3B8] mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-[12px] font-medium text-[#475569] mb-1.5">
                Cookie window — <span className="text-[#6366F1]">{cookieDays} days</span>
              </label>
              <input type="range" min={7} max={90} step={1} value={cookieDays}
                onChange={e => setCookieDays(Number(e.target.value))}
                className="w-full accent-[#6366F1]" />
              <div className="flex justify-between text-[11px] text-[#94A3B8] mt-1">
                <span>7 days</span><span>90 days</span>
              </div>
            </div>
          </div>

          {/* Notifications — UI only until schema supports it */}
          <div className="card shadow-card p-5">
            <h2 className="font-semibold text-[#0F172A] mb-4">Notifications</h2>
            <div className="space-y-3">
              {[
                { label: 'Email alerts for new sales', desc: 'Get an email every time a post drives a conversion.', value: emailAlerts, set: setEmailAlerts },
                { label: 'Weekly revenue digest', desc: 'Summary of top posts and revenue every Monday.', value: weeklyDigest, set: setWeeklyDigest },
              ].map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#0F172A]">{item.label}</div>
                    <div className="text-[12px] text-[#94A3B8] mt-0.5">{item.desc}</div>
                  </div>
                  <button onClick={() => item.set(!item.value)}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${item.value ? 'bg-[#6366F1]' : 'bg-[#E8ECF2]'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${item.value ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving} className="btn-primary w-full py-3 disabled:opacity-50">
            {saving ? 'Saving...' : site ? 'Save Settings' : 'Create Site'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}