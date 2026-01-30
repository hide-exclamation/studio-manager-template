import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/project-categories - Liste des catégories de projets
export async function GET() {
  try {
    const categories = await prisma.projectCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching project categories:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des catégories' },
      { status: 500 }
    )
  }
}

// POST /api/project-categories - Créer une catégorie
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, color, icon } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      )
    }

    // Vérifier si la catégorie existe déjà
    const existing = await prisma.projectCategory.findUnique({
      where: { name }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Cette catégorie existe déjà' },
        { status: 400 }
      )
    }

    // Récupérer le prochain sortOrder
    const lastCategory = await prisma.projectCategory.findFirst({
      orderBy: { sortOrder: 'desc' }
    })
    const nextSortOrder = (lastCategory?.sortOrder ?? -1) + 1

    const category = await prisma.projectCategory.create({
      data: {
        name,
        color: color || '#6366F1',
        icon: icon || 'folder',
        sortOrder: nextSortOrder,
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating project category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la catégorie' },
      { status: 500 }
    )
  }
}
