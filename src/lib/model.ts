export const STATUSES = ['backlog', 'todo', 'progress', 'done'] as const
export type TaskStatus = (typeof STATUSES)[number]
export type Priority = 'low' | 'medium' | 'high'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  progress: 'In Progress',
  done: 'Done',
}

export interface Project {
  id: string
  name: string
  description: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  taskId: string
  title: string
  checked: boolean
  position: number
}

export interface TaskLink {
  label: string
  url: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  tags: string[]
  links: TaskLink[]
  position: number
  createdAt: string
  updatedAt: string
  checklist: ChecklistItem[]
  recurringTaskId: string | null
  occurrenceDate: string | null
}

export interface RecurringTask {
  id: string
  projectId: string
  title: string
  description: string
  priority: Priority
  tags: string[]
  links: TaskLink[]
  checklist: string[]
  lastGeneratedDate: string | null
  createdAt: string
  updatedAt: string
}

export interface DocPage {
  id: string
  projectId: string
  parentId: string | null
  title: string
  content: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface AppData {
  projects: Project[]
  tasks: Task[]
  pages: DocPage[]
  recurringTasks: RecurringTask[]
}

export const emptyData = (): AppData => ({ projects: [], tasks: [], pages: [], recurringTasks: [] })
export const now = () => new Date().toISOString()
export const newId = () => crypto.randomUUID()
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function makeDailyOccurrence(template: RecurringTask, date: string, position: number): Task {
  const id = newId()
  const timestamp = now()
  return {
    id,
    projectId: template.projectId,
    title: template.title,
    description: template.description,
    status: 'todo',
    priority: template.priority,
    dueDate: date,
    tags: [...template.tags],
    links: template.links.map(link => ({ ...link })),
    position,
    createdAt: timestamp,
    updatedAt: timestamp,
    checklist: template.checklist.map((title, index) => ({ id: newId(), taskId: id, title, checked: false, position: index })),
    recurringTaskId: template.id,
    occurrenceDate: date,
  }
}
