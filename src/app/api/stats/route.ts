import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, startOfYear, format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '12months'

    const now = new Date()

    // Définir la période de calcul
    let startDate: Date
    switch (period) {
      case 'ytd':
        startDate = startOfYear(now)
        break
      case '3months':
        startDate = subMonths(now, 3)
        break
      case '6months':
        startDate = subMonths(now, 6)
        break
      case 'all':
        startDate = new Date(2020, 0, 1)
        break
      default:
        startDate = subMonths(now, 12)
    }

    // Récupérer les données en plusieurs étapes pour identifier l'erreur
    let quotes: any[] = []
    let invoices: any[] = []
    let expenses: any[] = []
    let projects: any[] = []
    let projectCategories: any[] = []
    let clients: any[] = []

    try {
      quotes = await prisma.quote.findMany({
        where: { createdAt: { gte: startDate } },
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true } },
              category: true
            }
          }
        }
      })
    } catch (e) {
      console.error('Error fetching quotes:', e)
    }

    try {
      invoices = await prisma.invoice.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { not: 'CANCELLED' }
        },
        include: {
          project: {
            include: {
              client: { select: { id: true, companyName: true } },
              category: true
            }
          }
        }
      })
    } catch (e) {
      console.error('Error fetching invoices:', e)
    }

    try {
      expenses = await prisma.expense.findMany({
        where: { date: { gte: startDate } },
        include: {
          category: true,
          project: true
        }
      })
    } catch (e) {
      console.error('Error fetching expenses:', e)
    }

    try {
      projects = await prisma.project.findMany({
        where: { createdAt: { gte: startDate } },
        include: {
          client: { select: { id: true, companyName: true } },
          category: true,
          invoices: { where: { status: 'PAID' } },
          expenses: true
        }
      })
    } catch (e) {
      console.error('Error fetching projects:', e)
    }

    try {
      projectCategories = await prisma.projectCategory.findMany({
        orderBy: { sortOrder: 'asc' }
      })
    } catch (e) {
      console.error('Error fetching project categories:', e)
    }

    try {
      clients = await prisma.client.findMany({
        include: {
          projects: {
            include: {
              invoices: { where: { status: 'PAID' } }
            }
          }
        }
      })
    } catch (e) {
      console.error('Error fetching clients:', e)
    }

    // ===== CALCULS REVENUS =====
    const paidInvoices = invoices.filter((inv: any) => inv.status === 'PAID')
    const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0)

    // Revenus par mois (adapté à la période)
    const revenueByMonth: { month: string; revenue: number; expenses: number }[] = []
    const monthsToShow = period === '3months' ? 3 : period === '6months' ? 6 : 12
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))
      const monthLabel = format(monthStart, 'MMM yyyy', { locale: fr })

      const monthRevenue = paidInvoices
        .filter((inv: any) => {
          const payDate = inv.paymentDate ? new Date(inv.paymentDate) : null
          return payDate && payDate >= monthStart && payDate <= monthEnd
        })
        .reduce((sum: number, inv: any) => sum + Number(inv.total), 0)

      const monthExpenses = expenses
        .filter((exp: any) => {
          const expDate = new Date(exp.date)
          return expDate >= monthStart && expDate <= monthEnd
        })
        .reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)

      revenueByMonth.push({ month: monthLabel, revenue: monthRevenue, expenses: monthExpenses })
    }

    // Taux de conversion devis
    const sentQuotes = quotes.filter((q: any) => ['SENT', 'VIEWED', 'ACCEPTED', 'REFUSED', 'EXPIRED'].includes(q.status))
    const acceptedQuotes = quotes.filter((q: any) => q.status === 'ACCEPTED')
    const conversionRate = sentQuotes.length > 0 ? (acceptedQuotes.length / sentQuotes.length) * 100 : 0

    // Valeur moyenne des devis
    const avgQuoteValue = quotes.length > 0
      ? quotes.reduce((sum: number, q: any) => sum + Number(q.total), 0) / quotes.length
      : 0

    // Revenus par catégorie
    const revenueByCategory: { name: string; value: number; color: string }[] = []
    const categoryMap = new Map<string, { name: string; value: number; color: string }>()
    categoryMap.set('uncategorized', { name: 'Non catégorisé', value: 0, color: '#9CA3AF' })

    projectCategories.forEach((cat: any) => {
      categoryMap.set(cat.id, { name: cat.name, value: 0, color: cat.color || '#6366F1' })
    })

    paidInvoices.forEach((inv: any) => {
      const catId = inv.project?.category?.id || 'uncategorized'
      const current = categoryMap.get(catId)
      if (current) {
        current.value += Number(inv.total)
      }
    })

    categoryMap.forEach((data) => {
      if (data.value > 0) {
        revenueByCategory.push(data)
      }
    })

    // Top clients
    const clientRevenue = clients.map((client: any) => {
      const revenue = client.projects.reduce((sum: number, project: any) => {
        return sum + project.invoices.reduce((invSum: number, inv: any) => invSum + Number(inv.total), 0)
      }, 0)
      return {
        id: client.id,
        name: client.companyName,
        revenue,
        projectCount: client.projects.length
      }
    })
    .filter((c: any) => c.revenue > 0)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)

    // Délai moyen de paiement
    const paymentDelays = paidInvoices
      .filter((inv: any) => inv.paymentDate && inv.issueDate)
      .map((inv: any) => differenceInDays(new Date(inv.paymentDate), new Date(inv.issueDate)))

    const avgPaymentDelay = paymentDelays.length > 0
      ? paymentDelays.reduce((sum: number, d: number) => sum + d, 0) / paymentDelays.length
      : 0

    // Factures en retard
    const overdueInvoices = invoices.filter((inv: any) =>
      inv.status !== 'PAID' && inv.status !== 'CANCELLED' && new Date(inv.dueDate) < now
    )
    const overdueRate = invoices.length > 0 ? (overdueInvoices.length / invoices.length) * 100 : 0
    const overdueAmount = overdueInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0)

    // Factures par statut
    const invoicesByStatus = {
      DRAFT: invoices.filter((inv: any) => inv.status === 'DRAFT').length,
      SENT: invoices.filter((inv: any) => inv.status === 'SENT').length,
      PAID: invoices.filter((inv: any) => inv.status === 'PAID').length,
      OVERDUE: invoices.filter((inv: any) => inv.status === 'OVERDUE').length,
    }

    // Dépenses par catégorie
    const expensesByCategory: { name: string; value: number; color: string }[] = []
    const expenseCategoryMap = new Map<string, { name: string; value: number; color: string }>()

    expenses.forEach((exp: any) => {
      const catName = exp.category?.name || 'Non catégorisé'
      const current = expenseCategoryMap.get(catName)
      if (current) {
        current.value += Number(exp.amount)
      } else {
        expenseCategoryMap.set(catName, {
          name: catName,
          value: Number(exp.amount),
          color: exp.category?.color || '#6366F1'
        })
      }
    })

    expenseCategoryMap.forEach((data) => {
      expensesByCategory.push(data)
    })
    expensesByCategory.sort((a, b) => b.value - a.value)

    // Projets par statut
    const projectsByStatus = {
      PROSPECT: projects.filter((p: any) => p.status === 'PROSPECT').length,
      ACTIVE: projects.filter((p: any) => p.status === 'ACTIVE').length,
      PAUSED: projects.filter((p: any) => p.status === 'PAUSED').length,
      COMPLETED: projects.filter((p: any) => p.status === 'COMPLETED').length,
      CANCELLED: projects.filter((p: any) => p.status === 'CANCELLED').length,
    }

    // Rentabilité par projet
    const projectProfitability = projects
      .filter((p: any) => p.invoices.length > 0)
      .map((p: any) => {
        const revenue = p.invoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0)
        const projectExpenses = p.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)
        const profit = revenue - projectExpenses
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0

        return {
          id: p.id,
          name: p.name,
          client: p.client.companyName,
          category: p.category?.name || 'Non catégorisé',
          revenue,
          expenses: projectExpenses,
          profit,
          margin
        }
      })
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)

    // Totaux
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)
    const grossProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    return NextResponse.json({
      period,
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin,
        avgQuoteValue,
        conversionRate,
        avgPaymentDelay: Math.round(avgPaymentDelay),
        overdueRate,
        overdueAmount,
        totalProjects: projects.length,
        totalClients: clientRevenue.length,
        totalQuotes: quotes.length,
        totalInvoices: invoices.length,
      },
      charts: {
        revenueByMonth,
        revenueByCategory,
        expensesByCategory,
        invoicesByStatus,
        projectsByStatus,
      },
      tables: {
        topClients: clientRevenue,
        projectProfitability,
      },
      categories: projectCategories,
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors du calcul des statistiques', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
