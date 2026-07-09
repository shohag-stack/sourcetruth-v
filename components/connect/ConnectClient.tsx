'use client'
// components/connect/ConnectClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PAYMENT_META, PaymentProvider } from '@/lib/dummy-data'

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

const PROVIDERS: PaymentProvider[] = ['lemon_squeezy', 'stripe', 'paddle', 'gumroad', 'woocommerce']

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
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Connections</h1>
        <p className="text-[#94A3B8] text-sm">Connect your payment providers to start tracking revenue.</p>
      </div>

      {error && (
        <div className="card shadow-card p-4 mb-6 border-[#FCA5A5] bg-[#FEF2F2]">
          <p className="text-[13px] text-[#B91C1C]">{error}</p>
        </div>
      )}

      {/* Payment providers */}
      <section className="mb-8">
        <h2 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Payment Providers</h2>
        <div className="space-y-3">
          {PROVIDERS.map(provider => {
            const meta = PAYMENT_META[provider]
            const conn = connections.find(c => c.provider === provider)
            const isLs = provider === 'lemon_squeezy'

            return (
              <div key={provider} className={`card shadow-card p-4 ${conn?.connected? "bg-green-100" : "white" }`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F9FC] flex items-center justify-center text-xl flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#0F172A]">{meta.name}</div>
                    {conn?.connected ? (
                      <div className="text-[12px] text-[#94A3B8]">{conn.account_name}</div>
                    ) : (
                      <div className="text-[12px] text-[#94A3B8]">
                        {isLs ? 'Paste your Store ID and API key to connect' : 'Coming soon'}
                      </div>
                    )}
                  </div>
                  {conn?.connected ? (
                    <button onClick={() => disconnect(conn.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl border border-[#ff4f4f] text-[#ff1616] hover:text-[#EF4444] hover:border-[#FCA5A5] transition-colors`}>
                      Disconnect
                    </button>
                  ) : isLs ? (
                    <button onClick={() => setShowLsForm(v => !v)} className="btn-primary text-xs py-1.5 px-3">
                      Connect →
                    </button>
                  ) : (
                    <button disabled className="text-xs py-1.5 px-3 rounded-xl bg-[#F8F9FC] text-[#CBD5E1] cursor-not-allowed">
                      Soon
                    </button>
                  )}
                </div>

                {isLs && showLsForm && !conn?.connected && (
                  <div className="mt-4 pt-4 border-t border-[#E8ECF2] space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#475569] mb-1.5">Store ID</label>
                      <input value={storeId} onChange={e => setStoreId(e.target.value)}
                        placeholder="e.g. 12345" className="input" />
                      <p className="text-[11px] text-[#94A3B8] mt-1">Found in LS Dashboard → Settings → Stores</p>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#475569] mb-1.5">API Key</label>
                      <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                        placeholder="Paste your API key" className="input" />
                      <p className="text-[11px] text-[#94A3B8] mt-1">Found in LS Dashboard → Settings → API</p>
                    </div>
                    <button onClick={connectLemonSqueezy} disabled={saving}
                      className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
                      {saving ? 'Verifying...' : 'Verify & Connect'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Tracking script — now using the real site_key */}
      <section>
        <h2 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Tracking Script</h2>
        <div className="card shadow-card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-[#0F172A]">Add to your site</div>
            <span className="badge-emerald">Required</span>
          </div>
          {!site ? (
            <p className="text-[13px] text-[#94A3B8]">Add a site in Settings first to get your tracking snippet.</p>
          ) : (
            <>
              <p className="text-[13px] text-[#94A3B8] mb-4 leading-relaxed">
                Paste this snippet before <code className="bg-[#F1F4F9] text-[#6366F1] px-1 rounded text-xs">&lt;/head&gt;</code> on every page of your website.
              </p>
              <div className="bg-[#F8F9FC] rounded-xl p-4 font-mono text-[11px] text-[#475569] leading-relaxed relative overflow-x-auto">
                <pre>{`<script src="https://sourcetruth.io/track.js" data-site="${site.site_key}"></script>`}</pre>
                <button onClick={copySnippet}
                  className="absolute top-3 right-3 bg-white border border-[#E8ECF2] text-[#475569] hover:text-[#0F172A] text-[11px] px-3 py-1.5 rounded-lg transition-colors shadow-card">
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