'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Plus,
  Wallet,
  Building2,
  Calendar,
  Tag,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Settings,
  Receipt,
  ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'
import { Button, Spinner, FadeIn, StaggerContainer, StaggerItem, useToast, useConfirm, DropdownMenu, DropdownItem } from '@/components/ui'

type ExpenseCategory = {
  id: string
  name: string
  color: string | null
  icon: string | null
  sortOrder: number
  isDefault: boolean
  _count?: { expenses: number }
}

type Expense = {
  id: string
  description: string
  amount: string
  date: string
  vendor: string | null
  receiptUrl: string | null
  isBillable: boolean
  isBilled: boolean
  notes: string | null
  category: ExpenseCategory
  project: {
    id: string
    name: string
    projectNumber: number
    client: { code: string; companyName: string }
  } | null
}

type Project = {
  id: string
  name: string
  projectNumber: number
  client: { code: string; companyName: string }
}

const defaultColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export function ExpensesList() {
  const searchParams = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || ''
  const toast = useToast()
  const confirm = useConfirm()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState(initialProjectId)
  const [monthFilter, setMonthFilter] = useState('')

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    categoryId: '',
    projectId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    receiptUrl: '',
    isBillable: false,
    notes: '',
  })

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: defaultColors[0],
  })
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [search, categoryFilter, projectFilter, monthFilter])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (projectFilter) params.set('projectId', projectFilter)
      if (monthFilter) params.set('month', monthFilter)

      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      // Filter by search locally
      let filtered = data
      if (search) {
        const s = search.toLowerCase()
        filtered = data.filter((e: Expense) =>
          e.description.toLowerCase().includes(s) ||
          e.vendor?.toLowerCase().includes(s) ||
          e.category.name.toLowerCase().includes(s) ||
          e.project?.name.toLowerCase().includes(s)
        )
      }

      setExpenses(filtered)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCategories(data)

      // If no categories, create defaults
      if (data.length === 0) {
        await createDefaultCategories()
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const createDefaultCategories = async () => {
    const defaults = [
      { name: 'Logiciels & Abonnements', color: '#3B82F6' },
      { name: 'Materiel', color: '#10B981' },
      { name: 'Sous-traitance', color: '#8B5CF6' },
      { name: 'Deplacement', color: '#F59E0B' },
      { name: 'Fournitures', color: '#EC4899' },
      { name: 'Autres', color: '#6B7280', isDefault: true },
    ]

    for (const cat of defaults) {
      await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat),
      })
    }
    fetchCategories()
  }

  const fetchProjects = async () => {
    try {
      // Fetch all projects, not just active ones
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(parseFloat(amount))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const openExpenseModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        categoryId: expense.category.id,
        projectId: expense.project?.id || '',
        description: expense.description,
        amount: expense.amount,
        date: expense.date.split('T')[0],
        vendor: expense.vendor || '',
        receiptUrl: expense.receiptUrl || '',
        isBillable: expense.isBillable,
        notes: expense.notes || '',
      })
    } else {
      setEditingExpense(null)
      setFormData({
        categoryId: categories.find(c => c.isDefault)?.id || categories[0]?.id || '',
        projectId: projectFilter, // Default to current filter
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        receiptUrl: '',
        isBillable: false,
        notes: '',
      })
    }
    setShowExpenseModal(true)
  }

  const saveExpense = async () => {
    if (!formData.categoryId || !formData.description || !formData.amount) {
      toast.error('Veuillez remplir les champs requis')
      return
    }

    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur')
      }

      setShowExpenseModal(false)
      toast.success(editingExpense ? 'Dépense modifiée' : 'Dépense ajoutée')
      fetchExpenses()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    }
  }

  const deleteExpense = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la dépense',
      message: 'Cette dépense sera définitivement supprimée.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Dépense supprimée')
      fetchExpenses()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const saveCategory = async () => {
    if (!categoryForm.name) return

    try {
      const url = editingCategory
        ? `/api/expense-categories/${editingCategory.id}`
        : '/api/expense-categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur')
      }

      setCategoryForm({ name: '', color: defaultColors[0] })
      setEditingCategory(null)
      toast.success(editingCategory ? 'Catégorie modifiée' : 'Catégorie ajoutée')
      fetchCategories()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    }
  }

  const deleteCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id)
    if (cat?._count?.expenses && cat._count.expenses > 0) {
      toast.error(`Impossible de supprimer: ${cat._count.expenses} dépense(s) associée(s)`)
      return
    }

    const confirmed = await confirm({
      title: 'Supprimer la catégorie',
      message: 'Cette catégorie sera définitivement supprimée.',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/expense-categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erreur')
      }
      toast.success('Catégorie supprimée')
      fetchCategories()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const billableAmount = expenses.filter(e => e.isBillable).reduce((sum, e) => sum + parseFloat(e.amount), 0)

  // Get current month for default filter
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="p-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Total (filtre)
          </div>
          <div
            className="text-2xl font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            {formatCurrency(totalAmount.toString())}
          </div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Facturable
          </div>
          <div
            className="text-2xl font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-status-success)' }}
          >
            {formatCurrency(billableAmount.toString())}
          </div>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <div className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Nombre de depenses
          </div>
          <div
            className="text-2xl font-medium"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}
          >
            {expenses.length}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Month filter */}
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        />

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {/* Project filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <option value="">Tous les projets</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.client.code}-{p.projectNumber} {p.name}</option>
          ))}
        </select>

        {/* Categories button */}
        <button
          onClick={() => setShowCategoriesModal(true)}
          className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        >
          <Settings size={18} />
          <span className="hidden sm:inline">Categories</span>
        </button>

        {/* Add button */}
        <Button onClick={() => openExpenseModal()} icon={<Plus size={18} />}>
          Nouvelle dépense
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : expenses.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          <Wallet
            size={48}
            strokeWidth={1}
            className="mx-auto mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <p style={{ color: 'var(--color-text-muted)' }}>
            {search || categoryFilter || projectFilter || monthFilter
              ? 'Aucune dépense trouvée'
              : 'Aucune dépense pour le moment'}
          </p>
          {!search && !categoryFilter && !projectFilter && !monthFilter && (
            <Button
              onClick={() => openExpenseModal()}
              icon={<Plus size={16} />}
              size="sm"
              className="mt-4"
            >
              Ajouter une dépense
            </Button>
          )}
        </div>
      ) : (
        <FadeIn>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            <StaggerContainer>
              {expenses.map((expense, index) => (
                <StaggerItem key={expense.id}>
                  <div
                    className={clsx(
                      'flex items-center gap-4 px-5 py-4 transition-colors',
                      index !== expenses.length - 1 && 'border-b'
                    )}
                    style={{ borderColor: 'var(--color-border-light)' }}
                  >
              {/* Category color */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: expense.category.color || '#6B7280' }}
              >
                <Tag size={18} className="text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {expense.description}
                  </span>
                  {expense.isBillable && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: 'var(--color-status-success)',
                      }}
                    >
                      Facturable
                    </span>
                  )}
                  {expense.isBilled && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--color-status-info)',
                      }}
                    >
                      Facture
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <Tag size={14} />
                    {expense.category.name}
                  </span>
                  {expense.project && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Building2 size={14} />
                      {expense.project.client.code}-{expense.project.projectNumber}
                    </span>
                  )}
                  {expense.vendor && (
                    <span className="hidden sm:flex items-center gap-1.5 truncate">
                      {expense.vendor}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {formatDate(expense.date)}
                  </span>
                </div>
              </div>

              {/* Receipt link */}
              {expense.receiptUrl && (
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)]"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Voir le reçu"
                >
                  <Receipt size={18} />
                </a>
              )}

              {/* Amount */}
              <div className="text-right shrink-0">
                <div
                  className="text-lg font-medium"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {formatCurrency(expense.amount)}
                </div>
              </div>

              {/* Actions menu */}
              <DropdownMenu
                trigger={
                  <button
                    className="btn-icon p-2 rounded-lg"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                }
              >
                <DropdownItem onClick={() => openExpenseModal(expense)} icon={<Pencil size={16} />}>
                  Modifier
                </DropdownItem>
                <DropdownItem onClick={() => deleteExpense(expense.id)} variant="danger" icon={<Trash2 size={16} />}>
                  Supprimer
                </DropdownItem>
              </DropdownMenu>
            </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </FadeIn>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-lg rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h3
                className="text-lg font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="btn-icon p-1.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Catégorie *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Licence Adobe Creative Cloud"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Montant *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border-light)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Ex: Adobe"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Projet (optionnel)
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="">Aucun projet</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.client.code}-{p.projectNumber} {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Receipt URL */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Lien vers le reçu
                </label>
                <input
                  type="url"
                  value={formData.receiptUrl}
                  onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>

              {/* Billable checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBillable}
                  onChange={(e) => setFormData({ ...formData, isBillable: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Facturable au client
                </span>
              </label>

              {/* Notes */}
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex justify-end gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>
                Annuler
              </Button>
              <Button onClick={saveExpense}>
                {editingExpense ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modal */}
      {showCategoriesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div
            className="w-full max-w-md rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-light)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h3
                className="text-lg font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Categories de depenses
              </h3>
              <button
                onClick={() => setShowCategoriesModal(false)}
                className="btn-icon p-1.5 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Add/Edit form */}
            <div
              className="p-4"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Nom de la catégorie"
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer"
                  style={{ border: '1px solid var(--color-border-light)' }}
                />
                <button
                  onClick={saveCategory}
                  disabled={!categoryForm.name}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-bg-dark)',
                    color: 'var(--color-text-inverse)',
                  }}
                >
                  {editingCategory ? 'Modifier' : 'Ajouter'}
                </button>
                {editingCategory && (
                  <button
                    onClick={() => {
                      setEditingCategory(null)
                      setCategoryForm({ name: '', color: defaultColors[0] })
                    }}
                    className="btn-icon px-3 py-2 rounded-lg text-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Categories list */}
            <div className="max-h-[300px] overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-6 py-3"
                  style={{ borderBottom: '1px solid var(--color-border-light)' }}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: cat.color || '#6B7280' }}
                  />
                  <span className="flex-1" style={{ color: 'var(--color-text-primary)' }}>
                    {cat.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {cat._count?.expenses || 0}
                  </span>
                  <button
                    onClick={() => {
                      setEditingCategory(cat)
                      setCategoryForm({ name: cat.name, color: cat.color || defaultColors[0] })
                    }}
                    className="btn-icon p-1.5 rounded"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="btn-icon-danger p-1.5 rounded"
                    style={{ color: 'var(--color-status-error)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="flex justify-end px-6 py-4"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              <Button variant="secondary" onClick={() => setShowCategoriesModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
