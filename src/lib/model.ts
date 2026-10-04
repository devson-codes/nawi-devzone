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

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  tags: string[]
  position: number
  createdAt: string
  updatedAt: string
  checklist: ChecklistItem[]
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
}

export const emptyData = (): AppData => ({ projects: [], tasks: [], pages: [] })
export const now = () => new Date().toISOString()
export const newId = () => crypto.randomUUID()
