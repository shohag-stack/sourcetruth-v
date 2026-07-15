// app/connect/loading.tsx

import { AppShell } from "@/components/layout/AppShell";
import ConnectSkeleton from "@/components/ui/ConnectSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <ConnectSkeleton />
    </AppShell>
  );
}
