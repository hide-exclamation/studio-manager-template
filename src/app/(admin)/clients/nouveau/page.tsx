import { Header } from '@/components/layout/Header'
import { ClientForm } from '../ClientForm'

export default function NewClientPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Nouveau client"
        subtitle="Ajouter un client à votre répertoire"
      />
      <ClientForm />
    </div>
  )
}
