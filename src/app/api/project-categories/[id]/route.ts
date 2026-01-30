import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/project-categories/[id] - Modifier une catégorie
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, color, icon } = body

    const category = await prisma.projectCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(icon !== undefined && { icon }),
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating project category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la catégorie' },
      { status: 500 }
    )
  }
}

// DELETE /api/project-categories/[id] - Supprimer une catégorie
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier si des projets utilisent cette catégorie
    const projectsCount = await prisma.project.count({
      where: { categoryId: id }
    })

    if (projectsCount > 0) {
      // Retirer la catégorie des projets au lieu de bloquer
      await prisma.project.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      })
    }

    await prisma.projectCategory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project category:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie' },
      { status: 500 }
    )
  }
}
