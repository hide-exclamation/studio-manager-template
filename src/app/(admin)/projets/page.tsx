import { Header } from '@/components/layout/Header'
import { ProjectsList } from './ProjectsList'

export default function ProjectsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Projets"
        subtitle="Gérer vos projets et leur avancement"
      />
      <ProjectsList />
    </div>
  )
}
