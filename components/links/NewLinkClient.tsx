'use client'
// components/links/NewLinkClient.tsx
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Globe,
  Hash,
  Info,
  Link2,
  Loader2,
  MousePointerClick,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { ImageUploader, type PostImage } from '@/components/posts/ImageUploader'

// Character limits per network — the post is checked against all of them,
// since one post is usually shared to several places
const LIMITS = [
  { name: 'X', limit: 280 },
  { name: 'Bluesky', limit: 300 },
  { name: 'Threads', limit: 500 },
  { name: 'LinkedIn', limit: 3000 },
]
const MAX_LENGTH = 3000

interface Site {
  id: string
  name: string
  domain: string
}

interface NewLinkClientProps {
  sites: Site[]
  authorName: string
}

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export default function NewLinkClient({ sites, authorName }: NewLinkClientProps) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [destination, setDestination] = useState('')
  const [destinationTouched, setDestinationTouched] = useState(false)
  const [campaign, setCampaign] = useState('')
  const [image, setImage] = useState<PostImage | null>(null)
  const [siteId, setSiteId] = useState<string | null>(sites[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destinationUrl = useMemo(() => parseUrl(destination), [destination])
  const destinationInvalid = destination.trim() !== '' && !destinationUrl
  const overLimit = content.length > MAX_LENGTH
  const canSubmit = Boolean(content.trim() && destinationUrl && !overLimit && !loading && siteId)

  // What the tracked link will look like — the real slug is generated on save
  const trackedPreview = destinationUrl
    ? `${destinationUrl.host}${destinationUrl.pathname === '/' ? '' : destinationUrl.pathname}?st=•••••••`
    : null

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
          destination: destinationUrl!.toString(),
          // The platform picker was removed; attribution comes from the real referrer
          channel: 'linkedin',
          campaign: campaign || null,
          site_id: siteId,
          image_url: image?.url ?? null,
          image_file_id: image?.fileId ?? null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push('/posts')
    } catch {
      setError('Network error — please try again.')
      setLoading(false)
    }
  }

  const sectionLabel = 'flex items-center gap-2 text-[12px] font-semibold text-ink mb-2'

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-heading-lg text-ink mb-0.5">New post</h1>
          <p className="text-body-sm text-muted">
            Write it once, get a tracked link, then share it anywhere from Your Posts.
          </p>
        </div>
        {sites.length > 1 && (
          <label className="flex items-center gap-2 text-body-sm text-muted">
            <Globe className="h-4 w-4" aria-hidden />
            <select
              value={siteId ?? ''}
              onChange={(e) => setSiteId(e.target.value)}
              className="input !w-auto !py-2 cursor-pointer"
              aria-label="Site"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {sites.length === 0 && (
        <div className="card p-4 mb-6 bg-primary-tint border-primary/20 text-body-sm text-ink flex items-center gap-2">
          <Info className="h-4 w-4 text-primary shrink-0" aria-hidden />
          Add a site before creating tracked links.{' '}
          <a href="/connect" className="text-primary font-medium underline">
            Connect a site →
          </a>
        </div>
      )}

      {error && (
        <div className="card p-4 mb-6 border-red-200 bg-red-50 text-body-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Composer ─────────────────────────────────────── */}
        <div className="lg:col-span-7 card shadow-card divide-y divide-line">
          {/* Text */}
          <section className="p-5">
            <div className={sectionLabel}>Post</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are you sharing? Write it like you'd post it…"
              rows={8}
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink placeholder-muted outline-none"
              autoFocus
            />
            <div className="flex items-center justify-between gap-3 flex-wrap pt-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {LIMITS.map(({ name, limit }) => {
                  const fits = content.length <= limit
                  return (
                    <span
                      key={name}
                      title={`${name} allows ${limit.toLocaleString()} characters`}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        content.length === 0
                          ? 'bg-surface-muted text-muted'
                          : fits
                            ? 'bg-surface-muted text-body'
                            : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {content.length > 0 && fits && <Check className="h-3 w-3" aria-hidden />}
                      {name}
                    </span>
                  )
                })}
              </div>
              <span className={`text-[12px] tabular font-medium ${overLimit ? 'text-red-600' : 'text-muted'}`}>
                {content.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
              </span>
            </div>
          </section>

          {/* Image */}
          <section className="p-5">
            <div className={sectionLabel}>
              Image <span className="font-normal text-muted">optional</span>
            </div>
            <ImageUploader value={image} onChange={setImage} />
          </section>

          {/* Destination */}
          <section className="p-5">
            <label htmlFor="destination" className={sectionLabel}>
              Destination URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
              <input
                id="destination"
                type="url"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onBlur={() => setDestinationTouched(true)}
                placeholder="https://yoursite.com/product"
                className={`input !pl-10 ${destinationTouched && destinationInvalid ? '!border-red-400 focus:!ring-red-100' : ''}`}
                aria-invalid={destinationTouched && destinationInvalid}
              />
            </div>
            {destinationTouched && destinationInvalid ? (
              <p className="mt-2 text-[12px] text-red-600">Enter a full URL, starting with https://</p>
            ) : trackedPreview ? (
              <p className="mt-2 text-[12px] text-muted">
                Tracked link: <span className="font-mono text-primary">{trackedPreview}</span>
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-muted">Where people land when they click your link.</p>
            )}
          </section>

          {/* Campaign */}
          <section className="p-5">
            <label htmlFor="campaign" className={sectionLabel}>
              Campaign <span className="font-normal text-muted">optional</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
              <input
                id="campaign"
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="june-launch"
                className="input !pl-10 font-mono"
              />
            </div>
            <p className="mt-2 text-[12px] text-muted">Group posts to see their combined revenue.</p>
          </section>
        </div>

        {/* ── Preview + save ───────────────────────────────── */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div>
            <div className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-2">Preview</div>
            <div className="card shadow-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-9 w-9 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink leading-tight">{authorName}</div>
                    <div className="text-[11px] text-muted">Just now</div>
                  </div>
                </div>
                <p
                  className={`text-[14px] leading-relaxed whitespace-pre-wrap line-clamp-6 ${
                    content ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {content || 'Your post will appear here as you type.'}
                </p>
                {trackedPreview && (
                  <p className="mt-1.5 text-[13px] text-primary font-medium break-all">{trackedPreview}</p>
                )}
              </div>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${image.url}?tr=w-800`} alt="" className="w-full max-h-72 object-cover border-t border-line" />
              )}
            </div>
          </div>

          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">Tracked for you</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: MousePointerClick, label: 'Clicks' },
                { icon: Users, label: 'Unique visitors' },
                { icon: ShoppingBag, label: 'Sales' },
                { icon: CircleDollarSign, label: 'Revenue' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-body-sm text-ink">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-tint">
                    <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  </span>
                  {label}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-muted leading-relaxed">
              Likes and reach aren&apos;t tracked — SourceTruth measures what happens after the click.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="btn-primary w-full !py-3 text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              <>
                Save & get tracked link <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
          {!canSubmit && !loading && (
            <p className="text-center text-[12px] text-muted">
              {!content.trim()
                ? 'Write your post to continue'
                : !destinationUrl
                  ? 'Add a destination URL to continue'
                  : overLimit
                    ? `Shorten your post to ${MAX_LENGTH.toLocaleString()} characters`
                    : null}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
