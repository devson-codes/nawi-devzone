import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Project } from '@/lib/model'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSave: (name: string, description: string) => Promise<void>
}

export function ProjectDialog({ open, onOpenChange, project, onSave }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), description.trim())
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit project' : 'Create a project'}</DialogTitle>
          <DialogDescription>Give this workspace a name and a short description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <label className="field-label">Project name
            <Input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Customer portal" maxLength={100} required />
          </label>
          <label className="field-label">Description
            <Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What are you building?" rows={4} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
