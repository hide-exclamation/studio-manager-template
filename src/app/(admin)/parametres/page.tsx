import { Header } from '@/components/layout/Header'
import { SettingsForm } from './SettingsForm'

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Paramètres"
        subtitle="Configuration du studio"
      />
      <SettingsForm />
    </div>
  )
}
