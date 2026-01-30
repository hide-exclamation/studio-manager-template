import { Header } from '@/components/layout/Header'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProjectForm } from '../../ProjectForm'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, code: true, companyName: true }
      }
    }
  })

  if (!project) {
    notFound()
  }

  const initialData = {
    id: project.id,
    clientId: project.clientId,
    categoryId: project.categoryId || '',
    projectNumber: project.projectNumber,
    name: project.name,
    description: project.description || '',
    status: project.status,
    startDate: project.startDate ? project.startDate.toISOString().split('T')[0] : '',
    endDate: project.endDate ? project.endDate.toISOString().split('T')[0] : '',
    googleDriveUrl: project.googleDriveUrl || '',
  }

  return (
    <div className="min-h-screen">
      <Header
        title="Modifier le projet"
        subtitle={`${project.client.code} - ${project.name}`}
      />
      <ProjectForm initialData={initialData} isEditing />
    </div>
  )
}
