import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskLinksEditor } from '@/components/TaskLinksEditor'
import { normalizeExternalUrl } from '@/lib/taskLinks'
import { newId, now, type ChecklistItem, type Priority, type Project, type Task, type TaskLink, type TaskStatus } from '@/lib/model'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  projects: Project[]
  initialProjectId?: string
  initialStatus?: TaskStatus
  nextPosition: (status: TaskStatus) => number
  onSave: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TaskDialog({ open, onOpenChange, task, projects, initialProjectId, initialStatus = 'backlog', nextPosition, onSave, onDelete }: Props) {
  const [projectId, setProjectId] = useState(task?.projectId ?? initialProjectId ?? projects[0]?.id ?? '')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? [])
  const [links, setLinks] = useState<TaskLink[]>(task?.links ?? [])
  const [newItem, setNewItem] = useState('')
  const [saving, setSaving] = useState(false)

  function addChecklistItem() {
    const text = newItem.trim()
    if (!text) return
    const taskId = task?.id ?? ''
    setChecklist(items => [...items, { id: newId(), taskId, title: text, checked: false, position: items.length }])
    setNewItem('')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !projectId || links.some(link => !normalizeExternalUrl(link.url))) return
    setSaving(true)
    try {
      const id = task?.id ?? newId()
      const timestamp = now()
      const updated: Task = {
        id, projectId, title: title.trim(), description, status, priority,
        dueDate: dueDate || null,
        tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))],
        links: links.map(link => ({ label: link.label.trim(), url: normalizeExternalUrl(link.url)! })),
        position: task && task.status === status ? task.position : nextPosition(status),
        createdAt: task?.createdAt ?? timestamp,
        updatedAt: timestamp,
        checklist: checklist.map((item, index) => ({ ...item, taskId: id, position: index })),
        recurringTaskId: task?.recurringTaskId ?? null,
        occurrenceDate: task?.occurrenceDate ?? null,
      }
      await onSave(updated)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  async function removeTask() {
    if (!task || !window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return
    await onDelete(task.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'New task'}</DialogTitle>
          <DialogDescription>Keep the work small and clear enough to move across the board.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <label className="field-label">Title
            <Input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="What needs to be done?" maxLength={160} required />
          </label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className="field-label">Project
              <select className="native-select" value={projectId} onChange={event => setProjectId(event.target.value)} required>
                {projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="field-label">Status
              <select className="native-select" value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>
                <option value="backlog">Backlog</option><option value="todo">To Do</option><option value="progress">In Progress</option><option value="done">Done</option>
              </select>
            </label>
            <label className="field-label">Priority
              <select className="native-select" value={priority} onChange={event => setPriority(event.target.value as Priority)}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="field-label">Due date
              <Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
            </label>
            <label className="field-label">Tags <span className="font-normal text-muted-foreground">(comma separated)</span>
              <Input value={tags} onChange={event => setTags(event.target.value)} placeholder="frontend, bug, v1" />
            </label>
          </div>
          <div className="field-label">
            <span>Description</span>
            <Tabs defaultValue="write">
              <TabsList className="mb-2"><TabsTrigger value="write">Write</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
              <TabsContent value="write"><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Add details in Markdown…" rows={6} /></TabsContent>
              <TabsContent value="preview"><div className="markdown min-h-36 rounded-lg border p-4"><ReactMarkdown remarkPlugins={[remarkGfm]}>{description || '*Nothing to preview yet.*'}</ReactMarkdown></div></TabsContent>
            </Tabs>
          </div>
          <TaskLinksEditor links={links} onChange={setLinks} />
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold">Checklist</span><span className="text-xs text-muted-foreground">{checklist.filter(item => item.checked).length}/{checklist.length} done</span></div>
            {checklist.map(item => <div key={item.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <Checkbox checked={item.checked} onCheckedChange={checked => setChecklist(items => items.map(entry => entry.id === item.id ? { ...entry, checked: checked === true } : entry))} />
              <Input aria-label="Checklist item" className="h-7 border-0 px-0 shadow-none focus-visible:ring-0" value={item.title} onChange={event => setChecklist(items => items.map(entry => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} />
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove checklist item" onClick={() => setChecklist(items => items.filter(entry => entry.id !== item.id))}><Trash2 /></Button>
            </div>)}
            <div className="flex gap-2"><Input value={newItem} onChange={event => setNewItem(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addChecklistItem() } }} placeholder="Add a checklist item" /><Button type="button" variant="outline" onClick={addChecklistItem}><Plus /> Add</Button></div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between">
            {task ? <Button type="button" variant="destructive" onClick={removeTask}><Trash2 /> Delete task</Button> : <span />}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving || !title.trim() || !projectId || links.some(link => !normalizeExternalUrl(link.url))}><Check /> {saving ? 'Saving…' : 'Save task'}</Button></div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
