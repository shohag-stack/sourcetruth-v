import Link from 'next/link'
import { PLATFORM_META } from '@/lib/dummy-data'
import { DbPost } from '@/types/posts'
import { formatMoneyFull, formatNumber, timeAgo } from '@/lib/utils'

interface PostCardProps {
  post: DbPost
  maxRevenue?: number
}

const STATUS_STYLES: Record<string, string> = {
  posted: 'badge-emerald',
  ready: 'badge-indigo',
  draft: 'badge-gray',
  archived: 'badge-gray',
}

const STATUS_LABELS: Record<string, string> = {
  posted: 'Posted',
  ready: 'Ready',
  draft: 'Draft',
  archived: 'Archived',
}

export function PostCard({
  post,
  maxRevenue = 5000,
}: PostCardProps) {
  const meta = PLATFORM_META[post.channel]

  const revenue = post.revenue_cents / 100

  const revenuePct =
    maxRevenue > 0
      ? Math.min((post.revenue_cents / maxRevenue) * 100, 100)
      : 0

  const conversionRate =
    post.total_clicks > 0
      ? (post.total_conversions / post.total_clicks) * 100
      : 0

  return (
    <div className="card shadow-card hover:shadow-card-hover transition-all duration-200 p-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold"
          style={{
            backgroundColor: meta.bgColor,
            color: meta.color,
          }}
        >
          <span className="text-[10px]">{meta.icon}</span>
          {meta.name}
        </div>

        <span className={`badge ${STATUS_STYLES[post.status]}`}>
          {STATUS_LABELS[post.status]}
        </span>
      </div>

      {/* Content */}
      <p className="text-[13px] text-[#475569] leading-relaxed line-clamp-3 mb-4">
        {post.content}
      </p>

      {/* Revenue */}
      {post.status === 'posted' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#94A3B8]">
              Revenue earned
            </span>

            <span className="text-[13px] font-bold text-[#0F172A] tabular">
              {formatMoneyFull(revenue)}
            </span>
          </div>

          <div className="revenue-pulse">
            <div
              className="revenue-pulse-fill"
              style={{ width: `${revenuePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {post.status === 'posted' ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            {
              label: 'Clicks',
              value: formatNumber(post.total_clicks),
            },
            {
              label: 'Unique',
              value: formatNumber(post.unique_clicks),
            },
            {
              label: 'Sales',
              value: post.total_conversions.toString(),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#F8F9FC] rounded-xl p-2.5 text-center"
            >
              <div className="text-[13px] font-semibold text-[#0F172A] tabular">
                {stat.value}
              </div>

              <div className="text-[10px] text-[#94A3B8] mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#F8F9FC] rounded-xl p-4 mb-4">
          <div className="text-[12px] text-[#94A3B8]">
            Clicks, conversions and revenue will appear after you mark this post as posted.
          </div>
        </div>
      )}

      {/* Conversion rate */}
      {post.status === 'posted' && (
        <div className="mb-4 text-sm">
          <span className="text-[#94A3B8]">
            Conversion Rate:
          </span>{' '}
          <span className="font-semibold text-[#10B981]">
            {conversionRate.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E8ECF2]">
        <span className="text-[11px] text-[#94A3B8]">
          {post.posted_at
            ? timeAgo(post.posted_at)
            : timeAgo(post.created_at)}
        </span>

        <div className="flex items-center gap-2">
          {post.status === 'draft' && (
            <Link
              href="/compose"
              className="btn-primary py-1.5 px-3 text-xs"
            >
              Edit
            </Link>
          )}

          {post.status === 'posted' && (
            <button className="btn-ghost text-xs py-1.5">
              View Details →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}