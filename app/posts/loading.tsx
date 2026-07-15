import { AppShell } from "@/components/layout/AppShell";
import PostsSkeleton from "@/components/ui/PostsSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <PostsSkeleton />
    </AppShell>
  );
}