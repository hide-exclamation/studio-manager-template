import { Header } from '@/components/layout/Header'
import { InvoicesList } from './InvoicesList'

export default function InvoicesPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Factures"
        subtitle="Gérer vos factures et paiements"
      />
      <InvoicesList />
    </div>
  )
}
