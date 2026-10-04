import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderPlus, Plus, Save, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { newId, now, type DocPage, type Project } from '@/lib/model'

interface Props {
  project: Project
  pages: DocPage[]
  onSave: (page: DocPage) => Promise<void>
  onDelete: (ids: string[]) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  initialPageId?: string | null
}

function descendantIds(pages: DocPage[], id: string): string[] {
  const children = pages.filter(page => page.parentId === id)
  return [id, ...children.flatMap(page => descendantIds(pages, page.id))]
}

export function DocsView({ project, pages, onSave, onDelete, onDirtyChange, initialPageId }: Props) {
  const projectPages = useMemo(() => pages.filter(page => page.projectId === project.id), [pages, project.id])
  const initialPage = projectPages.find(page => page.id === initialPageId) ?? projectPages[0] ?? null
  const [selectedId, setSelectedId] = useState<string | null>(initialPage?.id ?? null)
  const [draft, setDraft] = useState<DocPage | null>(initialPage ? { ...initialPage } : null)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(() => {
    const ancestors: string[] = []
    let parentId = initialPage?.parentId
    while (parentId && !ancestors.includes(parentId)) {
      ancestors.push(parentId)
      parentId = projectPages.find(page => page.id === parentId)?.parentId ?? null
    }
    return ancestors
  })
  const [tab, setTab] = useState('write')
  const selected = projectPages.find(page => page.id === selectedId) ?? null
  const dirty = Boolean(draft && selected && (draft.title !== selected.title || draft.content !== selected.content || draft.parentId !== selected.parentId))
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function canLeave() { return !dirty || window.confirm('Discard unsaved documentation changes?') }

  function selectPage(id: string) {
    if (selectedId === id || !canLeave()) return
    const page = projectPages.find(item => item.id === id)
    if (!page) return
    setSelectedId(id)
    setDraft({ ...page })
    setTab('write')
  }

  async function createPage(parentId: string | null) {
    if (!canLeave()) return
    const timestamp = now()
    const siblings = projectPages.filter(page => page.parentId === parentId)
    const page: DocPage = { id: newId(), projectId: project.id, parentId, title: 'Untitled page', content: '', position: siblings.length, createdAt: timestamp, updatedAt: timestamp }
    await onSave(page)
    setSelectedId(page.id)
    setDraft(page)
    if (parentId) setExpanded(ids => [...new Set([...ids, parentId])])
    setTab('write')
  }

  async function save() {
    if (!draft || !draft.title.trim()) return
    setSaving(true)
    try {
      const saved = { ...draft, title: draft.title.trim(), updatedAt: now() }
      await onSave(saved)
      setDraft(saved)
    }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!selected) return
    const ids = descendantIds(projectPages, selected.id)
    const message = ids.length === 1 ? `Delete “${selected.title}”?` : `Delete “${selected.title}” and its ${ids.length - 1} child pages?`
    if (!window.confirm(`${message} This cannot be undone.`)) return
    await onDelete([...ids].reverse())
    const next = projectPages.find(page => !ids.includes(page.id)) ?? null
    setSelectedId(next?.id ?? null)
    setDraft(next ? { ...next } : null)
  }

  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    return projectPages.filter(page => page.parentId === parentId).sort((a, b) => a.position - b.position).map(page => {
      const hasChildren = projectPages.some(child => child.parentId === page.id)
      const isExpanded = expanded.includes(page.id)
      return <div key={page.id}>
        <div className={`doc-tree-row ${selectedId === page.id ? 'selected' : ''}`} style={{ paddingLeft: 10 + depth * 16 }}>
          <button className="grid size-5 place-items-center text-muted-foreground" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${page.title}`} onClick={() => setExpanded(ids => isExpanded ? ids.filter(id => id !== page.id) : [...ids, page.id])}>{hasChildren ? isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" /> : null}</button>
          <button className="flex min-w-0 flex-1 items-center gap-2 truncate text-left" onClick={() => selectPage(page.id)}><FileText className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{page.title}</span></button>
          <button className="rounded p-1 text-muted-foreground opacity-0 hover:bg-slate-200 group-hover:opacity-100" aria-label={`Add child page to ${page.title}`} title="Add child page" onClick={() => createPage(page.id)}><Plus className="size-3" /></button>
        </div>
        {hasChildren && isExpanded && renderTree(page.id, depth + 1)}
      </div>
    })
  }

  const forbiddenParents = selected ? new Set(descendantIds(projectPages, selected.id)) : new Set<string>()

  return <section className="docs-shell">
    <div className="docs-sidebar">
      <div className="flex items-center justify-between px-4 py-4"><div><span className="eyebrow">PROJECT LIBRARY</span><h2 className="mt-1 text-sm font-semibold">Documentation</h2></div><Button size="icon-sm" variant="ghost" aria-label="Create root page" title="New page" onClick={() => createPage(null)}><Plus /></Button></div>
      <div className="px-2 pb-4">{projectPages.length ? renderTree(null) : <div className="px-3 py-8 text-center"><FolderPlus className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">No pages yet. Start your project notes.</p><Button className="mt-4" size="sm" variant="outline" onClick={() => createPage(null)}><Plus /> New page</Button></div>}</div>
    </div>
    <div className="min-w-0 flex-1 bg-white">
      {!draft ? <div className="flex h-full min-h-96 flex-col items-center justify-center px-8 text-center"><FileText className="mb-4 size-8 text-slate-300" /><h3 className="font-semibold">Your project knowledge lives here</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Capture setup notes, architecture, decisions, and anything you want to remember.</p><Button className="mt-5" onClick={() => createPage(null)}><Plus /> Create first page</Button></div> : <div className="px-6 py-5 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{project.name} / Docs</span><span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${dirty ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{dirty ? 'Unsaved changes' : 'Saved'}</span></div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={remove}><Trash2 /> Delete</Button><Button size="sm" onClick={save} disabled={!dirty || !draft.title.trim() || saving}><Save /> {saving ? 'Saving…' : 'Save page'}</Button></div></div>
        <Input aria-label="Page title" className="mb-5 h-auto border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Page title" />
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Move under</span><select aria-label="Move page under" className="native-select max-w-56" value={draft.parentId ?? ''} onChange={event => setDraft({ ...draft, parentId: event.target.value || null, position: projectPages.filter(page => page.parentId === (event.target.value || null)).length })}><option value="">Top level</option>{projectPages.filter(page => !forbiddenParents.has(page.id)).map(page => <option key={page.id} value={page.id}>{page.title}</option>)}</select></div>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="mb-3"><TabsTrigger value="write">Write</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList><TabsContent value="write"><Textarea aria-label="Markdown content" className="min-h-[430px] resize-y font-mono text-[13px] leading-relaxed" value={draft.content} onChange={event => setDraft({ ...draft, content: event.target.value })} placeholder={'# Start writing\n\nUse Markdown for headings, lists, links, and code.'} /></TabsContent><TabsContent value="preview"><article className="markdown min-h-[430px] rounded-md border bg-white p-6"><ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content || '*Nothing to preview yet.*'}</ReactMarkdown></article></TabsContent></Tabs>
      </div>}
    </div>
  </section>
}
