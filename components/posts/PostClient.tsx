'use client'
// components/posts/PostClient.tsx

import { AppShell } from '@/components/layout/AppShell'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PLATFORM_META } from '@/lib/dummy-data'
import { DbPost } from '@/types/posts'
import { formatMoneyFull, formatNumber, timeAgo } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  posted: 'bg-[#ECFDF5] text-[#059669]',
  ready: 'bg-[#EEF2FF] text-[#6366F1]',
  draft: 'bg-[#F8F9FC] text-[#94A3B8]',
  archived: 'bg-[#F8F9FC] text-[#94A3B8]',
}

const STATUS_LABELS: Record<string, string> = {
  posted: '✓ Posted',
  ready: '⚡ Ready to post',
  draft: '○ Draft',
  archived: '○ Archived',
}

interface PostClientProps {
  posts: DbPost[]
}

export default function PostClient({ posts: initialPosts }: PostClientProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<DbPost[]>(initialPosts)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'ready' | 'posted'>('all')

  const maxRevenue = Math.max(1, ...posts.map(p => p.revenue_cents))

  const filtered = posts
    .filter(p => filter === 'all' || p.status === filter)
    .sort((a, b) => {
      if (a.status === 'ready' && b.status !== 'ready') return -1
      if (b.status === 'ready' && a.status !== 'ready') return 1
      return b.revenue_cents - a.revenue_cents
    })

  function copyContent(post: DbPost) {
    navigator.clipboard.writeText(post.content)
    setCopiedId(post.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function copyLink(post: DbPost) {
    navigator.clipboard.writeText(post.tracked_link)
    setCopiedLinkId(post.id)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  async function markPosted(id: string) {
    const prev = posts
    // optimistic update
    setPosts(p => p.map(post => post.id === id ? { ...post, status: 'posted' as const } : post))

    console.log('showing posts from markPosted funciton', posts)

    const res = await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted' }),
    })

    if (!res.ok) {
      setPosts(prev) // rollback on failure
      console.error('Failed to mark posted')
      return
    }

    router.refresh() // re-syncs with server state (e.g. posted_at)
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Your Posts</h1>
            <p className="text-[#94A3B8] text-sm">
              {posts.filter(p => p.status === 'ready').length} ready to post ·{' '}
              {posts.filter(p => p.status === 'posted').length} posted
            </p>
          </div>
          <Link href="/links" className="btn-primary">+ New Post</Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-[#F8F9FC] p-1 rounded-xl w-fit border border-[#E8ECF2]">
          {(['all', 'ready', 'posted'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all capitalize ${filter === f ? 'bg-white text-[#0F172A] shadow-card' : 'text-[#94A3B8] hover:text-[#475569]'}`}>
              {f === 'all' ? 'All posts' : f === 'ready' ? '⚡ Ready to post' : '✓ Posted'}
            </button>
          ))}
        </div>

        {/* Post list */}
        <div className="space-y-4">
          {filtered.map(post => {
            const meta = PLATFORM_META[post.channel]
            const revPct = maxRevenue > 0 ? Math.min((post.revenue_cents / maxRevenue) * 100, 100) : 0
            const isReady = post.status === 'ready'
            const conversionRate = post.total_clicks > 0
              ? (post.total_conversions / post.total_clicks) * 100
              : 0

            return (
              <div key={post.id}
                className={`card shadow-card overflow-hidden ${isReady ? 'border-[#6366F1]/20' : ''}`}>

                <div className={`px-5 py-3 flex items-center justify-between border-b border-[#F1F4F9] ${isReady ? 'bg-[#EEF2FF]/40' : 'bg-[#F8F9FC]'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                      {meta.icon} {meta.name}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-lg ${STATUS_STYLES[post.status]}`}>
                      {STATUS_LABELS[post.status]}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">{timeAgo(post.created_at)}</span>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                    {/* Left */}
                    <div className="lg:col-span-3">
                      <div className="bg-[#F8F9FC] rounded-xl p-4 mb-3 relative">
                        <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-line">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => copyContent(post)} className="btn-primary text-[12px] py-2 px-4">
                          {copiedId === post.id ? '✓ Copied!' : '📋 Copy post'}
                        </button>
                        <button onClick={() => copyLink(post)} className="btn-secondary text-[12px] py-2 px-4">
                          {copiedLinkId === post.id ? '✓ Copied!' : '🔗 Copy link only'}
                        </button>
                        {isReady && (
                          <button onClick={() => markPosted(post.id)}
                            className="text-[12px] py-2 px-4 text-[#10B981] border border-[#10B981]/20 bg-[#ECFDF5] hover:bg-[#D1FAE5] rounded-xl transition-all font-medium">
                            Mark as posted ✓
                          </button>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] text-[#94A3B8]">Tracked link:</span>
                        <span className="text-[11px] text-[#6366F1] font-mono bg-[#EEF2FF] px-2 py-0.5 rounded-lg">
                          {post.tracked_link}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="lg:col-span-2">
                      {post.status === 'posted' ? (
                        <>
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] text-[#94A3B8]">Revenue earned</span>
                              <span className="text-[15px] font-bold text-[#0F172A] tabular">
                                {formatMoneyFull(post.revenue_cents / 100)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#F1F4F9] rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${revPct}%`, background: 'linear-gradient(90deg, #6366F1, #10B981)' }} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {[
                              { label: 'Clicks', value: formatNumber(post.total_clicks) },
                              { label: 'Unique', value: formatNumber(post.unique_clicks) },
                              { label: 'Sales', value: post.total_conversions.toString() },
                              { label: 'Conv. rate', value: `${conversionRate.toFixed(1)}%`, highlight: conversionRate > 2 },
                            ].map(s => (
                              <div key={s.label} className="bg-[#F8F9FC] rounded-xl p-2.5 text-center">
                                <div className={`text-[14px] font-bold tabular ${s.highlight ? 'text-[#10B981]' : 'text-[#0F172A]'}`}>
                                  {s.value}
                                </div>
                                <div className="text-[10px] text-[#94A3B8] mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="bg-[#F8F9FC] rounded-xl p-4 h-full flex flex-col justify-center">
                          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Will track once posted</div>
                          <div className="space-y-2 text-[12px] text-[#94A3B8]">
                            <div>○ Clicks + unique visitors</div>
                            <div>○ Sales & conversion rate</div>
                            <div>○ Revenue by provider</div>
                            <div>○ 30-day attribution</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card shadow-card p-12 text-center">
            <div className="text-4xl mb-3">✍️</div>
            <div className="font-semibold text-[#0F172A] mb-1">No posts yet</div>
            <div className="text-[#94A3B8] text-sm mb-4">Generate your first tracked link to get started</div>
            <Link href="/links" className="btn-primary inline-block">+ New Post</Link>
          </div>
        )}
      </div>
    </AppShell>
  )
}