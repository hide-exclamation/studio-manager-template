import { Header } from '@/components/layout/Header'
import { ProjectDetail } from './ProjectDetail'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          contacts: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        include: {
          sections: {
            include: {
              items: {
                select: {
                  id: true,
                  name: true,
                  includeInTotal: true,
                  isSelected: true,
                },
              },
            },
          },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
      expenses: {
        orderBy: { date: 'desc' },
        include: {
          category: true,
        },
      },
    },
  })

  if (!project) {
    notFound()
  }

  const projectCode = `${project.client.code}-${String(project.projectNumber).padStart(3, '0')}`

  // Sérialiser les dates pour le composant client
  const serializedProject = {
    ...project,
    startDate: project.startDate?.toISOString() || null,
    endDate: project.endDate?.toISOString() || null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    quotes: project.quotes.map(q => ({
      ...q,
      subtotal: q.subtotal.toString(),
      tpsRate: q.tpsRate.toString(),
      tvqRate: q.tvqRate.toString(),
      total: q.total.toString(),
      depositPercent: q.depositPercent.toString(),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
      validUntil: q.validUntil?.toISOString() || null,
      sections: q.sections.map(s => ({
        ...s,
        items: s.items,
      })),
    })),
    invoices: project.invoices.map(i => ({
      ...i,
      subtotal: i.subtotal.toString(),
      tpsAmount: i.tpsAmount.toString(),
      tvqAmount: i.tvqAmount.toString(),
      total: i.total.toString(),
      amountPaid: i.amountPaid.toString(),
      lateFeeAmount: i.lateFeeAmount.toString(),
      issueDate: i.issueDate.toISOString(),
      dueDate: i.dueDate.toISOString(),
      paymentDate: i.paymentDate?.toISOString() || null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    expenses: project.expenses.map(e => ({
      ...e,
      amount: e.amount.toString(),
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  }

  return (
    <div className="min-h-screen">
      <Header title={project.name} subtitle={`Projet ${projectCode}`} />
      <ProjectDetail project={serializedProject} projectCode={projectCode} />
    </div>
  )
}
