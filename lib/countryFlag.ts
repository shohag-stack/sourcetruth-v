export function countryFlag(code: string): string {
  if (!code || code === 'unknown') return '🌍'
  const flag = code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
  return flag
}