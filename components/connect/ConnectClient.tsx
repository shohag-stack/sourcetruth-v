'use client'
// components/connect/ConnectClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PROVIDER_META } from '@/lib/provider'
import {PaymentProvider} from '@/lib/dummy-data'

interface Site {
  id: string
  site_key: string
}

interface Connection {
  id: string
  provider: string
  account_name: string | null
  connected: boolean
}

interface ConnectClientProps {
  site: Site | null
  connections: Connection[]
}

const PROVIDERS: PaymentProvider[] = ['lemon_squeezy', 'stripe', 'paddle', 'woocommerce']

export default function ConnectClient({ site, connections }: ConnectClientProps) {
  const router = useRouter()
  const [showLsForm, setShowLsForm] = useState(false)
  const [storeId, setStoreId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const lsConnection = connections.find(c => c.provider === 'lemon_squeezy')

  async function connectLemonSqueezy() {
    if (!site) {
      setError('Add a site in Settings first.')
      return
    }
    if (!storeId.trim() || !apiKey.trim()) {
      setError('Store ID and API key are both required.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/connections/lemonsqueezy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, api_key: apiKey, site_id: site.id }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      setSaving(false)
      return
    }

    setShowLsForm(false)
    setStoreId('')
    setApiKey('')
    router.refresh()
  }

  async function disconnect(id: string) {
    await fetch('/api/connections/lemonsqueezy', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    router.refresh()
  }

  function copySnippet() {
    if (!site) return
    navigator.clipboard.writeText(
      `<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-ink mb-0.5">Connections</h1>
        <p className="text-body-sm text-muted">Connect your payment providers to start tracking revenue.</p>
      </div>

      {error && (
        <div className="card p-4 mb-6 border-primary/30 bg-primary-tint">
          <p className="text-body-sm text-primary">{error}</p>
        </div>
      )}

      {/* Payment providers */}
      <section className="mb-8">
        <h2 className="text-caption text-muted uppercase tracking-widest mb-4">Payment Providers</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map(provider => {
            const meta = PROVIDER_META[provider]
            const conn = connections.find(c => c.provider === provider)
            const isLs = provider === 'lemon_squeezy'

            return (
              <div key={provider} className="card p-5 flex flex-col items-center text-center">
                <div className="w-24 h-14 flex items-center justify-center text-2xl mb-3">
                  {meta.icon}
                </div>
                <div className="font-medium text-ink mb-1">{meta.name}</div>
                {conn?.connected ? (
                  <div className="text-caption text-muted normal-case font-normal mb-3 truncate w-full">{conn.account_name}</div>
                ) : (
                  <div className="text-caption text-muted normal-case font-normal mb-3">
                    {isLs ? 'Store ID + API key required' : 'Coming soon'}
                  </div>
                )}

                {conn?.connected ? (
                  <button onClick={() => disconnect(conn.id)} className="btn-outline-primary text-xs !py-1.5 !px-3">
                    Disconnect
                  </button>
                ) : isLs ? (
                  <button onClick={() => setShowLsForm(v => !v)} className="btn-outline-success text-xs !py-1.5 !px-3">
                    Connect
                  </button>
                ) : (
                  <button disabled className="text-xs py-1.5 px-3 rounded-xl bg-surface-muted text-muted cursor-not-allowed">
                    Soon
                  </button>
                )}

                {isLs && showLsForm && !conn?.connected && (
                  <div className="mt-4 pt-4 border-t border-line space-y-3 w-full text-left">
                    <div>
                      <label className="block text-body-sm font-medium text-body mb-1.5">Store ID</label>
                      <input value={storeId} onChange={e => setStoreId(e.target.value)}
                        placeholder="e.g. 12345" className="input" />
                      <p className="text-caption text-muted normal-case font-normal mt-1">Found in LS Dashboard → Settings → Stores</p>
                    </div>
                    <div>
                      <label className="block text-body-sm font-medium text-body mb-1.5">API Key</label>
                      <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                        placeholder="Paste your API key" className="input" />
                      <p className="text-caption text-muted normal-case font-normal mt-1">Found in LS Dashboard → Settings → API</p>
                    </div>
                    <button onClick={connectLemonSqueezy} disabled={saving}
                      className="btn-primary text-sm py-2 px-4 w-full disabled:opacity-50">
                      {saving ? 'Verifying...' : 'Verify & Connect'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Tracking script */}
      <section>
        <h2 className="text-caption text-muted uppercase tracking-widest mb-4">Tracking Script</h2>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-ink">Add to your site</div>
            <span className="badge-success">Required</span>
          </div>
          {!site ? (
            <p className="text-body-sm text-muted">Add a site in Settings first to get your tracking snippet.</p>
          ) : (
            <>
              <p className="text-body-sm text-muted mb-4 leading-relaxed">
                Paste this snippet before <code className="bg-surface-muted text-primary px-1 rounded text-xs">&lt;/head&gt;</code> on every page of your website.
              </p>
              <div className="bg-surface-muted rounded-xl p-4 font-mono text-[11px] text-body leading-relaxed relative overflow-x-auto">
                <pre>{`<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`}</pre>
                <button onClick={copySnippet}
                  className="absolute top-3 right-3 bg-surface border border-line text-body hover:text-ink text-[11px] px-3 py-1.5 rounded-lg transition-colors shadow-card">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}