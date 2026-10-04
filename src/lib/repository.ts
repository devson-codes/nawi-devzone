import Database from '@tauri-apps/plugin-sql'
import { isTauri } from '@tauri-apps/api/core'
import { emptyData, makeDailyOccurrence, type AppData, type ChecklistItem, type DocPage, type Project, type RecurringTask, type Task } from './model'

export interface Repository {
  load(): Promise<AppData>
  saveProject(project: Project): Promise<void>
  saveTask(task: Task): Promise<void>
  deleteTask(id: string): Promise<void>
  saveRecurringTask(task: RecurringTask): Promise<void>
  deleteRecurringTask(id: string): Promise<void>
  ensureDailyTasks(date: string): Promise<void>
  savePage(page: DocPage): Promise<void>
  deletePages(ids: string[]): Promise<void>
  reorderTasks(tasks: Task[]): Promise<void>
}

const STORAGE_KEY = 'nawi-devzone-browser-preview-v1'

class BrowserRepository implements Repository {
  private read(): AppData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return emptyData()
      const data = JSON.parse(stored) as AppData
      return {
        ...data,
        recurringTasks: (data.recurringTasks ?? []).map(task => ({ ...task, links: task.links ?? [] })),
        tasks: (data.tasks ?? []).map(task => ({ ...task, links: task.links ?? [], recurringTaskId: task.recurringTaskId ?? null, occurrenceDate: task.occurrenceDate ?? null })),
      }
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
  async saveRecurringTask(task: RecurringTask) {
    this.update(data => { data.recurringTasks = [...data.recurringTasks.filter(item => item.id !== task.id), task] })
  }
  async deleteRecurringTask(id: string) {
    this.update(data => { data.recurringTasks = data.recurringTasks.filter(item => item.id !== id) })
  }
  async ensureDailyTasks(date: string) {
    this.update(data => {
      for (const template of data.recurringTasks) {
        if (template.lastGeneratedDate === date || !data.projects.some(project => project.id === template.projectId && !project.archived)) continue
        if (!data.tasks.some(task => task.recurringTaskId === template.id && task.occurrenceDate === date)) {
          const position = Math.max(-1, ...data.tasks.filter(task => task.status === 'todo').map(task => task.position)) + 1
          data.tasks.push(makeDailyOccurrence(template, date, position))
        }
        template.lastGeneratedDate = date
      }
    })
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
type TaskRow = Omit<Task, 'tags' | 'links' | 'checklist'> & { tags: string; links: string }
type ChecklistRow = Omit<ChecklistItem, 'checked'> & { checked: number }
type RecurringTaskRow = Omit<RecurringTask, 'tags' | 'links' | 'checklist'> & { tags: string; links: string; checklist: string }

class SqliteRepository implements Repository {
  private db: Database
  constructor(db: Database) { this.db = db }

  async load(): Promise<AppData> {
    const [projectRows, taskRows, checklistRows, pages, recurringRows] = await Promise.all([
      this.db.select<ProjectRow[]>('SELECT * FROM projects ORDER BY createdAt DESC'),
      this.db.select<TaskRow[]>('SELECT * FROM tasks ORDER BY position ASC'),
      this.db.select<ChecklistRow[]>('SELECT * FROM checklist_items ORDER BY position ASC'),
      this.db.select<DocPage[]>('SELECT * FROM pages ORDER BY position ASC'),
      this.db.select<RecurringTaskRow[]>('SELECT * FROM recurring_tasks ORDER BY createdAt DESC'),
    ])
    const checklist = checklistRows.map(item => ({ ...item, checked: Boolean(item.checked) }))
    return {
      projects: projectRows.map(item => ({ ...item, archived: Boolean(item.archived) })),
      tasks: taskRows.map(item => ({
        ...item,
        tags: JSON.parse(item.tags || '[]') as string[],
        links: JSON.parse(item.links || '[]') as Task['links'],
        checklist: checklist.filter(entry => entry.taskId === item.id),
      })),
      pages,
      recurringTasks: recurringRows.map(item => ({ ...item, tags: JSON.parse(item.tags || '[]') as string[], links: JSON.parse(item.links || '[]') as RecurringTask['links'], checklist: JSON.parse(item.checklist || '[]') as string[] })),
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
      'INSERT INTO tasks (id,projectId,title,description,status,priority,dueDate,tags,links,position,createdAt,updatedAt,recurringTaskId,occurrenceDate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(id) DO UPDATE SET projectId=$2,title=$3,description=$4,status=$5,priority=$6,dueDate=$7,tags=$8,links=$9,position=$10,updatedAt=$12,recurringTaskId=$13,occurrenceDate=$14',
      [t.id, t.projectId, t.title, t.description, t.status, t.priority, t.dueDate, JSON.stringify(t.tags), JSON.stringify(t.links), t.position, t.createdAt, t.updatedAt, t.recurringTaskId, t.occurrenceDate],
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

  async saveRecurringTask(t: RecurringTask) {
    await this.db.execute(
      'INSERT INTO recurring_tasks (id,projectId,title,description,priority,tags,links,checklist,lastGeneratedDate,createdAt,updatedAt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO UPDATE SET title=$3,description=$4,priority=$5,tags=$6,links=$7,checklist=$8,updatedAt=$11',
      [t.id, t.projectId, t.title, t.description, t.priority, JSON.stringify(t.tags), JSON.stringify(t.links), JSON.stringify(t.checklist), t.lastGeneratedDate, t.createdAt, t.updatedAt],
    )
  }

  async deleteRecurringTask(id: string) {
    await this.db.execute('DELETE FROM recurring_tasks WHERE id=$1', [id])
  }

  async ensureDailyTasks(date: string) {
    const templates = await this.db.select<RecurringTaskRow[]>(
      'SELECT recurring_tasks.* FROM recurring_tasks JOIN projects ON projects.id=recurring_tasks.projectId WHERE projects.archived=0 AND (lastGeneratedDate IS NULL OR lastGeneratedDate<>$1)', [date],
    )
    for (const row of templates) {
      const existing = await this.db.select<{ id: string }[]>('SELECT id FROM tasks WHERE recurringTaskId=$1 AND occurrenceDate=$2 LIMIT 1', [row.id, date])
      if (!existing.length) {
        const template: RecurringTask = { ...row, tags: JSON.parse(row.tags || '[]') as string[], links: JSON.parse(row.links || '[]') as RecurringTask['links'], checklist: JSON.parse(row.checklist || '[]') as string[] }
        const result = await this.db.select<{ position: number }[]>('SELECT MAX(position) AS position FROM tasks WHERE status=$1', ['todo'])
        const position = (result[0]?.position ?? -1) + 1
        await this.saveTask(makeDailyOccurrence(template, date, position))
      }
      await this.db.execute('UPDATE recurring_tasks SET lastGeneratedDate=$1 WHERE id=$2', [date, row.id])
    }
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
