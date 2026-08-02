export function countryFlag(code: string): string {
  if (!code || code === 'unknown') return '🌍'
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

export function countryName(code: string): string {
  if (!code || code === 'unknown') return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

export function countryDisplay(code: string): string {
  return `${countryFlag(code)} ${countryName(code)}`
}