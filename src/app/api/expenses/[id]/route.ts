import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/expenses/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const expense = await prisma.expense.findUnique({
      where: { id },
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
        },
        invoice: {
          select: { id: true, invoiceNumber: true }
        }
      }
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...expense,
      amount: expense.amount.toString(),
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la dépense' },
      { status: 500 }
    )
  }
}

// PUT /api/expenses/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
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
      isBilled,
      invoiceId,
      notes
    } = body

    const existing = await prisma.expense.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la catégorie existe si modifiée
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: categoryId }
      })
      if (!category) {
        return NextResponse.json(
          { error: 'Catégorie non trouvée' },
          { status: 404 }
        )
      }
    }

    // Vérifier que le projet existe si fourni
    if (projectId && projectId !== existing.projectId) {
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

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(categoryId && { categoryId }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(description && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(vendor !== undefined && { vendor: vendor || null }),
        ...(receiptUrl !== undefined && { receiptUrl: receiptUrl || null }),
        ...(isBillable !== undefined && { isBillable }),
        ...(isBilled !== undefined && { isBilled }),
        ...(invoiceId !== undefined && { invoiceId: invoiceId || null }),
        ...(notes !== undefined && { notes: notes || null }),
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
    })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la dépense' },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const expense = await prisma.expense.findUnique({
      where: { id }
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    await prisma.expense.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la dépense' },
      { status: 500 }
    )
  }
}
