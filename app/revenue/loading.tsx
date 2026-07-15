import { AppShell } from "@/components/layout/AppShell";
import RevenueSkeleton from "@/components/ui/RevenueSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <RevenueSkeleton />
    </AppShell>
  );
}