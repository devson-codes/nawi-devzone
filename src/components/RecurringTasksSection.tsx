import { Pencil, Plus, Repeat2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecurringTask } from '@/lib/model'

interface Props {
  tasks: RecurringTask[]
  archived: boolean
  onAdd: () => void
  onEdit: (task: RecurringTask) => void
  onDelete: (task: RecurringTask) => void
}

export function RecurringTasksSection({ tasks, archived, onAdd, onEdit, onDelete }: Props) {
  return <section className="mb-8">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-base font-semibold"><Repeat2 className="size-4 text-blue-700" /> Daily recurring tasks</h2><p className="mt-1 text-xs text-muted-foreground">A new To Do card appears each day for this project.</p></div>
      <Button size="sm" variant="outline" disabled={archived} onClick={onAdd}><Plus /> Add daily task</Button>
    </div>
    {tasks.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{tasks.map(task => <div key={task.id} className="rounded-md border bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{task.title}</div><div className="mt-1 text-xs text-muted-foreground">Every day · To Do{task.checklist.length ? ` · ${task.checklist.length} checklist ${task.checklist.length === 1 ? 'item' : 'items'}` : ''}</div></div><Repeat2 className="mt-0.5 size-4 shrink-0 text-blue-600" /></div>
      <div className="mt-3 flex justify-end gap-1 border-t pt-2"><Button size="sm" variant="ghost" onClick={() => onEdit(task)}><Pencil /> Edit</Button><Button size="sm" variant="ghost" onClick={() => onDelete(task)}><Trash2 /> Stop</Button></div>
    </div>)}</div> : <div className="rounded-md border border-dashed bg-white px-4 py-5 text-xs text-muted-foreground">No daily tasks yet. Add one for work that repeats every day.</div>}
  </section>
}
