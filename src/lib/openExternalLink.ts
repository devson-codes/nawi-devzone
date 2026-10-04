import { isTauri } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { normalizeExternalUrl } from './taskLinks'

export async function openExternalLink(value: string) {
  const url = normalizeExternalUrl(value)
  if (!url) throw new Error('This is not a valid web link.')
  if (isTauri()) await openUrl(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}
