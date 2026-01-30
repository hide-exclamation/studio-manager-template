import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/expense-categories/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        expenses: {
          orderBy: { date: 'desc' },
          take: 10
        },
        _count: {
          select: { expenses: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching expense category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la catégorie' },
      { status: 500 }
    )
  }
}

// PUT /api/expense-categories/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { name, color, icon, sortOrder, isDefault } = body

    const existing = await prisma.expenseCategory.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si le nouveau nom existe déjà (si modifié)
    if (name && name !== existing.name) {
      const nameExists = await prisma.expenseCategory.findUnique({
        where: { name }
      })
      if (nameExists) {
        return NextResponse.json(
          { error: 'Une catégorie avec ce nom existe déjà' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isDefault !== undefined && { isDefault }),
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating expense category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la catégorie' },
      { status: 500 }
    )
  }
}

// DELETE /api/expense-categories/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      )
    }

    // Empêcher la suppression si des dépenses existent
    if (category._count.expenses > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer: ${category._count.expenses} dépense(s) associée(s)` },
        { status: 400 }
      )
    }

    await prisma.expenseCategory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting expense category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie' },
      { status: 500 }
    )
  }
}
