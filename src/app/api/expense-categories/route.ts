import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/expense-categories - Liste des catégories
export async function GET() {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des catégories' },
      { status: 500 }
    )
  }
}

// POST /api/expense-categories - Créer une catégorie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, icon, sortOrder, isDefault } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      )
    }

    // Vérifier si le nom existe déjà
    const existing = await prisma.expenseCategory.findUnique({
      where: { name }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Une catégorie avec ce nom existe déjà' },
        { status: 400 }
      )
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name,
        color: color || null,
        icon: icon || null,
        sortOrder: sortOrder || 0,
        isDefault: isDefault || false,
      }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating expense category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie' },
      { status: 500 }
    )
  }
}
