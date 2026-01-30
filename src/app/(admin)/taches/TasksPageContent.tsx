'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Calendar,
  Filter,
  Loader2,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react'
import { useToast, DropdownMenu, DropdownItem } from '@/components/ui'

type Task = {
  id: string
  projectId: string
  parentId: string | null
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  dueDate: string | null
  depth: number
  project: {
    id: string
    name: string
  }
  projectCode: string
}

type Project = {
  id: string
  name: string
  code: string
}

type TasksPageContentProps = {
  projects: Project[]
}

const statusConfig = {
  TODO: { label: 'À faire', bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-muted)' },
  IN_PROGRESS: { label: 'En cours', bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(59, 130, 246)' },
  DONE: { label: 'Terminé', bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)' },
}

export function TasksPageContent({ projects }: TasksPageContentProps) {
  const router = useRouter()
  const toast = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [groupByProject, setGroupByProject] = useState(false)
  const [editingDateTaskId, setEditingDateTaskId] = useState<string | null>(null)
  const [dateInputValue, setDateInputValue] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (projectFilter) params.set('projectId', projectFilter)
      params.set('sortBy', 'dueDate')

      const res = await fetch(`/api/tasks?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setTasks(data)
    } catch {
      toast.error('Erreur lors du chargement des tâches')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectFilter, toast])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusChange = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      fetchTasks()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const handleCheckboxClick = (task: Task) => {
    if (task.status === 'DONE') {
      handleStatusChange(task.id, 'TODO')
    } else {
      handleStatusChange(task.id, 'DONE')
    }
  }

  const handleDateChange = async (taskId: string, dueDate: string | null) => {
    try {
      const res = await fetch(`/api/project-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setEditingDateTaskId(null)
      setDateInputValue('')
      fetchTasks()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const startEditingDate = (task: Task) => {
    setEditingDateTaskId(task.id)
    setDateInputValue(task.dueDate?.split('T')[0] || '')
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null

    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return "Aujourd'hui"
    if (date.getTime() === tomorrow.getTime()) return 'Demain'

    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'DONE') return false
    const datePart = task.dueDate.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    const dueDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }

  // Group tasks by project if enabled
  const groupedTasks = groupByProject
    ? tasks.reduce((acc, task) => {
        const key = task.projectId
        if (!acc[key]) {
          acc[key] = {
            project: { id: task.project.id, name: task.project.name, code: task.projectCode },
            tasks: [],
          }
        }
        acc[key].tasks.push(task)
        return acc
      }, {} as Record<string, { project: { id: string; name: string; code: string }; tasks: Task[] }>)
    : null

  const statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'TODO', label: 'À faire' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'DONE', label: 'Terminé' },
  ]

  const renderTask = (task: Task, showProject: boolean = true) => {
    const config = statusConfig[task.status]
    const isEditingDate = editingDateTaskId === task.id

    return (
      <div
        key={task.id}
        className="flex items-center gap-3 p-3 rounded-lg group hover:bg-[var(--color-bg-tertiary)] transition-colors"
        style={{ paddingLeft: task.depth > 0 ? `${task.depth * 1.5 + 0.75}rem` : undefined }}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleCheckboxClick(task)}
          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0"
          style={{
            borderColor: task.status === 'DONE' ? 'rgb(34, 197, 94)' : 'var(--color-border-medium)',
            backgroundColor: task.status === 'DONE' ? 'rgb(34, 197, 94)' : 'transparent',
          }}
          title={task.status === 'DONE' ? 'Marquer non terminé' : 'Marquer terminé'}
        >
          {task.status === 'DONE' && <Check size={12} color="white" strokeWidth={3} />}
        </button>

        {/* Title */}
        <span
          className="flex-1 text-sm"
          style={{
            color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>

        {/* Status badge (only if not done) */}
        {task.status !== 'DONE' && (
          <DropdownMenu
            trigger={
              <button
                className="text-xs px-2 py-1 rounded-full font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: config.bg,
                  color: config.text,
                }}
              >
                {config.label}
              </button>
            }
          >
            <DropdownItem onClick={() => handleStatusChange(task.id, 'TODO')}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusConfig.TODO.text }}
                />
                À faire
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusConfig.IN_PROGRESS.text }}
                />
                En cours
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => handleStatusChange(task.id, 'DONE')}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusConfig.DONE.text }}
                />
                Terminé
              </span>
            </DropdownItem>
          </DropdownMenu>
        )}

        {/* Due date */}
        {isEditingDate ? (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateInputValue}
              onChange={(e) => setDateInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDateChange(task.id, dateInputValue || null)
                if (e.key === 'Escape') {
                  setEditingDateTaskId(null)
                  setDateInputValue('')
                }
              }}
              autoFocus
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              onClick={() => handleDateChange(task.id, dateInputValue || null)}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
              style={{ color: 'var(--color-status-success)' }}
              title="Enregistrer"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setEditingDateTaskId(null)
                setDateInputValue('')
              }}
              className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]"
              style={{ color: 'var(--color-text-muted)' }}
              title="Annuler"
            >
              <X size={14} />
            </button>
          </div>
        ) : task.dueDate ? (
          <button
            onClick={() => startEditingDate(task)}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: isOverdue(task) ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-tertiary)',
              color: isOverdue(task) ? 'var(--color-status-error)' : 'var(--color-text-muted)',
            }}
            title="Modifier la date"
          >
            <Calendar size={12} />
            {formatDate(task.dueDate)}
          </button>
        ) : (
          <button
            onClick={() => startEditingDate(task)}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
            }}
            title="Ajouter une date"
          >
            <Calendar size={12} />
            Date
          </button>
        )}

        {/* Project link */}
        {showProject && (
          <button
            onClick={() => router.push(`/projets/${task.projectId}?tab=taches`)}
            className="text-xs px-2 py-1 rounded flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
            }}
            title={`Voir le projet: ${task.project.name}`}
          >
            {task.projectCode}
            <ExternalLink size={10} />
          </button>
        )}
      </div>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* Filters */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl mb-6"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Filtres:
          </span>
        </div>

        {/* Status filter */}
        <DropdownMenu
          trigger={
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {statusOptions.find(o => o.value === statusFilter)?.label || 'Tous les statuts'}
              <ChevronDown size={14} />
            </button>
          }
        >
          {statusOptions.map(option => (
            <DropdownItem
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </DropdownItem>
          ))}
        </DropdownMenu>

        {/* Project filter */}
        <DropdownMenu
          trigger={
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {projectFilter
                ? projects.find(p => p.id === projectFilter)?.name || 'Projet'
                : 'Tous les projets'}
              <ChevronDown size={14} />
            </button>
          }
        >
          <DropdownItem onClick={() => setProjectFilter('')}>
            Tous les projets
          </DropdownItem>
          {projects.map(project => (
            <DropdownItem
              key={project.id}
              onClick={() => setProjectFilter(project.id)}
            >
              {project.code} — {project.name}
            </DropdownItem>
          ))}
        </DropdownMenu>

        {/* Group by project toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={groupByProject}
            onChange={e => setGroupByProject(e.target.checked)}
            className="rounded"
            style={{
              accentColor: 'var(--color-bg-dark)',
            }}
          />
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Grouper par projet
          </span>
        </label>
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {statusFilter || projectFilter
              ? 'Aucune tâche ne correspond aux filtres'
              : 'Aucune tâche créée'}
          </p>
        </div>
      ) : groupByProject && groupedTasks ? (
        <div className="space-y-6">
          {Object.values(groupedTasks).map(({ project, tasks: projectTasks }) => (
            <div
              key={project.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              {/* Project header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderBottom: '1px solid var(--color-border-light)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-bg-dark)',
                      color: 'var(--color-text-inverse)',
                    }}
                  >
                    {project.code}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {project.name}
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/projets/${project.id}?tab=taches`)}
                  className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--color-bg-secondary)] transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Voir le projet
                  <ExternalLink size={12} />
                </button>
              </div>

              {/* Project tasks */}
              <div className="divide-y divide-[var(--color-border-light)]">
                {projectTasks.map(task => renderTask(task, false))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden divide-y divide-[var(--color-border-light)]"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {tasks.map(task => renderTask(task, true))}
        </div>
      )}

      {/* Stats */}
      {!loading && tasks.length > 0 && (
        <div
          className="flex items-center justify-center gap-6 mt-6 py-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="text-sm">
            {tasks.filter(t => t.status === 'TODO').length} à faire
          </span>
          <span className="text-sm">
            {tasks.filter(t => t.status === 'IN_PROGRESS').length} en cours
          </span>
          <span className="text-sm">
            {tasks.filter(t => t.status === 'DONE').length} terminées
          </span>
        </div>
      )}
    </main>
  )
}
