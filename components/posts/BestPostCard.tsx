import { countryFlag } from "@/lib/countryFlag";
import { metaFor } from "@/lib/metaFor";
import { formatMoneyFull, formatNumber, timeAgo } from "@/lib/utils";
import React from "react";

type BestPost = {
  id: string;
  content: string;
  revenue_cents: number;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  created_at: string;
};

type BestPostCardProps = {
  actualSources: string[];
  post: BestPost;
  countries: string[];
  conversionRate: number;
};

export default function BestPostCard({
  actualSources,
  post,
  countries,
  conversionRate,
}: BestPostCardProps) {
  return (
    <div key={post.id} className="card p-4">
      {/* Real source(s), not declared channel */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        {countries.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted normal-case font-normal">
              Top clicks:
            </span>
            <div className="flex gap-1 text-md">
              {countries.map((c, i) => (
                <span key={i} title={c}>
                  {countryFlag(c)}
                </span>
              ))}
            </div>
          </div>
        )}

        <span className="text-[12px] text-muted">
                            {timeAgo(post.created_at)}
                          </span>
      </div>

      <p className="text-body-sm text-body leading-relaxed line-clamp-2 mb-3">
        {post.content}
      </p>

      <div className="border-t border-line -mx-4 mb-3" />

      {/* Real source(s) this post actually sold through */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-caption normal-case font-normal">
        <span className="text-muted">Sold via:</span>
        {actualSources.length > 0 ? (
          actualSources.map((src) => {
            const meta = metaFor(src);
            return (
              <span key={src} className="">
                {meta.iconType === "direct" ? (
                  <span>{meta.icon}</span>
                ) : meta.iconType === "favicon" ? (
                  <img
                    src={meta.iconUrl}
                    alt=""
                    className="h-4 w-4 rounded-sm"
                  />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-surface-muted text-[10px] font-bold text-muted">
                    {meta.initials}
                  </span>
                )}
              </span>
            );
          })
        ) : (
          <span className="text-caption text-muted normal-case font-normal">
            No sales yet
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span className="text-2xl font-bold text-ink tabular">
          {formatMoneyFull(post.revenue_cents / 100)}{" "}
          <span className="text-caption text-muted normal-case font-normal">
            / Revenue earned
          </span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
          <div
            key={s.label}
            className="text-center flex flex-col bg-surface-muted py-4 rounded-lg"
          >
            <div
              className={`text-xl font-bold tabular ${
                s.highlight ? "text-success" : "text-ink"
              }`}
            >
              {s.value}
            </div>
            <div className="text-[12px] text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
