// app/revenue/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import {
  DUMMY_REVENUE_EVENTS,
  DUMMY_PAYMENTS,
  PLATFORM_META,
  PAYMENT_META,
} from "@/lib/dummy-data";
import { formatMoneyFull, timeAgo } from "@/lib/utils";

export default function RevenuePage() {
  const total = DUMMY_PAYMENTS.filter((p) => p.connected).reduce(
    (s, p) => s + p.totalRevenue,
    0,
  );

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-heading-lg text-ink mb-0.5">Revenue</h1>
          <p className="text-body-sm text-muted">
            Every payment attributed to the post that drove it.
          </p>
        </div>

        {/* Total + payment provider totals — Total leads, matching mockup */}
        <div className="card mb-6 grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-line">
          <div className="p-5">
            <div className="text-body-sm text-body mb-2">Total</div>
            <div className="text-2xl font-bold text-ink tabular mb-1">
              {formatMoneyFull(total)}
            </div>
            <div className="text-caption font-medium text-success normal-case">
              +23.4%
            </div>
          </div>
          {DUMMY_PAYMENTS.filter((p) => p.connected).map((p) => {
            const meta = PAYMENT_META[p.provider];
            return (
              <div key={p.id} className="p-5">
                <div className="flex items-center gap-1.5 text-body-sm text-body mb-2">
                  <span>{meta.icon}</span> {meta.name}
                </div>
                <div className="text-2xl font-bold text-ink tabular mb-1">
                  {formatMoneyFull(p.totalRevenue)}
                </div>
                <div className="text-caption font-medium text-success normal-case">
                  this month
                </div>
              </div>
            );
          })}
        </div>

        {/* Attribution note */}
        <div className="bg-primary-tint rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-primary text-lg">💡</span>
          <div className="text-body-sm text-primary leading-relaxed">
            <strong>First-touch attribution.</strong> Revenue is credited to the
            social post the customer first clicked, even if they returned days
            later to buy. Each sale also shows which payment provider processed
            it.
            {/* TODO: add attribution model selector (first-touch / last-touch / linear) */}
          </div>
        </div>

        {/* Revenue events table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h2 className="text-heading-sm text-ink">All Sales</h2>
            {/* TODO: wire CSV export */}
            <button className="btn-secondary text-xs py-1.5">
              ↓ Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted border-b border-line">
                {[
                  "Customer",
                  "Source Post",
                  "Channel",
                  "Provider",
                  "Product",
                  "Amount",
                  "When",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-caption text-muted font-semibold first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DUMMY_REVENUE_EVENTS.map((event) => {
                const channelMeta = PLATFORM_META[event.channel];
                const paymentMeta = PAYMENT_META[event.provider];
                return (
                  <tr
                    key={event.id}
                    className="border-b border-line hover:bg-surface-muted transition-colors last:border-0"
                  >
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center text-[11px] font-bold text-body">
                          {event.customerEmail.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-body-sm font-medium text-ink">
                            {event.customerEmail}
                          </div>
                          <div className="text-caption text-muted normal-case font-normal">
                            {event.country}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[12px] text-success font-medium max-w-[160px] truncate">
                        {event.postPreview}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                        style={{
                          backgroundColor: channelMeta.bgColor,
                          color: channelMeta.color,
                        }}
                      >
                        {channelMeta.icon} {channelMeta.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-body-sm text-body">
                        {paymentMeta.icon} {paymentMeta.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-body">
                      {event.product}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-body-sm font-bold text-success tabular">
                        +{formatMoneyFull(event.amount)}
                      </span>
                    </td>
                    <td className="px-4 pr-5 py-3.5 text-caption text-muted normal-case font-normal">
                      {timeAgo(event.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
