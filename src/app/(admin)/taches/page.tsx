import { Header } from '@/components/layout/Header'
import { TasksPageContent } from './TasksPageContent'
import { prisma } from '@/lib/prisma'

export default async function TasksPage() {
  // Fetch all projects for the filter dropdown
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      projectNumber: true,
      client: {
        select: {
          code: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const serializedProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    code: `${p.client.code}-${String(p.projectNumber).padStart(3, '0')}`,
  }))

  return (
    <div className="min-h-screen">
      <Header
        title="Tâches"
        subtitle="Vue globale de toutes les tâches"
      />
      <TasksPageContent projects={serializedProjects} />
    </div>
  )
}
