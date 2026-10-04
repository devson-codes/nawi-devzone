import { useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, CheckSquare2, ChevronDown, ChevronUp, ExternalLink, GripVertical, Link2, Plus, Repeat2, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS, STATUSES, type Project, type Task, type TaskStatus } from '@/lib/model'
import { collectTaskLinks } from '@/lib/taskLinks'

const columnStyle: Record<TaskStatus, { dot: string; top: string }> = {
  backlog: { dot: 'bg-slate-400', top: 'border-t-slate-400' },
  todo: { dot: 'bg-blue-500', top: 'border-t-blue-500' },
  progress: { dot: 'bg-amber-500', top: 'border-t-amber-500' },
  done: { dot: 'bg-emerald-500', top: 'border-t-emerald-500' },
}

interface Props {
  projects: Project[]
  tasks: Task[]
  filter: string
  onFilterChange: (id: string) => void
  onNewTask: (status: TaskStatus) => void
  onOpenTask: (task: Task) => void
  onMoveTask: (activeId: string, overId: string) => void
  onToggleChecklistItem: (taskId: string, itemId: string) => void
  onOpenLink: (url: string) => void
  onCreateProject: () => void
}

function TaskCard({ task, project, onClick, onToggleChecklistItem, onOpenLink }: { task: Task; project?: Project; onClick: () => void; onToggleChecklistItem: (taskId: string, itemId: string) => void; onOpenLink: (url: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const checked = task.checklist.filter(item => item.checked).length
  const links = collectTaskLinks(task.links, task.description)
  return <div
    ref={setNodeRef}
    style={{ transform: CSS.Transform.toString(transform), transition }}
    className={`task-card group ${isDragging ? 'z-20 opacity-60 shadow-xl' : ''}`}
    {...attributes}
    {...listeners}
    onClick={onClick}
    onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget) onClick() }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{project?.name ?? 'Project'}{task.recurringTaskId && <span title="Daily recurring task" aria-label="Daily recurring task"><Repeat2 className="size-3.5 text-blue-600" /></span>}</span>
        <h3 className="text-sm font-semibold leading-snug text-foreground">{task.title}</h3>
      </div>
      <GripVertical className="mt-1 size-4 shrink-0 text-muted-foreground/45 group-hover:text-muted-foreground" />
    </div>
    {task.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description.replace(/[#*`>[\]]/g, '')}</p>}
    {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{task.tags.slice(0, 3).map(tag => <span key={tag} className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{tag}</span>)}{task.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>}</div>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <Badge variant="outline" className={`text-[10px] capitalize ${task.priority === 'high' ? 'border-rose-200 bg-rose-50 text-rose-700' : task.priority === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{task.priority}</Badge>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        {task.checklist.length > 0 && <button type="button" aria-expanded={checklistOpen} className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 hover:text-foreground" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setChecklistOpen(open => !open) }}><CheckSquare2 className="size-3.5" />{checked}/{task.checklist.length}{checklistOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}</button>}
        {links.length > 0 && <button type="button" aria-label={`${links.length} ${links.length === 1 ? 'link' : 'links'}`} aria-expanded={linksOpen} className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-slate-100 hover:text-foreground" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setLinksOpen(open => !open) }}><Link2 className="size-3.5" />{links.length}{linksOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}</button>}
        {task.dueDate && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
      </div>
    </div>
    {(checklistOpen || linksOpen) && <div className="task-card-details" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      {checklistOpen && task.checklist.length > 0 && <section className="task-detail-section">
        <div className="task-detail-heading"><span>Checklist</span><span>{checked}/{task.checklist.length} complete</span></div>
        <div className="space-y-1.5">{task.checklist.map(item => <label key={item.id} className={`task-checklist-item ${item.checked ? 'is-complete' : ''}`}><input type="checkbox" checked={item.checked} onChange={() => onToggleChecklistItem(task.id, item.id)} /><span>{item.title}</span></label>)}</div>
      </section>}
      {linksOpen && links.length > 0 && <section className="task-detail-section">
        <div className="task-detail-heading"><span>Links</span><span>{links.length} {links.length === 1 ? 'link' : 'links'}</span></div>
        <div className="space-y-1">{links.map(link => <a key={link.url} className="task-link" href={link.url} target="_blank" rel="noopener noreferrer" title={link.url} onClick={event => { event.preventDefault(); event.stopPropagation(); onOpenLink(link.url) }}><span className="min-w-0"><span className="block truncate font-medium">{link.label}</span><span className="block truncate text-[10px] text-muted-foreground">{new URL(link.url).hostname}</span></span><ExternalLink className="size-3.5 shrink-0" /></a>)}</div>
      </section>}
    </div>}
  </div>
}

function BoardColumn({ status, tasks, projects, onNewTask, onOpenTask, onToggleChecklistItem, onOpenLink }: { status: TaskStatus; tasks: Task[]; projects: Project[]; onNewTask: (status: TaskStatus) => void; onOpenTask: (task: Task) => void; onToggleChecklistItem: (taskId: string, itemId: string) => void; onOpenLink: (url: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` })
  return <section ref={setNodeRef} className={`board-column border-t-[3px] ${columnStyle[status].top} ${isOver ? 'ring-2 ring-blue-300' : ''}`}>
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5"><span className={`size-2 rounded-full ${columnStyle[status].dot}`} /><h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2><span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{tasks.length}</span></div>
      <Button variant="ghost" size="icon-sm" aria-label={`Add task to ${STATUS_LABELS[status]}`} onClick={() => onNewTask(status)}><Plus /></Button>
    </div>
    <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
      <div className="min-h-24 space-y-3">
        {tasks.map(task => <TaskCard key={task.id} task={task} project={projects.find(project => project.id === task.projectId)} onClick={() => onOpenTask(task)} onToggleChecklistItem={onToggleChecklistItem} onOpenLink={onOpenLink} />)}
        {tasks.length === 0 && <button className="w-full rounded-md border border-dashed border-slate-300 px-3 py-7 text-xs text-muted-foreground hover:border-blue-300 hover:text-blue-700" onClick={() => onNewTask(status)}>+ Add a task</button>}
      </div>
    </SortableContext>
  </section>
}

export function Board({ projects, tasks, filter, onFilterChange, onNewTask, onOpenTask, onMoveTask, onToggleChecklistItem, onOpenLink, onCreateProject }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const activeTasks = tasks.filter(task => projects.some(project => project.id === task.projectId))
  const visibleTasks = filter === 'all' ? activeTasks : activeTasks.filter(task => task.projectId === filter)

  return <div className="page-wrap">
    <div className="page-heading">
      <div><h1 className="page-title">Kanban board</h1><p className="page-subtitle">A clear view of everything in motion.</p></div>
    </div>
    {projects.length === 0 ? <div className="empty-panel"><div className="empty-icon"><SlidersHorizontal /></div><h2>Start with a project</h2><p>Create your first project, then add tasks to track on this board.</p><Button onClick={onCreateProject}><Plus /> Create project</Button></div> : <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-md border bg-white px-4 py-3">
        <div className="flex items-center gap-3"><SlidersHorizontal className="size-4 text-muted-foreground" /><span className="text-sm font-medium">Filter by project</span><select aria-label="Filter by project" className="native-select min-w-44" value={filter} onChange={event => onFilterChange(event.target.value)}><option value="all">All projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
        <div className="flex items-center gap-4"><span className="text-xs text-muted-foreground">{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'} across {filter === 'all' ? projects.length : 1} {filter === 'all' && projects.length !== 1 ? 'projects' : 'project'}</span><Button onClick={() => onNewTask('backlog')} className="h-8 px-3"><Plus /> New task</Button></div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={({ active, over }) => { if (over && active.id !== over.id) onMoveTask(String(active.id), String(over.id)) }}>
        <div className="grid min-w-[960px] grid-cols-4 gap-4 pb-8">
          {STATUSES.map(status => <BoardColumn key={status} status={status} tasks={visibleTasks.filter(task => task.status === status).sort((a, b) => a.position - b.position)} projects={projects} onNewTask={onNewTask} onOpenTask={onOpenTask} onToggleChecklistItem={onToggleChecklistItem} onOpenLink={onOpenLink} />)}
        </div>
      </DndContext>
    </>}
  </div>
}
