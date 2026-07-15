import { AppShell } from "@/components/layout/AppShell";
import DashboardSkeleton from "@/components/ui/DashboardSekeleton";

export default function Loading() {
  return (
    <AppShell>
      <DashboardSkeleton />
    </AppShell>
  );
}