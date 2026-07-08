// components/posts/PostCard.tsx
import { SocialPost, PLATFORM_META, PAYMENT_META } from '@/lib/dummy-data'
import { formatMoney, formatNumber, timeAgo, formatScheduled } from '@/lib/utils'
import Link from 'next/link'

interface PostCardProps {
  post: SocialPost
  maxRevenue?: number
}

const STATUS_STYLES: Record<string, string> = {
  published: 'badge-emerald',
  scheduled: 'badge-amber',
  draft: 'badge-gray',
  failed: 'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  scheduled: 'Scheduled',
  draft: 'Draft',
  failed: 'Failed',
}

export function PostCard({ post, maxRevenue = 5000 }: PostCardProps) {
  const revenuePct = maxRevenue > 0 ? Math.min((post.revenue / maxRevenue) * 100, 100) : 0

  return (
    <div className="card shadow-card hover:shadow-card-hover transition-all duration-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {post.channels.map(ch => {
            const meta = PLATFORM_META[ch]
            return (
              <span key={ch}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold"
                style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                <span className="text-[10px] font-bold">{meta.icon}</span>
                {meta.name}
              </span>
            )
          })}
        </div>
        <span className={`badge ${STATUS_STYLES[post.status]} flex-shrink-0`}>
          {STATUS_LABELS[post.status]}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-[13px] text-[#475569] leading-relaxed line-clamp-3 mb-4">
        {post.content}
      </p>

      {/* Revenue pulse bar — signature element */}
      {post.status === 'published' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#94A3B8]">Revenue earned</span>
            <span className="text-[13px] font-bold text-[#0F172A] tabular">{formatMoney(post.revenue)}</span>
          </div>
          <div className="revenue-pulse">
            <div className="revenue-pulse-fill" style={{ width: `${revenuePct}%` }} />
          </div>
        </div>
      )}

      {/* Stats row */}
      {post.status === 'published' ? (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Clicks', value: formatNumber(post.clicks) },
            { label: 'Conv.', value: post.conversions.toString() },
            { label: 'Likes', value: formatNumber(post.likes) },
            { label: 'Reach', value: formatNumber(post.impressions) },
          ].map(stat => (
            <div key={stat.label} className="bg-[#F8F9FC] rounded-xl p-2.5 text-center">
              <div className="text-[13px] font-semibold text-[#0F172A] tabular">{stat.value}</div>
              <div className="text-[10px] text-[#94A3B8] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      ) : post.status === 'scheduled' ? (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2 mb-4 text-[12px] text-[#92400E]">
          📅 Scheduled for {post.scheduledAt ? formatScheduled(post.scheduledAt) : '—'}
        </div>
      ) : null}

      {/* Revenue by provider */}
      {post.status === 'published' && Object.keys(post.revenueByProvider).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {Object.entries(post.revenueByProvider).map(([provider, amount]) => {
            const meta = PAYMENT_META[provider as keyof typeof PAYMENT_META]
            return (
              <span key={provider}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-[#F8F9FC] text-[#475569] border border-[#E8ECF2]">
                {meta.icon} {meta.name}: <span className="font-semibold tabular">{formatMoney(amount ?? 0)}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF2]">
        <span className="text-[11px] text-[#94A3B8]">
          {post.publishedAt ? timeAgo(post.publishedAt) : 'Not published'}
        </span>
        <div className="flex items-center gap-2">
          {post.status === 'draft' && (
            <Link href="/compose" className="btn-primary py-1.5 px-3 text-xs">Edit & Publish</Link>
          )}
          {post.status === 'published' && (
            <button className="btn-ghost text-xs py-1.5">View Details →</button>
          )}
        </div>
      </div>
    </div>
  )
}
