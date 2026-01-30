'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { TemplatesList } from './TemplatesList'
import { SectionsList } from './SectionsList'
import { ItemsList } from './ItemsList'
import { EmailTemplatesList } from './EmailTemplatesList'

type Tab = 'templates' | 'sections' | 'items' | 'emails'

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates')

  const tabs = [
    { id: 'templates' as Tab, label: 'Templates de devis' },
    { id: 'sections' as Tab, label: 'Sections' },
    { id: 'items' as Tab, label: 'Items' },
    { id: 'emails' as Tab, label: 'Modèles de courriels' },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Bibliothèque"
        subtitle="Gérer les templates et éléments réutilisables"
      />

      <div className="p-6 max-w-6xl">
        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg mb-6"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-bg-dark)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'templates' && <TemplatesList />}
        {activeTab === 'sections' && <SectionsList />}
        {activeTab === 'items' && <ItemsList />}
        {activeTab === 'emails' && <EmailTemplatesList />}
      </div>
    </div>
  )
}
