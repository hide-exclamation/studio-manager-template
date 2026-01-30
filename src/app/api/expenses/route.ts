import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/expenses - Liste des dépenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const categoryId = searchParams.get('categoryId')
    const month = searchParams.get('month') // Format: YYYY-MM
    const isBillable = searchParams.get('isBillable')
    const isBilled = searchParams.get('isBilled')

    const where: Record<string, unknown> = {}

    if (projectId) {
      where.projectId = projectId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59)
      where.date = {
        gte: startDate,
        lte: endDate
      }
    }

    if (isBillable !== null && isBillable !== undefined) {
      where.isBillable = isBillable === 'true'
    }

    if (isBilled !== null && isBilled !== undefined) {
      where.isBilled = isBilled === 'true'
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: true,
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            client: {
              select: { code: true, companyName: true }
            }
          }
        }
      }
    })

    // Sérialiser les Decimal
    const serialized = expenses.map(e => ({
      ...e,
      amount: e.amount.toString(),
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dépenses' },
      { status: 500 }
    )
  }
}

// POST /api/expenses - Créer une dépense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      categoryId,
      projectId,
      description,
      amount,
      date,
      vendor,
      receiptUrl,
      isBillable,
      notes
    } = body

    if (!categoryId || !description || amount === undefined) {
      return NextResponse.json(
        { error: 'Catégorie, description et montant sont requis' },
        { status: 400 }
      )
    }

    // Vérifier que la catégorie existe
    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que le projet existe si fourni
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) {
        return NextResponse.json(
          { error: 'Projet non trouvé' },
          { status: 404 }
        )
      }
    }

    const expense = await prisma.expense.create({
      data: {
        categoryId,
        projectId: projectId || null,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        vendor: vendor || null,
        receiptUrl: receiptUrl || null,
        isBillable: isBillable || false,
        notes: notes || null,
      },
      include: {
        category: true,
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            client: {
              select: { code: true, companyName: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toString(),
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la dépense' },
      { status: 500 }
    )
  }
}
