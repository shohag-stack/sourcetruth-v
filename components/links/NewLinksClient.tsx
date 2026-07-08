'use client'
// components/links/NewLinkClient.tsx

import { AppShell } from '@/components/layout/AppShell'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORM_META, SocialChannel } from '@/lib/dummy-data'

const CHANNELS: SocialChannel[] = ['linkedin', 'twitter', 'instagram', 'facebook', 'threads', 'bluesky']

const CHAR_LIMITS: Partial<Record<SocialChannel, number>> = {
  twitter: 280,
  threads: 500,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  bluesky: 300,
}

interface Site {
  id: string
  name: string
  domain: string
}

interface NewLinkClientProps {
  sites: Site[]
}

export default function NewLinkClient({ sites }: NewLinkClientProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [destination, setDestination] = useState('')
  const [channel, setChannel] = useState<SocialChannel>('linkedin')
  const [campaign, setCampaign] = useState('')
  const [siteId, setSiteId] = useState<string | null>(sites[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limit = CHAR_LIMITS[channel] || 3000
  const overLimit = content.length > limit
  const canSubmit = destination.trim() && content.trim() && !overLimit && !loading && siteId

  async function handleGenerate() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          destination,
          channel,
          campaign: campaign || null,
          site_id: siteId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push('/posts')
    } catch (e) {
      setError('Network error — please try again.')
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">New Post</h1>
          <p className="text-[#94A3B8] text-sm">
            Write your post, generate a tracked link, save it. Come back later to copy and post manually.
          </p>
        </div>

        {sites.length === 0 && (
          <div className="card shadow-card p-5 mb-6 border-[#FDE68A] bg-[#FFF8E7]">
            <p className="text-[13px] text-[#92400E]">
              You need to add a site before creating tracked links.{' '}
              <a href="/connect" className="underline font-medium">Add one here</a>.
            </p>
          </div>
        )}

        {error && (
          <div className="card shadow-card p-4 mb-6 border-[#FCA5A5] bg-[#FEF2F2]">
            <p className="text-[13px] text-[#B91C1C]">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-4">

            {sites.length > 1 && (
              <div className="card shadow-card p-5">
                <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">
                  Site
                </label>
                <select
                  value={siteId ?? ''}
                  onChange={e => setSiteId(e.target.value)}
                  className="input">
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.domain})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="card shadow-card p-5">
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-3">
                Platform
              </label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(ch => {
                  const meta = PLATFORM_META[ch]
                  const selected = channel === ch
                  return (
                    <button key={ch} onClick={() => setChannel(ch)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border transition-all"
                      style={selected
                        ? { backgroundColor: meta.bgColor, borderColor: meta.color, color: meta.color }
                        : { backgroundColor: '#F8F9FC', borderColor: '#E8ECF2', color: '#475569' }}>
                      <span className="font-bold">{meta.icon}</span>
                      {meta.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="card shadow-card p-5">
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">
                Post content
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Write your ${PLATFORM_META[channel].name} post here...`}
                rows={10}
                className="w-full resize-none text-[14px] text-[#0F172A] placeholder-[#CBD5E1] outline-none leading-relaxed"
              />
              <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF2] mt-2">
                <span className="text-[11px] text-[#94A3B8]">
                  {PLATFORM_META[channel].name} limit: {limit.toLocaleString()} chars
                </span>
                <span className={`text-[12px] tabular font-medium ${overLimit ? 'text-[#EF4444]' : content.length > limit * 0.9 ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>
                  {content.length}/{limit}
                </span>
              </div>
            </div>

            <div className="card shadow-card p-5">
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">
                Destination URL <span className="text-red-400">*</span>
              </label>
              <input type="url" value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="https://yoursite.com/product"
                className="input mb-2" />
              <p className="text-[11px] text-[#94A3B8]">
                Where people land after clicking your tracked link
              </p>
            </div>

            <div className="card shadow-card p-5">
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">
                Campaign tag <span className="text-[#CBD5E1] font-normal normal-case">(optional)</span>
              </label>
              <input type="text" value={campaign}
                onChange={e => setCampaign(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. june-launch"
                className="input font-mono" />
              <p className="text-[11px] text-[#94A3B8] mt-2">
                Group multiple posts under one campaign to see combined revenue
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card shadow-card p-5">
              <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">What happens next</div>
              <div className="space-y-3">
                {[
                  { icon: '⚡', text: 'A tracked link is generated for your post' },
                  { icon: '💾', text: 'Your post + link are saved here' },
                  { icon: '📋', text: 'Come back anytime to copy content + link' },
                  { icon: '📤', text: 'Paste manually into LinkedIn, Twitter, wherever' },
                  { icon: '💰', text: 'SourceTruth tracks every click and sale' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-[13px] text-[#475569]">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#EEF2FF] rounded-2xl p-4">
              <div className="text-[11px] font-bold text-[#6366F1] uppercase tracking-widest mb-2">Tracked for you</div>
              <div className="space-y-1 text-[12px] text-[#4338CA]">
                <div>✓ Total clicks</div>
                <div>✓ Unique clicks</div>
                <div>✓ Sales & conversion rate</div>
                <div>✓ Revenue by payment provider</div>
              </div>
            </div>

            <div className="bg-[#FFF8E7] border border-[#FDE68A] rounded-2xl p-4">
              <div className="text-[11px] font-bold text-[#92400E] uppercase tracking-widest mb-1">No social API</div>
              <p className="text-[12px] text-[#92400E] leading-relaxed">
                Likes, reach, and impressions are not tracked — those need social API access which we don't use.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Saving...' : '⚡ Generate Link & Save'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}