'use client'
// app/connect/page.tsx
import { AppShell } from '@/components/layout/AppShell'
import { DUMMY_CHANNELS, DUMMY_PAYMENTS, PLATFORM_META, PAYMENT_META } from '@/lib/dummy-data'

// TODO: each button should trigger OAuth or API key flow for that platform

function ConnectButton({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  if (connected) {
    return (
      <button className="badge-emerald border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-medium cursor-default">
        ✓ Connected
      </button>
    )
  }
  return (
    <button onClick={onConnect} className="btn-primary text-xs py-1.5 px-3">
      Connect →
    </button>
  )
}

export default function ConnectPage() {
  function handleConnect(name: string) {
    alert(`TODO: trigger OAuth / API key flow for ${name}`)
  }

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-[#0F172A] mb-0.5">Connections</h1>
          <p className="text-[#94A3B8] text-sm">Connect your social channels and payment providers to start tracking revenue.</p>
        </div>

        {/* Social channels */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Social Channels</h2>
          <div className="space-y-3">
            {DUMMY_CHANNELS.map(ch => {
              const meta = PLATFORM_META[ch.platform]
              return (
                <div key={ch.id} className="card shadow-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0"
                    style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#0F172A]">{meta.name}</div>
                    {ch.connected ? (
                      <div className="text-[12px] text-[#94A3B8]">
                        {ch.handle} · {ch.followers.toLocaleString()} followers · {ch.postsThisMonth} posts this month
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#94A3B8]">Not connected</div>
                    )}
                  </div>
                  <ConnectButton connected={ch.connected} onConnect={() => handleConnect(meta.name)} />
                </div>
              )
            })}
          </div>
        </section>

        {/* Payment providers */}
        <section className="mb-8">
          <h2 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Payment Providers</h2>
          <div className="space-y-3">
            {DUMMY_PAYMENTS.map(p => {
              const meta = PAYMENT_META[p.provider]
              return (
                <div key={p.id} className="card shadow-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F9FC] flex items-center justify-center text-xl flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#0F172A]">{meta.name}</div>
                    {p.connected ? (
                      <div className="text-[12px] text-[#94A3B8]">
                        {p.accountName} · ${p.totalRevenue.toLocaleString()} tracked this month
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#94A3B8]">
                        {p.provider === 'lemon_squeezy' && 'Paste your API key to connect'}
                        {p.provider === 'stripe' && 'Connect via Stripe OAuth'}
                        {p.provider === 'paddle' && 'Paste your Paddle API key'}
                        {p.provider === 'gumroad' && 'Connect via Gumroad OAuth'}
                        {p.provider === 'woocommerce' && 'Generate WooCommerce REST API keys'}
                      </div>
                    )}
                  </div>
                  <ConnectButton connected={p.connected} onConnect={() => handleConnect(meta.name)} />
                </div>
              )
            })}
          </div>
        </section>

        {/* Tracking script */}
        <section>
          <h2 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Tracking Script</h2>
          <div className="card shadow-card p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-[#0F172A]">Add to your site</div>
              <span className="badge-emerald">Required</span>
            </div>
            <p className="text-[13px] text-[#94A3B8] mb-4 leading-relaxed">
              Paste this snippet before <code className="bg-[#F1F4F9] text-[#6366F1] px-1 rounded text-xs">&lt;/head&gt;</code> on every page of your website. It captures UTM params and referrers so every click can be attributed to a specific post.
            </p>
            <div className="bg-[#F8F9FC] rounded-xl p-4 font-mono text-[11px] text-[#475569] leading-relaxed relative overflow-x-auto">
              <pre>{`<!-- SourceTruth Tracking Script -->
<script>
  (function(w,d,s,id){
    w._st=w._st||{};
    var js=d.createElement(s);
    js.src='https://cdn.sourcetruth.io/track.js';
    js.setAttribute('data-site-id', id);
    d.head.appendChild(js);
  })(window,document,'script','st_demo_4f8a2b9c');
</script>`}</pre>
              {/* TODO: wire clipboard copy */}
              <button className="absolute top-3 right-3 bg-white border border-[#E8ECF2] text-[#475569] hover:text-[#0F172A] text-[11px] px-3 py-1.5 rounded-lg transition-colors shadow-card">
                Copy
              </button>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-3">Under 2KB · Loads async · No cookie banner required (first-party only)</p>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
