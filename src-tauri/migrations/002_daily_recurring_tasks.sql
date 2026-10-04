ALTER TABLE tasks ADD COLUMN recurringTaskId TEXT;
ALTER TABLE tasks ADD COLUMN occurrenceDate TEXT;

CREATE TABLE IF NOT EXISTS recurring_tasks (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  tags TEXT NOT NULL DEFAULT '[]',
  checklist TEXT NOT NULL DEFAULT '[]',
  lastGeneratedDate TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_daily_occurrence
  ON tasks(recurringTaskId, occurrenceDate)
  WHERE recurringTaskId IS NOT NULL AND occurrenceDate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_project ON recurring_tasks(projectId);
