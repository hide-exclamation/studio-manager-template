import { Header } from '@/components/layout/Header'
import { ExpensesList } from './ExpensesList'

export default function ExpensesPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Dépenses"
        subtitle="Suivi des dépenses du studio"
      />
      <ExpensesList />
    </div>
  )
}
