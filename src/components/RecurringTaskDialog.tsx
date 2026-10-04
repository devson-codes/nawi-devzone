import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TaskLinksEditor } from '@/components/TaskLinksEditor'
import { normalizeExternalUrl } from '@/lib/taskLinks'
import type { Priority, Project, RecurringTask, TaskLink } from '@/lib/model'

type RecurringValues = Pick<RecurringTask, 'title' | 'description' | 'priority' | 'tags' | 'links' | 'checklist'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
  task: RecurringTask | null
  onSave: (values: RecurringValues) => Promise<void>
}

export function RecurringTaskDialog({ open, onOpenChange, project, task, onSave }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [links, setLinks] = useState<TaskLink[]>(task?.links ?? [])
  const [checklist, setChecklist] = useState(task?.checklist ?? [])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)

  function addItem() {
    const value = newItem.trim()
    if (!value) return
    setChecklist(items => [...items, value])
    setNewItem('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || links.some(link => !normalizeExternalUrl(link.url))) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description,
        priority,
        tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))],
        links: links.map(link => ({ label: link.label.trim(), url: normalizeExternalUrl(link.url)! })),
        checklist: checklist.map(item => item.trim()).filter(Boolean),
      })
      onOpenChange(false)
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{task ? 'Edit daily task' : 'New daily task'}</DialogTitle>
        <DialogDescription>A fresh To Do card is created for {project.name} each local day. Checklist items start unchecked.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <label className="field-label">Title<Input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="What repeats every day?" maxLength={160} required /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="field-label">Project<Input value={project.name} disabled /></label>
          <label className="field-label">Priority<select className="native-select" value={priority} onChange={event => setPriority(event.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        </div>
        <label className="field-label">Tags <span className="font-normal text-muted-foreground">(comma separated)</span><Input value={tags} onChange={event => setTags(event.target.value)} placeholder="routine, review" /></label>
        <label className="field-label">Description <span className="font-normal text-muted-foreground">(Markdown)</span><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Details for each daily card…" rows={4} /></label>
        <TaskLinksEditor links={links} onChange={setLinks} />
        <div className="space-y-2">
          <div className="text-xs font-semibold">Checklist for each day</div>
          {checklist.map((item, index) => <div key={index} className="flex items-center gap-2"><Input aria-label={`Checklist item ${index + 1}`} value={item} onChange={event => setChecklist(items => items.map((entry, i) => i === index ? event.target.value : entry))} /><Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove checklist item ${index + 1}`} onClick={() => setChecklist(items => items.filter((_, i) => i !== index))}><Trash2 /></Button></div>)}
          <div className="flex gap-2"><Input value={newItem} onChange={event => setNewItem(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addItem() } }} placeholder="Add a checklist item" /><Button type="button" variant="outline" onClick={addItem}><Plus /> Add</Button></div>
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !title.trim() || links.some(link => !normalizeExternalUrl(link.url))}>{saving ? 'Saving…' : task ? 'Save daily task' : 'Create daily task'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
