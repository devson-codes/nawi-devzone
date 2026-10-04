import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { Archive, ArrowLeft, ArrowRight, BookOpenText, Boxes, CheckCircle2, CircleHelp, Clock3, FolderKanban, LayoutDashboard, Plus, RotateCcw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Board } from '@/components/Board'
import { ProjectDialog } from '@/components/ProjectDialog'
import { createRepository, type Repository } from '@/lib/repository'
import { emptyData, newId, now, STATUS_LABELS, STATUSES, type AppData, type DocPage, type Project, type Task, type TaskStatus } from '@/lib/model'

type View = 'board' | 'projects' | 'project'

const DocsView = lazy(() => import('@/components/DocsView').then(module => ({ default: module.DocsView })))
const TaskDialog = lazy(() => import('@/components/TaskDialog').then(module => ({ default: module.TaskDialog })))

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function App() {
  const [repo, setRepo] = useState<Repository | null>(null)
  const [data, setData] = useState<AppData>(emptyData())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('board')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [initialTaskStatus, setInitialTaskStatus] = useState<TaskStatus>('backlog')
  const [docsDirty, setDocsDirty] = useState(false)

  useEffect(() => {
    let active = true
    createRepository().then(async instance => {
      const loaded = await instance.load()
      if (active) { setRepo(instance); setData(loaded); setLoading(false) }
    }).catch(reason => { if (active) { setError(String(reason)); setLoading(false) } })
    return () => { active = false }
  }, [])

  const activeProjects = useMemo(() => data.projects.filter(project => !project.archived), [data.projects])
  const archivedProjects = useMemo(() => data.projects.filter(project => project.archived), [data.projects])
  const selectedProject = data.projects.find(project => project.id === selectedProjectId) ?? null
  const activeTasks = data.tasks.filter(task => activeProjects.some(project => project.id === task.projectId))

  const reload = useCallback(async () => { if (repo) setData(await repo.load()) }, [repo])
  const mutate = useCallback(async (action: (repository: Repository) => Promise<void>) => {
    if (!repo) return
    setError('')
    try { await action(repo); await reload() }
    catch (reason) { setError(`Could not save changes: ${String(reason)}`); throw reason }
  }, [repo, reload])

  function canNavigate() { return !docsDirty || window.confirm('Discard unsaved documentation changes?') }
  function go(viewName: View, projectId?: string) {
    if (viewName === view && (viewName !== 'project' || projectId === selectedProjectId)) return
    if (!canNavigate()) return
    setView(viewName)
    if (projectId) setSelectedProjectId(projectId)
  }

  function openProjectDialog(project?: Project) {
    setProjectToEdit(project ?? null)
    setProjectDialogOpen(true)
  }

  async function saveProject(name: string, description: string) {
    const timestamp = now()
    const project: Project = projectToEdit
      ? { ...projectToEdit, name, description, updatedAt: timestamp }
      : { id: newId(), name, description, archived: false, createdAt: timestamp, updatedAt: timestamp }
    await mutate(repository => repository.saveProject(project))
    if (!projectToEdit) { setSelectedProjectId(project.id); setView('project') }
  }

  async function toggleArchive(project: Project) {
    if (view === 'project' && project.id === selectedProjectId && !canNavigate()) return
    await mutate(repository => repository.saveProject({ ...project, archived: !project.archived, updatedAt: now() }))
    if (!project.archived) {
      if (filter === project.id) setFilter('all')
      setView('projects')
    }
  }

  function openTask(task?: Task, status: TaskStatus = 'backlog', projectId?: string) {
    setTaskToEdit(task ?? null)
    setInitialTaskStatus(status)
    if (projectId) setFilter(projectId)
    setTaskDialogOpen(true)
  }

  function nextPosition(status: TaskStatus) {
    const positions = data.tasks.filter(task => task.status === status).map(task => task.position)
    return positions.length ? Math.max(...positions) + 1 : 0
  }

  async function moveTask(activeId: string, overId: string) {
    const task = data.tasks.find(item => item.id === activeId)
    if (!task) return
    const overTask = data.tasks.find(item => item.id === overId)
    const targetStatus = overId.startsWith('column:') ? overId.slice(7) as TaskStatus : overTask?.status
    if (!targetStatus || !STATUSES.includes(targetStatus)) return
    const timestamp = now()
    let changed: Task[]
    if (task.status === targetStatus) {
      const lane = activeTasks.filter(item => item.status === targetStatus).sort((a, b) => a.position - b.position)
      const from = lane.findIndex(item => item.id === activeId)
      const to = overTask ? lane.findIndex(item => item.id === overTask.id) : lane.length - 1
      if (from < 0 || to < 0 || from === to) return
      changed = arrayMove(lane, from, to).map((item, position) => ({ ...item, position, updatedAt: timestamp }))
    } else {
      const source = activeTasks.filter(item => item.status === task.status && item.id !== activeId).sort((a, b) => a.position - b.position)
      const destination = activeTasks.filter(item => item.status === targetStatus).sort((a, b) => a.position - b.position)
      const to = overTask ? destination.findIndex(item => item.id === overTask.id) : destination.length
      destination.splice(to < 0 ? destination.length : to, 0, { ...task, status: targetStatus })
      changed = [
        ...source.map((item, position) => ({ ...item, position, updatedAt: timestamp })),
        ...destination.map((item, position) => ({ ...item, status: targetStatus, position, updatedAt: timestamp })),
      ]
    }
    await mutate(repository => repository.reorderTasks(changed))
  }

  async function toggleChecklistItem(taskId: string, itemId: string) {
    const task = data.tasks.find(item => item.id === taskId)
    if (!task) return
    const updated = {
      ...task,
      updatedAt: now(),
      checklist: task.checklist.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item),
    }
    await mutate(repository => repository.saveTask(updated))
  }

  async function savePage(page: DocPage) { await mutate(repository => repository.savePage(page)) }
  async function deletePages(ids: string[]) { await mutate(repository => repository.deletePages(ids)) }

  if (loading) return <div className="loading-screen"><div className="brand-mark">N</div><p>Opening Nawi Devzone…</p></div>
  if (!repo) return <div className="loading-screen"><div className="brand-mark">N</div><h1>Could not open your workspace</h1><p className="max-w-lg text-center text-sm text-muted-foreground">{error}</p><Button onClick={() => window.location.reload()}>Try again</Button></div>

  return <div className="app-shell">
    <aside className="app-sidebar">
      <div className="px-6 pb-7 pt-7"><div className="text-sm font-bold tracking-wide text-slate-900">Nawi Devzone</div></div>
      <div className="px-3"><div className="sidebar-label">WORKSPACE</div><button className={`sidebar-link ${view === 'board' ? 'active' : ''}`} onClick={() => go('board')}><LayoutDashboard className="size-4" /> Kanban board <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] text-slate-600">{activeTasks.length}</span></button><button className={`sidebar-link ${view === 'projects' ? 'active' : ''}`} onClick={() => go('projects')}><FolderKanban className="size-4" /> Projects</button></div>
      <div className="mt-8 px-3"><div className="flex items-center justify-between pr-2"><div className="sidebar-label">YOUR PROJECTS</div><button className="text-slate-500 hover:text-blue-700" aria-label="Create project" title="New project" onClick={() => openProjectDialog()}><Plus className="size-4" /></button></div><div className="mt-2 space-y-1">{activeProjects.slice(0, 8).map(project => <button key={project.id} className={`sidebar-link ${view === 'project' && selectedProjectId === project.id ? 'active' : ''}`} onClick={() => go('project', project.id)}><span className="grid size-5 shrink-0 place-items-center rounded border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700">{project.name.charAt(0).toUpperCase()}</span><span className="truncate">{project.name}</span></button>)}{activeProjects.length === 0 && <div className="px-3 py-4 text-xs text-slate-500">No projects yet</div>}</div></div>
      <div className="mt-auto px-4 pb-5"><div className="rounded-md border border-slate-200 bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Boxes className="size-4 text-blue-600" /> Local workspace</div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Your projects and docs stay on this computer.</p></div><div className="mt-5 flex items-center gap-2 px-2 text-[11px] text-slate-500"><CircleHelp className="size-3.5" /> Nawi Devzone v0.1</div></div>
    </aside>
    <main className="app-main">
      <div className="topbar"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Workspace</span><span>/</span><span className="font-medium text-foreground">{view === 'board' ? 'Board' : view === 'projects' ? 'Projects' : selectedProject?.name ?? 'Project'}</span></div></div>
      {error && <div role="alert" className="mx-8 mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}<button className="ml-3 underline" onClick={() => setError('')}>Dismiss</button></div>}
      <div className="main-scroll">
        {view === 'board' && <Board projects={activeProjects} tasks={data.tasks} filter={filter} onFilterChange={setFilter} onNewTask={status => openTask(undefined, status, filter === 'all' ? undefined : filter)} onOpenTask={task => openTask(task)} onMoveTask={moveTask} onToggleChecklistItem={toggleChecklistItem} onCreateProject={() => openProjectDialog()} />}
        {view === 'projects' && <div className="page-wrap"><div className="page-heading"><div><h1 className="page-title">Projects</h1><p className="page-subtitle">Everything you’re building, in one place.</p></div><Button className="h-9 px-4" onClick={() => openProjectDialog()}><Plus /> New project</Button></div>{activeProjects.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeProjects.map(project => { const tasks = data.tasks.filter(task => task.projectId === project.id); const done = tasks.filter(task => task.status === 'done').length; return <button key={project.id} className="project-card text-left" onClick={() => go('project', project.id)}><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-md border border-blue-200 bg-blue-50 text-lg font-bold text-blue-700">{project.name.charAt(0).toUpperCase()}</div><ArrowRight className="size-4 text-slate-400" /></div><h2 className="mt-5 text-lg font-semibold">{project.name}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{project.description || 'No description yet.'}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${tasks.length ? done / tasks.length * 100 : 0}%` }} /></div><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{tasks.length} tasks · {data.pages.filter(page => page.projectId === project.id).length} docs</span><span>{done} done</span></div></button> })}</div> : <div className="empty-panel"><div className="empty-icon"><FolderKanban /></div><h2>Make space for your next idea</h2><p>Create a project to organize its tasks and documentation.</p><Button onClick={() => openProjectDialog()}><Plus /> Create project</Button></div>}{archivedProjects.length > 0 && <div className="mt-10"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Archive className="size-4" /> Archived projects</div><div className="space-y-2">{archivedProjects.map(project => <div key={project.id} className="flex items-center justify-between rounded-md border bg-white px-4 py-3"><div><div className="text-sm font-semibold">{project.name}</div><div className="text-xs text-muted-foreground">Archived · {data.tasks.filter(task => task.projectId === project.id).length} tasks retained</div></div><Button variant="outline" size="sm" onClick={() => toggleArchive(project)}><RotateCcw /> Restore</Button></div>)}</div></div>}</div>}
        {view === 'project' && selectedProject && <div className="page-wrap"><button className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => go('projects')}><ArrowLeft className="size-3.5" /> All projects</button><div className="page-heading"><div className="flex items-start gap-4"><div className="grid size-14 place-items-center rounded-md border border-blue-200 bg-blue-50 text-2xl font-bold text-blue-700">{selectedProject.name.charAt(0).toUpperCase()}</div><div><h1 className="page-title">{selectedProject.name}</h1><p className="page-subtitle max-w-2xl">{selectedProject.description || 'Add a description to explain what you’re building.'}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => openProjectDialog(selectedProject)}><Settings2 /> Edit</Button><Button variant="outline" onClick={() => toggleArchive(selectedProject)}>{selectedProject.archived ? <RotateCcw /> : <Archive />}{selectedProject.archived ? ' Restore' : ' Archive'}</Button></div></div><div className="mb-7 grid gap-4 sm:grid-cols-3"><Card><CardContent className="flex items-center gap-3 p-5"><div className="metric-icon bg-blue-50 text-blue-600"><LayoutDashboard /></div><div><div className="text-xl font-bold">{data.tasks.filter(task => task.projectId === selectedProject.id).length}</div><div className="text-xs text-muted-foreground">Total tasks</div></div></CardContent></Card><Card><CardContent className="flex items-center gap-3 p-5"><div className="metric-icon bg-emerald-50 text-emerald-600"><CheckCircle2 /></div><div><div className="text-xl font-bold">{data.tasks.filter(task => task.projectId === selectedProject.id && task.status === 'done').length}</div><div className="text-xs text-muted-foreground">Completed</div></div></CardContent></Card><Card><CardContent className="flex items-center gap-3 p-5"><div className="metric-icon bg-amber-50 text-amber-600"><BookOpenText /></div><div><div className="text-xl font-bold">{data.pages.filter(page => page.projectId === selectedProject.id).length}</div><div className="text-xs text-muted-foreground">Documentation pages</div></div></CardContent></Card></div><div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-semibold">Project tasks</h2><p className="text-xs text-muted-foreground">The latest work for this project</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { if (canNavigate()) { setFilter(selectedProject.id); setView('board') } }}>View board <ArrowRight /></Button><Button size="sm" onClick={() => openTask(undefined, 'backlog', selectedProject.id)} disabled={selectedProject.archived}><Plus /> Add task</Button></div></div><div className="mb-8 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.tasks.filter(task => task.projectId === selectedProject.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map(task => <button key={task.id} className="flex items-center justify-between rounded-md border bg-white px-4 py-3 text-left hover:border-blue-200" onClick={() => openTask(task)}><div className="min-w-0"><div className="truncate text-sm font-medium">{task.title}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[task.status]}</Badge><span>{formatDate(task.updatedAt)}</span></div></div><ArrowRight className="size-4 text-muted-foreground" /></button>)}{!data.tasks.some(task => task.projectId === selectedProject.id) && <div className="flex items-center gap-2 rounded-md border border-dashed px-4 py-6 text-xs text-muted-foreground"><Clock3 className="size-4" /> No tasks yet. Add your first one.</div>}</div><div className="mb-4 flex items-center gap-2"><BookOpenText className="size-4 text-blue-700" /><h2 className="text-base font-semibold">Documentation</h2></div><Suspense fallback={<div className="rounded-md border bg-white p-6 text-sm text-muted-foreground">Loading documentation…</div>}><DocsView key={selectedProject.id} project={selectedProject} pages={data.pages} onSave={savePage} onDelete={deletePages} onDirtyChange={setDocsDirty} /></Suspense></div>}
      </div>
    </main>
    {projectDialogOpen && <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} project={projectToEdit} onSave={saveProject} />}
    {taskDialogOpen && <Suspense fallback={null}><TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={taskToEdit} projects={activeProjects} initialProjectId={taskToEdit?.projectId ?? (view === 'project' ? selectedProject?.id : filter !== 'all' ? filter : undefined)} initialStatus={initialTaskStatus} nextPosition={nextPosition} onSave={task => mutate(repository => repository.saveTask(task))} onDelete={id => mutate(repository => repository.deleteTask(id))} /></Suspense>}
  </div>
}

export default App
