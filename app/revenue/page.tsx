// app/revenue/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { DUMMY_REVENUE_EVENTS, DUMMY_PAYMENTS, PLATFORM_META, PAYMENT_META } from '@/lib/dummy-data'
import { formatMoneyFull, timeAgo } from '@/lib/utils'

export default function RevenuePage() {
  const total = DUMMY_PAYMENTS.filter(p => p.connected).reduce((s, p) => s + p.totalRevenue, 0)

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Revenue</h1>
          <p className="text-[#94A3B8] text-sm">Every payment attributed to the post that drove it.</p>
        </div>

        {/* Payment provider totals */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {DUMMY_PAYMENTS.filter(p => p.connected).map(p => {
            const meta = PAYMENT_META[p.provider]
            return (
              <div key={p.id} className="card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{meta.icon}</span>
                  <span className="font-medium text-[#0F172A] text-[13px]">{meta.name}</span>
                  <span className="badge-emerald ml-auto">Connected</span>
                </div>
                <div className="text-xl font-bold text-[#0F172A] tabular">{formatMoneyFull(p.totalRevenue)}</div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">this month</div>
              </div>
            )
          })}
          <div className="card shadow-card p-4 border-dashed flex flex-col items-center justify-center text-center">
            <div className="text-[#94A3B8] text-sm mb-1">Total across all</div>
            <div className="text-xl font-bold text-gradient tabular">{formatMoneyFull(total)}</div>
          </div>
        </div>

        {/* Attribution note */}
        <div className="bg-[#EEF2FF] rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-[#6366F1] text-lg">💡</span>
          <div className="text-[13px] text-[#4338CA] leading-relaxed">
            <strong>First-touch attribution.</strong> Revenue is credited to the social post the customer first clicked, even if they returned days later to buy. Each sale also shows which payment provider processed it.
            {/* TODO: add attribution model selector (first-touch / last-touch / linear) */}
          </div>
        </div>

        {/* Revenue events table */}
        <div className="card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E8ECF2] flex items-center justify-between">
            <h2 className="font-semibold text-[#0F172A]">All Sales</h2>
            {/* TODO: wire CSV export */}
            <button className="btn-secondary text-xs py-1.5">↓ Export CSV</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#E8ECF2]">
                {['Customer', 'Source Post', 'Channel', 'Provider', 'Product', 'Amount', 'When'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DUMMY_REVENUE_EVENTS.map(event => {
                const channelMeta = PLATFORM_META[event.channel]
                const paymentMeta = PAYMENT_META[event.provider]
                return (
                  <tr key={event.id} className="border-b border-[#F1F4F9] hover:bg-[#F8F9FC] transition-colors last:border-0">
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F1F4F9] flex items-center justify-center text-[11px] font-bold text-[#475569]">
                          {event.customerEmail.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-[#0F172A]">{event.customerEmail}</div>
                          <div className="text-[11px] text-[#94A3B8]">{event.country}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[12px] text-[#475569] max-w-[160px] truncate">{event.postPreview}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                        style={{ backgroundColor: channelMeta.bgColor, color: channelMeta.color }}>
                        {channelMeta.icon} {channelMeta.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px]">{paymentMeta.icon} {paymentMeta.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#475569]">{event.product}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-bold text-[#10B981] tabular">+{formatMoneyFull(event.amount)}</span>
                    </td>
                    <td className="px-4 pr-5 py-3.5 text-[12px] text-[#94A3B8]">{timeAgo(event.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
