import { STATUS_LABELS, type AppData } from './model'

export type SearchResult = {
  id: string
  kind: 'project' | 'task' | 'page'
  projectId: string
  title: string
  detail: string
  archived: boolean
  score: number
}

function scoreMatch(query: string, title: string, body: string): number {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 0
  const heading = title.toLocaleLowerCase()
  const text = body.toLocaleLowerCase()
  if (!words.every(word => heading.includes(word) || text.includes(word))) return 0
  return (heading.startsWith(query) ? 100 : 0) + words.filter(word => heading.includes(word)).length * 20 + (heading.includes(query) ? 10 : 0) + 1
}

export function searchWorkspace(data: AppData, query: string): SearchResult[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const projects = new Map(data.projects.map(project => [project.id, project]))
  const results: SearchResult[] = []

  for (const project of data.projects) {
    const score = scoreMatch(needle, project.name, project.description)
    if (score) results.push({ id: project.id, kind: 'project', projectId: project.id, title: project.name, detail: project.description || 'Project', archived: project.archived, score })
  }
  for (const task of data.tasks) {
    const project = projects.get(task.projectId)
    if (!project) continue
    const body = [task.description, ...task.tags, ...task.checklist.map(item => item.title), ...task.links.flatMap(link => [link.label, link.url])].join(' ')
    const score = scoreMatch(needle, task.title, body)
    if (score) results.push({ id: task.id, kind: 'task', projectId: project.id, title: task.title, detail: `${project.name} · ${STATUS_LABELS[task.status]}`, archived: project.archived, score })
  }
  for (const page of data.pages) {
    const project = projects.get(page.projectId)
    if (!project) continue
    const score = scoreMatch(needle, page.title, page.content)
    if (score) results.push({ id: page.id, kind: 'page', projectId: project.id, title: page.title, detail: `${project.name} · Documentation`, archived: project.archived, score })
  }
  return results.sort((a, b) => Number(a.archived) - Number(b.archived) || b.score - a.score || a.title.localeCompare(b.title)).slice(0, 50)
}
