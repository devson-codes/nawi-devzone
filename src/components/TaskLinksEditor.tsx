import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeExternalUrl } from '@/lib/taskLinks'
import type { TaskLink } from '@/lib/model'

interface Props {
  links: TaskLink[]
  onChange: (links: TaskLink[]) => void
}

export function TaskLinksEditor({ links, onChange }: Props) {
  return <div className="space-y-3">
    <div><div className="text-sm font-semibold">Links</div><p className="mt-1 text-xs text-muted-foreground">Add web links here. Links in the description also appear on the card automatically.</p></div>
    {links.map((link, index) => <div key={index} className="rounded-md border bg-slate-50 p-3">
      <div className="flex gap-2"><div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2"><Input aria-label={`Link ${index + 1} label`} placeholder="Label (optional)" value={link.label} onChange={event => onChange(links.map((entry, i) => i === index ? { ...entry, label: event.target.value } : entry))} /><Input aria-label={`Link ${index + 1} URL`} placeholder="https://example.com" inputMode="url" value={link.url} onChange={event => onChange(links.map((entry, i) => i === index ? { ...entry, url: event.target.value } : entry))} /></div><Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove link ${index + 1}`} onClick={() => onChange(links.filter((_, i) => i !== index))}><Trash2 /></Button></div>
      {link.url && !normalizeExternalUrl(link.url) && <p className="mt-2 text-xs text-destructive">Use a valid http:// or https:// web address.</p>}
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...links, { label: '', url: '' }])}><Plus /> Add link</Button>
  </div>
}
