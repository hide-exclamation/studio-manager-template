import { Header } from '@/components/layout/Header'
import { StatsContent } from './StatsContent'

export default function StatsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Statistiques"
        subtitle="Analyse détaillée de votre activité"
      />
      <StatsContent />
    </div>
  )
}
