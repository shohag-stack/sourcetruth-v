'use client'
// components/marketing/PricingSlider.tsx

import { useState } from 'react'
import Link from 'next/link'
import { FEATURES, PLANS } from '@/lib/pricing'

// ── PLANS, in ascending order — the slider snaps to these indices.
// Prices/breakpoints below are PLACEHOLDERS, not real pricing decisions
// — swap in your actual numbers. Keeping "features" shared across every
// tier for now since you said this is events-only pricing for now and
// more feature-gating comes later; split into per-tier feature/locked
// lists later if/when that's needed, same shape as the old PLANS array.

function formatEvents(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}K`
  return n.toString()
}

export function PricingSlider() {
  const [index, setIndex] = useState(0)
  const tier = PLANS[index]
  const isFree = tier.price === 0

  return (
    <section id="pricing" className="bg-surface-muted border-y border-line">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-caption text-primary uppercase tracking-widest font-semibold mb-3">Pricing</p>
          <h2 className="text-[36px] font-bold text-ink mb-3">Simple, honest pricing</h2>
          <p className="text-body-sm text-muted max-w-md mx-auto">
            Free forever for small sites. Slide to see what you'd pay as you grow.
            No per-seat fees, no surprise bills.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {/* ── Events slider ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-body-sm font-medium text-body">Monthly events</span>
              <span className="text-body-sm font-bold text-ink tabular">{formatEvents(tier.events)} / month</span>
            </div>

            <input
              type="range"
              min={0}
              max={PLANS.length - 1}
              step={1}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              className="pricing-slider w-full"
              aria-label="Monthly events volume"
            />

            <div className="flex justify-between mt-2">
              {PLANS.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setIndex(i)}
                  className={`text-caption normal-case font-medium transition-colors ${
                    i === index ? 'text-primary' : 'text-muted hover:text-body'
                  }`}
                >
                  {formatEvents(t.events)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Single dynamic card ── */}
          <div
            className={`rounded-2xl p-7 flex flex-col relative transition-colors card bg-surface shadow-card-hover'
            }`}
          >
            {!isFree && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-ink text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap">
                {tier.name}
              </div>
            )}

            <div className="mb-6">
              <div className={`text-caption font-bold uppercase tracking-widest mb-3 text-muted}`}>
                {tier.name}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-[44px] font-bold leading-none tabular text-ink}`}>
                  {tier.price === 0 ? '$0' : `$${tier.price}`}
                </span>
                <span className={`text-body-sm ml-1 text-muted`}>
                  / month
                </span>
              </div>
              <div className={`flex items-center gap-3 text-body-sm text-muted`}>
                <span>{tier.sites === 1 ? '1 site' : `${tier.sites} sites`}</span>
                <span>·</span>
                <span>{formatEvents(tier.events)} events</span>
                <span>·</span>
                <span>{tier.retentionDays === 15 ? '15 days' : `${tier.retentionDays} days`}</span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6">
              <li className="flex items-start gap-2 text-body-sm">
                  <svg
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 text-success`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className={"text-body"}> {tier.posts} posts & tracked links</span>

                </li>
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-body-sm">
                  <svg
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 text-success`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className={"text-body"}>{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={`text-center py-3 rounded-xl font-medium text-body-sm transition-all btn-primary`}
            >
              {tier.cta}
            </Link>

            {tier.price > 0 && (
              <p className={`text-center text-caption mt-3 normal-case font-normal text-muted`}>
                $0.00 due today · Cancel anytime
              </p>
            )}
          </div>
        </div>

        {/* Event explainer */}
        <div className="mt-10 max-w-xl mx-auto card p-5 text-center">
          <p className="text-body-sm text-muted leading-relaxed">
            <strong className="text-ink">What counts as an event?</strong> Every page your visitors load on your site.
            10,000 events = roughly 300–500 daily visitors. Most small sites stay under this comfortably.
            Resets on the 1st of each month.
          </p>
        </div>
      </div>

      <style jsx>{`
        .pricing-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            var(--color-primary, #6366f1) 0%,
            var(--color-primary, #6366f1) ${(index / (PLANS.length - 1)) * 100}%,
            #e2e8f0 ${(index / (PLANS.length - 1)) * 100}%,
            #e2e8f0 100%
          );
          outline: none;
          cursor: pointer;
        }
        .pricing-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: white;
          border: 3px solid var(--color-primary, #6366f1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .pricing-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: white;
          border: 3px solid var(--color-primary, #6366f1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
      `}</style>
    </section>
  )
}