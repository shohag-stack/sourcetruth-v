'use client'
// app/page.tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-[#E8ECF2] px-8 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-semibold text-[#0F172A]">SourceTruth</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#475569] hover:text-[#0F172A] text-sm transition-colors">Dashboard</Link>
            <Link href="/dashboard" className="btn-primary">Open App →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#EEF2FF] text-[#6366F1] px-3.5 py-1.5 rounded-full text-sm font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse"></span>
          Works with Buffer, Hootsuite, or wherever you post
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#0F172A] mb-6 leading-[1.1]">
          Which post made
          <br /><span className="text-gradient">you money?</span>
        </h1>

        <p className="text-[#475569] text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
          Generate a tracked link for any post. Share it anywhere. SourceTruth shows you exactly how much revenue each post earned — across every payment provider.
        </p>

        <p className="text-[#94A3B8] text-sm mb-10">
          No social API keys. No complex setup. Works alongside your existing tools.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary text-base px-7 py-3">
            See the demo →
          </Link>
          <Link href="/connect" className="btn-secondary text-base px-7 py-3">
            How it works
          </Link>

          <Link href={'/'} className='btn-primary text-base px-7 py-3' onClick={(e)=> console.log(e)}> Click Me </Link>
        </div>
      </section>

      {/* 3 steps */}
      <section className="border-y border-[#E8ECF2] bg-[#F8F9FC] py-20">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-2xl font-bold text-center text-[#0F172A] mb-12">Three steps. That is all.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '⚡',
                title: 'Generate a tracked link',
                desc: 'Paste your destination URL, pick the platform, click Generate. Takes 10 seconds.',
              },
              {
                step: '02',
                icon: '📤',
                title: 'Share it anywhere',
                desc: 'Post the link on LinkedIn, Twitter, Instagram, email — whatever you already use. No new tools.',
              },
              {
                step: '03',
                icon: '💰',
                title: 'See which posts earn',
                desc: 'Every click and every payment gets attributed to that exact post. See the revenue in your dashboard.',
              },
            ].map(item => (
              <div key={item.step} className="card p-6 shadow-card">
                <div className="text-[11px] font-bold text-[#6366F1] tracking-widest mb-3">{item.step}</div>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#475569] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment providers */}
      <section className="max-w-4xl mx-auto px-8 py-20 text-center">
        <h2 className="text-2xl font-bold text-[#0F172A] mb-3">Tracks revenue from everywhere</h2>
        <p className="text-[#94A3B8] mb-10">Connect once. Every payment automatically attributed.</p>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: '🍋', name: 'Lemon Squeezy' },
            { icon: '◈', name: 'Stripe' },
            { icon: '◆', name: 'Gumroad' },
            { icon: '◉', name: 'Paddle' },
            { icon: '◇', name: 'WooCommerce' },
          ].map(p => (
            <span key={p.name} className="px-4 py-2.5 bg-white border border-[#E8ECF2] rounded-xl text-sm text-[#475569] shadow-card flex items-center gap-2">
              <span>{p.icon}</span>{p.name}
            </span>
          ))}
        </div>

        <div className="card shadow-card p-6 max-w-lg mx-auto text-left">
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Live revenue feed</div>
          {[
            { email: 'alex@startup.io', amount: '$79', source: 'LinkedIn', time: '2m ago' },
            { email: 'sara@agency.co', amount: '$149', source: 'LinkedIn', time: '1h ago' },
            { email: 'james@design.com', amount: '$29', source: 'Instagram', time: '3h ago' },
            { email: 'priya@saas.dev', amount: '$79', source: 'Twitter', time: '5h ago' },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 py-2.5 ${i < 3 ? 'border-b border-[#F1F4F9]' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-[#F1F4F9] flex items-center justify-center text-[11px] font-bold text-[#475569]">
                {item.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#0F172A] truncate">{item.email}</div>
                <div className="text-[11px] text-[#94A3B8]">via {item.source} · {item.time}</div>
              </div>
              <span className="text-[13px] font-bold text-[#10B981]">+{item.amount}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8ECF2] py-8 text-center text-[#94A3B8] text-sm">
        SourceTruth — Revenue attribution for creators and founders
      </footer>
    </div>
  )
}
