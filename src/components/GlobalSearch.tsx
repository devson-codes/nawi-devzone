import { useMemo, useState } from 'react'
import { ArrowRight, BookOpenText, FolderKanban, LayoutDashboard, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { searchWorkspace, type SearchResult } from '@/lib/globalSearch'
import type { AppData } from '@/lib/model'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: AppData
  onSelect: (result: SearchResult) => boolean
}

const icons = { project: FolderKanban, task: LayoutDashboard, page: BookOpenText }
const labels = { project: 'Project', task: 'Task', page: 'Document' }

export function GlobalSearch({ open, onOpenChange, data, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const results = useMemo(() => searchWorkspace(data, query), [data, query])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) { setQuery(''); setHighlighted(0) }
    onOpenChange(nextOpen)
  }

  function choose(result: SearchResult) {
    if (onSelect(result)) handleOpenChange(false)
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setHighlighted(index => Math.min(index + 1, results.length - 1)) }
    if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setHighlighted(index => Math.max(0, index - 1)) }
    if (event.key === 'Enter' && results[highlighted]) { event.preventDefault(); choose(results[highlighted]) }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl" aria-describedby="global-search-description">
      <DialogHeader className="sr-only"><DialogTitle>Search workspace</DialogTitle><DialogDescription id="global-search-description">Find projects, tasks, and documentation pages.</DialogDescription></DialogHeader>
      <div className="flex items-center gap-3 border-b px-5 py-4"><Search className="size-4 shrink-0 text-slate-500" /><Input autoFocus aria-label="Search projects, tasks, and docs" className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0" placeholder="Search projects, tasks, and docs…" value={query} onChange={event => { setQuery(event.target.value); setHighlighted(0) }} onKeyDown={onInputKeyDown} /><kbd className="rounded border bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">Esc</kbd></div>
      <div className="max-h-[min(60vh,460px)] min-h-32 overflow-y-auto p-2">
        {!query.trim() ? <p className="px-4 py-10 text-center text-xs text-muted-foreground">Search titles and content across your workspace.</p> : results.length === 0 ? <p className="px-4 py-10 text-center text-xs text-muted-foreground">No results for “{query.trim()}”.</p> : results.map((result, index) => {
          const Icon = icons[result.kind]
          return <button key={`${result.kind}:${result.id}`} className={`global-search-result ${highlighted === index ? 'is-highlighted' : ''}`} onMouseEnter={() => setHighlighted(index)} onClick={() => choose(result)}>
            <span className="grid size-9 shrink-0 place-items-center rounded border border-slate-200 bg-slate-50 text-slate-600"><Icon className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{result.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{result.detail}</span></span>
            <span className="text-[10px] text-slate-500">{result.archived ? 'Archived · ' : ''}{labels[result.kind]}</span><ArrowRight className="size-3.5 shrink-0 text-slate-400" />
          </button>
        })}
      </div>
      <div className="border-t bg-slate-50 px-5 py-2 text-[10px] text-slate-500">Use ↑ ↓ to choose, Enter to open, Esc to close</div>
    </DialogContent>
  </Dialog>
}
