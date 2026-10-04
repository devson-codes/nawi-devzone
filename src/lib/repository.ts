import Database from '@tauri-apps/plugin-sql'
import { isTauri } from '@tauri-apps/api/core'
import { emptyData, type AppData, type ChecklistItem, type DocPage, type Project, type Task } from './model'

export interface Repository {
  load(): Promise<AppData>
  saveProject(project: Project): Promise<void>
  saveTask(task: Task): Promise<void>
  deleteTask(id: string): Promise<void>
  savePage(page: DocPage): Promise<void>
  deletePages(ids: string[]): Promise<void>
  reorderTasks(tasks: Task[]): Promise<void>
}

const STORAGE_KEY = 'nawi-devzone-browser-preview-v1'

class BrowserRepository implements Repository {
  private read(): AppData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) as AppData : emptyData()
    } catch {
      return emptyData()
    }
  }

  private update(change: (data: AppData) => void) {
    const data = this.read()
    change(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async load() { return this.read() }
  async saveProject(project: Project) {
    this.update(data => { data.projects = [...data.projects.filter(item => item.id !== project.id), project] })
  }
  async saveTask(task: Task) {
    this.update(data => { data.tasks = [...data.tasks.filter(item => item.id !== task.id), task] })
  }
  async deleteTask(id: string) {
    this.update(data => { data.tasks = data.tasks.filter(item => item.id !== id) })
  }
  async savePage(page: DocPage) {
    this.update(data => { data.pages = [...data.pages.filter(item => item.id !== page.id), page] })
  }
  async deletePages(ids: string[]) {
    this.update(data => { data.pages = data.pages.filter(item => !ids.includes(item.id)) })
  }
  async reorderTasks(tasks: Task[]) {
    this.update(data => {
      const positions = new Map(tasks.map(task => [task.id, task]))
      data.tasks = data.tasks.map(task => positions.get(task.id) ?? task)
    })
  }
}

type ProjectRow = Omit<Project, 'archived'> & { archived: number }
type TaskRow = Omit<Task, 'tags' | 'checklist'> & { tags: string }
type ChecklistRow = Omit<ChecklistItem, 'checked'> & { checked: number }

class SqliteRepository implements Repository {
  private db: Database
  constructor(db: Database) { this.db = db }

  async load(): Promise<AppData> {
    const [projectRows, taskRows, checklistRows, pages] = await Promise.all([
      this.db.select<ProjectRow[]>('SELECT * FROM projects ORDER BY createdAt DESC'),
      this.db.select<TaskRow[]>('SELECT * FROM tasks ORDER BY position ASC'),
      this.db.select<ChecklistRow[]>('SELECT * FROM checklist_items ORDER BY position ASC'),
      this.db.select<DocPage[]>('SELECT * FROM pages ORDER BY position ASC'),
    ])
    const checklist = checklistRows.map(item => ({ ...item, checked: Boolean(item.checked) }))
    return {
      projects: projectRows.map(item => ({ ...item, archived: Boolean(item.archived) })),
      tasks: taskRows.map(item => ({
        ...item,
        tags: JSON.parse(item.tags || '[]') as string[],
        checklist: checklist.filter(entry => entry.taskId === item.id),
      })),
      pages,
    }
  }

  async saveProject(p: Project) {
    await this.db.execute(
      'INSERT INTO projects (id,name,description,archived,createdAt,updatedAt) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=$2,description=$3,archived=$4,updatedAt=$6',
      [p.id, p.name, p.description, Number(p.archived), p.createdAt, p.updatedAt],
    )
  }

  async saveTask(t: Task) {
    await this.db.execute(
      'INSERT INTO tasks (id,projectId,title,description,status,priority,dueDate,tags,position,createdAt,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO UPDATE SET projectId=$2,title=$3,description=$4,status=$5,priority=$6,dueDate=$7,tags=$8,position=$9,updatedAt=$11',
      [t.id, t.projectId, t.title, t.description, t.status, t.priority, t.dueDate, JSON.stringify(t.tags), t.position, t.createdAt, t.updatedAt],
    )
    const ids = t.checklist.map(item => item.id)
    if (ids.length) {
      const placeholders = ids.map((_, index) => `$${index + 2}`).join(',')
      await this.db.execute(`DELETE FROM checklist_items WHERE taskId=$1 AND id NOT IN (${placeholders})`, [t.id, ...ids])
    } else {
      await this.db.execute('DELETE FROM checklist_items WHERE taskId=$1', [t.id])
    }
    for (const item of t.checklist) {
      await this.db.execute(
        'INSERT INTO checklist_items (id,taskId,title,checked,position) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET title=$3,checked=$4,position=$5',
        [item.id, t.id, item.title, Number(item.checked), item.position],
      )
    }
  }

  async deleteTask(id: string) {
    await this.db.execute('DELETE FROM checklist_items WHERE taskId=$1', [id])
    await this.db.execute('DELETE FROM tasks WHERE id=$1', [id])
  }

  async savePage(p: DocPage) {
    await this.db.execute(
      'INSERT INTO pages (id,projectId,parentId,title,content,position,createdAt,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET parentId=$3,title=$4,content=$5,position=$6,updatedAt=$8',
      [p.id, p.projectId, p.parentId, p.title, p.content, p.position, p.createdAt, p.updatedAt],
    )
  }

  async deletePages(ids: string[]) {
    for (const id of ids) await this.db.execute('DELETE FROM pages WHERE id=$1', [id])
  }

  async reorderTasks(tasks: Task[]) {
    for (const task of tasks) {
      await this.db.execute('UPDATE tasks SET status=$1,position=$2,updatedAt=$3 WHERE id=$4', [task.status, task.position, task.updatedAt, task.id])
    }
  }
}

export async function createRepository(): Promise<Repository> {
  if (!isTauri()) return new BrowserRepository()
  const db = await Database.load('sqlite:nawi-devzone.db')
  return new SqliteRepository(db)
}
