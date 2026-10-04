CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('backlog','todo','progress','done')),
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  dueDate TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  position REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL REFERENCES tasks(id),
  title TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id),
  parentId TEXT REFERENCES pages(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  position REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(projectId, status, position);
CREATE INDEX IF NOT EXISTS idx_pages_project_parent ON pages(projectId, parentId, position);
