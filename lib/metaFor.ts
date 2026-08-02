import { DIRECT_META, PLATFORM_META } from './dummy-data'

function hostnameFromSource(source: string) {
  try {
    const url = source.startsWith('http')
      ? new URL(source)
      : new URL(`https://${source}`)

    return url.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function metaFor(source?: string | null) {
  
  const raw = source?.trim()

  if (!raw || raw === 'direct') {
    return {
      ...DIRECT_META,
      iconType: 'direct' as const,
    }
  }

  const normalized = raw.toLowerCase()
  const hostname = hostnameFromSource(normalized)

  if (hostname) {
    return {
      name: hostname,
      iconType: 'favicon' as const,
      iconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      initials: hostname.slice(0, 1).toUpperCase(),
    }
  }

  return {
    name: raw,
    iconType: 'fallback' as const,
    initials: raw.slice(0, 1).toUpperCase(),
  }
}
