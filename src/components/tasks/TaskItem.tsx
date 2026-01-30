'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  Check,
  MoreHorizontal,
  Plus,
  Trash2,
  Calendar,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Task } from './TaskList'
import { DropdownMenu, DropdownItem } from '@/components/ui'

type TaskItemProps = {
  task: Task
  onStatusChange: (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void
  onTitleChange: (title: string) => void
  onDueDateChange: (dueDate: string | null) => void
  onDelete: () => void
  onAddSubtask: (parentId: string, title: string) => void
  onUpdateChild: (taskId: string, updates: Partial<Task>) => void
  onDeleteChild: (taskId: string, childrenCount: number) => void
}

const statusConfig = {
  TODO: { label: 'À faire', bg: 'var(--color-bg-tertiary)', text: 'var(--color-text-muted)' },
  IN_PROGRESS: { label: 'En cours', bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(59, 130, 246)' },
  DONE: { label: 'Terminé', bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)' },
}

export function TaskItem({
  task,
  onStatusChange,
  onTitleChange,
  onDueDateChange,
  onDelete,
  onAddSubtask,
  onUpdateChild,
  onDeleteChild,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [showDateInput, setShowDateInput] = useState(false)
  const [dateValue, setDateValue] = useState(task.dueDate?.split('T')[0] || '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleCheckboxClick = () => {
    if (task.status === 'DONE') {
      onStatusChange('TODO')
    } else {
      onStatusChange('DONE')
    }
  }

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      onTitleChange(editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleAddSubtask = () => {
    if (subtaskTitle.trim()) {
      onAddSubtask(task.id, subtaskTitle.trim())
      setSubtaskTitle('')
      setShowSubtaskInput(false)
    }
  }

  const handleSaveDate = () => {
    onDueDateChange(dateValue || null)
    setShowDateInput(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null

    // Extraire juste la partie date (YYYY-MM-DD) pour éviter les problèmes de timezone
    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    const date = new Date(year, month - 1, day) // Crée la date en heure locale

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return "Aujourd'hui"
    if (date.getTime() === tomorrow.getTime()) return 'Demain'

    return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
  }

  const isOverdue = (() => {
    if (!task.dueDate || task.status === 'DONE') return false
    const datePart = task.dueDate.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    const dueDate = new Date(year, month - 1, day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  })()

  const countChildren = (t: Task): number => {
    let count = t.children.length
    for (const child of t.children) {
      count += countChildren(child)
    }
    return count
  }

  const config = statusConfig[task.status]

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="flex items-center gap-3 py-2.5 px-3 rounded-lg group transition-colors"
        style={{
          backgroundColor: isDragging ? 'var(--color-bg-tertiary)' : 'transparent',
          marginLeft: `${task.depth * 1.5}rem`,
        }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <GripVertical size={14} />
        </button>

        {/* Expand/collapse for tasks with children */}
        {task.children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
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
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle()
                if (e.key === 'Escape') {
                  setEditTitle(task.title)
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="w-full px-2 py-1 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-light)',
                color: 'var(--color-text-primary)',
              }}
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              className="block text-sm cursor-text truncate"
              style={{
                color: task.status === 'DONE' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>
          )}
        </div>

        {/* Status badge - clickable dropdown */}
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
            <DropdownItem onClick={() => onStatusChange('TODO')}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusConfig.TODO.text }}
                />
                À faire
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => onStatusChange('IN_PROGRESS')}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusConfig.IN_PROGRESS.text }}
                />
                En cours
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => onStatusChange('DONE')}>
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
        {task.dueDate && (
          <span
            className="text-xs px-2 py-1 rounded flex items-center gap-1"
            style={{
              backgroundColor: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-bg-tertiary)',
              color: isOverdue ? 'var(--color-status-error)' : 'var(--color-text-muted)',
            }}
          >
            <Calendar size={12} />
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Actions menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu
            trigger={
              <button className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors">
                <MoreHorizontal size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            }
          >
            {task.depth < 2 && (
              <DropdownItem
                onClick={() => setShowSubtaskInput(true)}
                icon={<Plus size={14} />}
              >
                Ajouter une sous-tâche
              </DropdownItem>
            )}
            <DropdownItem
              onClick={() => {
                setDateValue(task.dueDate?.split('T')[0] || '')
                setShowDateInput(true)
              }}
              icon={<Calendar size={14} />}
            >
              {task.dueDate ? 'Modifier la date' : 'Ajouter une date'}
            </DropdownItem>
            {task.dueDate && (
              <DropdownItem
                onClick={() => onDueDateChange(null)}
                icon={<Calendar size={14} />}
              >
                Retirer la date
              </DropdownItem>
            )}
            <DropdownItem
              onClick={onDelete}
              icon={<Trash2 size={14} />}
              variant="danger"
            >
              Supprimer
            </DropdownItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtask input */}
      {showSubtaskInput && (
        <div
          className="flex items-center gap-2 py-2 px-3"
          style={{ marginLeft: `${(task.depth + 1) * 1.5 + 3}rem` }}
        >
          <input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask()
              if (e.key === 'Escape') {
                setShowSubtaskInput(false)
                setSubtaskTitle('')
              }
            }}
            placeholder="Titre de la sous-tâche..."
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={handleAddSubtask}
            disabled={!subtaskTitle.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            Ajouter
          </button>
          <button
            onClick={() => {
              setShowSubtaskInput(false)
              setSubtaskTitle('')
            }}
            className="px-2 py-2 rounded-lg text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Date input */}
      {showDateInput && (
        <div
          className="flex items-center gap-2 py-2 px-3"
          style={{ marginLeft: `${task.depth * 1.5 + 3}rem` }}
        >
          <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveDate()
              if (e.key === 'Escape') setShowDateInput(false)
            }}
            autoFocus
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            onClick={handleSaveDate}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-bg-dark)',
              color: 'var(--color-text-inverse)',
            }}
          >
            Enregistrer
          </button>
          <button
            onClick={() => setShowDateInput(false)}
            className="px-2 py-2 rounded-lg text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Children */}
      {expanded && task.children.length > 0 && (
        <div>
          {task.children.map((child) => (
            <TaskItem
              key={child.id}
              task={child}
              onStatusChange={(status) => onUpdateChild(child.id, { status })}
              onTitleChange={(title) => onUpdateChild(child.id, { title })}
              onDueDateChange={(dueDate) => onUpdateChild(child.id, { dueDate })}
              onDelete={() => onDeleteChild(child.id, countChildren(child))}
              onAddSubtask={onAddSubtask}
              onUpdateChild={onUpdateChild}
              onDeleteChild={onDeleteChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}
