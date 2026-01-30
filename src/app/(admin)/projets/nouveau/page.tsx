import { Header } from '@/components/layout/Header'
import { ProjectForm } from '../ProjectForm'

type Props = {
  searchParams: Promise<{ client?: string }>
}

export default async function NewProjectPage({ searchParams }: Props) {
  const { client: preselectedClientId } = await searchParams

  return (
    <div className="min-h-screen">
      <Header
        title="Nouveau projet"
        subtitle="Créer un nouveau projet client"
      />
      <ProjectForm preselectedClientId={preselectedClientId} />
    </div>
  )
}
