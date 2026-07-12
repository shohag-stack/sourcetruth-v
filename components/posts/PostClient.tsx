"use client";
// components/posts/PostClient.tsx

import { AppShell } from "@/components/layout/AppShell";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLATFORM_META } from "@/lib/dummy-data";
import { DbPost, SocialChannel } from "@/types/posts";
import { formatMoneyFull, formatNumber, timeAgo } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  posted: "badge-success",
  ready: "badge-primary-tint",
  draft: "badge-gray",
  archived: "badge-gray",
};

const STATUS_LABELS: Record<string, string> = {
  posted: "✓ Posted",
  ready: "⚡ Ready to post",
  draft: "○ Draft",
  archived: "○ Archived",
};

interface PostClientProps {
  posts: DbPost[];
}

export default function PostClient({ posts: initialPosts }: PostClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<DbPost[]>(initialPosts);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "ready" | "posted">("all");

  const maxRevenue = Math.max(1, ...posts.map((p) => p.revenue_cents));

  const filtered = posts
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => {
      if (a.status === "ready" && b.status !== "ready") return -1;
      if (b.status === "ready" && a.status !== "ready") return 1;
      return b.revenue_cents - a.revenue_cents;
    });

  function copyContent(post: DbPost) {
    const full_tracked_copy = `${post.content} ${post.tracked_link}`;
    navigator.clipboard.writeText(full_tracked_copy);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyLink(post: DbPost) {
    navigator.clipboard.writeText(post.tracked_link);
    setCopiedLinkId(post.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }

  async function markPosted(id: string) {
    const prev = posts;
    // optimistic update
    setPosts((p) =>
      p.map((post) =>
        post.id === id ? { ...post, status: "posted" as const } : post,
      ),
    );

    const res = await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "posted" }),
    });

    if (!res.ok) {
      setPosts(prev); // rollback on failure
      console.error("Failed to mark posted");
      return;
    }

    router.refresh(); // re-syncs with server state (e.g. posted_at)
  }

  console.log("showing post from postClient page", posts);

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-heading-lg text-ink mb-0.5">Your Posts</h1>
            <p className="text-body-sm text-muted">
              {posts.filter((p) => p.status === "ready").length} ready to post ·{" "}
              {posts.filter((p) => p.status === "posted").length} posted
            </p>
          </div>
          <Link href="/links" className="btn-primary">
            New Post
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-surface-muted p-1 rounded-xl w-fit border border-line">
          {(["all", "ready", "posted"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-all capitalize ${
                filter === f
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:text-body"
              }`}
            >
              {f === "all"
                ? "All posts"
                : f === "ready"
                ? "⚡ Ready to post"
                : "✓ Posted"}
            </button>
          ))}
        </div>

        {/* Post grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((post) => {
            const revPct =
              maxRevenue > 0
                ? Math.min((post.revenue_cents / maxRevenue) * 100, 100)
                : 0;
            const isReady = post.status === "ready";
            const conversionRate =
              post.total_clicks > 0
                ? (post.total_conversions / post.total_clicks) * 100
                : 0;

            const meta = PLATFORM_META[post.channel];

            return (
              <div key={post.id} className="card p-4 flex flex-col">
                {/* Top row — channel pill + status + timestamp */}
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="badge-gray">
                      {meta?.icon} {meta?.name ?? post.channel}
                    </span>

                    <span className={STATUS_STYLES[post.status]}>
                      {STATUS_LABELS[post.status]}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {timeAgo(post.created_at)}
                  </span>
                </div>

                {/* Content preview */}
                <p className="text-body-sm text-body leading-relaxed line-clamp-3 mb-3">
                  {post.content}
                </p>

                <div className="border-t border-line -mx-4 mb-3" />

                {post.status === "posted" ? (
                  <>
                    {/* Revenue line */}
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-heading-sm text-ink tabular">
                        {formatMoneyFull(post.revenue_cents / 100)}
                      </span>
                      <span className="text-caption text-muted normal-case font-normal">
                        / Revenue earned
                      </span>
                    </div>

                    {/* Stat row */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        {
                          label: "Clicks",
                          value: formatNumber(post.total_clicks),
                        },
                        {
                          label: "Unique",
                          value: formatNumber(post.unique_clicks),
                        },
                        {
                          label: "Sales",
                          value: post.total_conversions.toString(),
                        },
                        {
                          label: "Conv. rate",
                          value: `${conversionRate.toFixed(1)}%`,
                          highlight: conversionRate > 2,
                        },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <div
                            className={`text-body-sm font-bold tabular ${
                              s.highlight ? "text-success" : "text-ink"
                            }`}
                          >
                            {s.value}
                          </div>
                          <div className="text-[10px] text-muted mt-0.5">
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="revenue-pulse mb-3">
                      <div
                        className="revenue-pulse-fill"
                        style={{ width: `${revPct}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-surface-muted rounded-xl p-3 mb-3">
                    <div className="text-caption text-muted uppercase tracking-widest mb-2">
                      Will track once posted
                    </div>
                    <div className="space-y-1 text-body-sm text-muted">
                      <div>○ Clicks + unique visitors</div>
                      <div>○ Sales & conversion rate</div>
                      <div>○ 30-day attribution</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                  <button
                    onClick={() => copyContent(post)}
                    className="btn-ghost !px-2.5 !py-1.5 text-[12px] border border-line"
                  >
                    {copiedId === post.id ? "✓ Copied!" : "📋 Copy post"}
                  </button>
                  <button
                    onClick={() => copyLink(post)}
                    className="btn-ghost !px-2.5 !py-1.5 text-[12px] border border-line"
                  >
                    {copiedLinkId === post.id ? "✓ Copied!" : "🔗 Copy link"}
                  </button>
                  {isReady && (
                    <button
                      onClick={() => markPosted(post.id)}
                      className="text-[12px] py-1.5 px-2.5 text-success border border-success/30 bg-success-tint hover:bg-success-tint/70 rounded-xl transition-all font-medium"
                    >
                      Mark posted ✓
                    </button>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-primary font-mono bg-primary-tint px-2 py-1 rounded-lg truncate">
                  {post.tracked_link}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">✍️</div>
            <div className="font-semibold text-ink mb-1">No posts yet</div>
            <div className="text-muted text-sm mb-4">
              Generate your first tracked link to get started
            </div>
            <Link href="/links" className="btn-primary inline-block">
              + New Post
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
