'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { TaskItem } from './TaskItem'
import { Plus, Loader2 } from 'lucide-react'
import { useToast, useConfirm } from '@/components/ui'

export type Task = {
  id: string
  projectId: string
  parentId: string | null
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate: string | null
  sortOrder: number
  depth: number
  children: Task[]
}

type TaskListProps = {
  projectId: string
  tasks?: Task[]
  onTasksChange?: () => void
}

export function TaskList({ projectId, tasks: initialTasks, onTasksChange }: TaskListProps) {
  const toast = useToast()
  const confirm = useConfirm()
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
  const [loading, setLoading] = useState(!initialTasks)
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTasks(data)
    } catch {
      toast.error('Erreur lors du chargement des tâches')
    } finally {
      setLoading(false)
    }
  }, [projectId, toast])

  useEffect(() => {
    if (!initialTasks) {
      fetchTasks()
    }
  }, [initialTasks, fetchTasks])

  const handleAddTask = async (parentId?: string) => {
    if (!newTaskTitle.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          parentId: parentId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setNewTaskTitle('')
      setShowNewTaskInput(false)
      fetchTasks()
      onTasksChange?.()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      fetchTasks()
      onTasksChange?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleDeleteTask = async (taskId: string, childrenCount: number) => {
    const message = childrenCount > 0
      ? `Cette tâche contient ${childrenCount} sous-tâche${childrenCount > 1 ? 's' : ''} qui seront aussi supprimée${childrenCount > 1 ? 's' : ''}. Continuer ?`
      : 'Cette tâche sera supprimée.'

    const confirmed = await confirm({
      title: 'Supprimer la tâche',
      message,
      confirmText: 'Supprimer',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      toast.success('Tâche supprimée')
      fetchTasks()
      onTasksChange?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleAddSubtask = async (parentId: string, title: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          parentId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      fetchTasks()
      onTasksChange?.()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  // Flatten tasks for drag & drop at root level only (for now)
  const flattenTasks = (tasks: Task[]): string[] => {
    return tasks.map(t => t.id)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newTasks = arrayMove(tasks, oldIndex, newIndex)
      setTasks(newTasks)

      // Update sortOrder on server
      try {
        await fetch(`/api/project-tasks/${active.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: newIndex }),
        })
      } catch (error) {
        console.error('Error updating sort order:', error)
        fetchTasks() // Revert on error
      }
    }
  }

  const countAllChildren = (task: Task): number => {
    let count = task.children.length
    for (const child of task.children) {
      count += countAllChildren(child)
    }
    return count
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Add task button */}
      <div className="mb-4">
        {showNewTaskInput ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
                if (e.key === 'Escape') {
                  setShowNewTaskInput(false)
                  setNewTaskTitle('')
                }
              }}
              placeholder="Titre de la tâche..."
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              onClick={() => handleAddTask()}
              disabled={saving || !newTaskTitle.trim()}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-bg-dark)',
                color: 'var(--color-text-inverse)',
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Ajouter'}
            </button>
            <button
              onClick={() => {
                setShowNewTaskInput(false)
                setNewTaskTitle('')
              }}
              className="btn-ghost px-3 py-2 rounded-lg text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewTaskInput(true)}
            className="btn-dashed flex items-center gap-2 px-4 py-2 rounded-lg text-sm w-full justify-center"
            style={{
              border: '1px dashed var(--color-border-medium)',
              color: 'var(--color-text-muted)',
            }}
          >
            <Plus size={16} />
            Nouvelle tâche
          </button>
        )}
      </div>

      {/* Task list */}
      {tasks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={flattenTasks(tasks)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStatusChange={(status) => handleUpdateTask(task.id, { status })}
                  onTitleChange={(title) => handleUpdateTask(task.id, { title })}
                  onDueDateChange={(dueDate) => handleUpdateTask(task.id, { dueDate })}
                  onDelete={() => handleDeleteTask(task.id, countAllChildren(task))}
                  onAddSubtask={handleAddSubtask}
                  onUpdateChild={handleUpdateTask}
                  onDeleteChild={(childId, childrenCount) => handleDeleteTask(childId, childrenCount)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Aucune tâche pour ce projet
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Cliquez sur "Nouvelle tâche" pour commencer
          </p>
        </div>
      )}
    </div>
  )
}
