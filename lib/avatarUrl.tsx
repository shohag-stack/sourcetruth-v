export function avatarUrl(sessionId: string): string {
  // deterministic — same sessionId always gives same avatar
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionId}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
}