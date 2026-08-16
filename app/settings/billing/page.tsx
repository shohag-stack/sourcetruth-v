// app/settings/billing/page.tsx
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUsage } from "@/lib/utils/checkLimit";
import { PLANS } from "@/lib/pricing";
import { CHECKOUT_URLS, buildCheckoutUrl } from "@/lib/checkout";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { plan, usage } = await getUsage(user.id);
  const pct = Math.min(100, Math.round((usage / plan.events) * 100));

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <h1 className="text-heading-lg text-ink mb-1">Billing</h1>
        <p className="text-body-sm text-muted mb-2">
          You're on the <strong className="text-ink">{plan.name}</strong> plan.
        </p>

        <div className="mb-6">
          <div className="flex items-center justify-between text-caption text-muted normal-case font-normal mb-1.5">
            <span>{usage.toLocaleString()} / {plan.events.toLocaleString()} events this month</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = p.id === plan.id;
            const checkoutBase = CHECKOUT_URLS[p.id];
            const href =
              p.price === 0 || !checkoutBase
                ? undefined
                : buildCheckoutUrl(checkoutBase, user.id, user.email ?? null);

            return (
              <div key={p.id} className="card p-5 flex flex-col">
                <div className="text-caption font-bold uppercase tracking-widest text-muted mb-2">
                  {p.name}
                </div>
                <div className="text-2xl font-bold text-ink mb-1">
                  {p.price === 0 ? "$0" : `$${p.price}`}
                  <span className="text-body-sm text-muted font-normal"> /mo</span>
                </div>
                <div className="text-caption text-muted normal-case font-normal mb-4">
                  {p.events.toLocaleString()} events · {p.retentionDays}d history
                </div>

                {isCurrent ? (
                  <span className="badge-success text-center">Current plan</span>
                ) : href ? (
                  <a href={href} className="btn-primary text-center text-sm py-2">
                    {p.price > plan.price ? "Upgrade" : "Switch"}
                  </a>
                ) : (
                  <span className="text-caption text-muted normal-case font-normal">
                    Checkout not configured yet
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}