import { Header } from '@/components/layout/Header'
import { ClientsList } from './ClientsList'

export default function ClientsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Clients"
        subtitle="Gérer vos clients et leurs informations"
      />
      <ClientsList />
    </div>
  )
}
