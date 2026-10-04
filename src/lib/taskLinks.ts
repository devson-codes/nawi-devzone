import type { TaskLink } from './model'

export function normalizeExternalUrl(value: string): string | null {
  const input = value.trim()
  if (!input) return null
  const candidate = /^www\./i.test(input) ? `https://${input}` : input
  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null
    return url.href
  } catch { return null }
}

function trimTrailingPunctuation(value: string) {
  let url = value.replace(/[.,;:!?}\]]+$/, '')
  while (url.endsWith(')') && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)) url = url.slice(0, -1)
  return url
}

export function collectTaskLinks(savedLinks: TaskLink[], description: string): TaskLink[] {
  const links: TaskLink[] = []
  const seen = new Set<string>()
  const add = (label: string, rawUrl: string) => {
    const url = normalizeExternalUrl(rawUrl)
    if (!url || seen.has(url)) return
    seen.add(url)
    links.push({ label: label.trim() || new URL(url).hostname, url })
  }

  for (const link of savedLinks) add(link.label, link.url)
  for (const match of description.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const url = trimTrailingPunctuation(match[0])
    const before = description.slice(0, match.index)
    const markdownLabel = before.match(/\[([^\]]+)\]\($/)
    add(markdownLabel?.[1] ?? '', url)
  }
  return links
}
