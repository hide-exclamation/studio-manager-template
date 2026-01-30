import { Header } from '@/components/layout/Header'
import { QuotesList } from './QuotesList'

export default function QuotesPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Devis"
        subtitle="Gérer vos devis et propositions"
      />
      <QuotesList />
    </div>
  )
}
