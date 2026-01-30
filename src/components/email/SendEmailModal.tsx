'use client'

import { useState, useEffect } from 'react'
import { X, Send, Mail, Clock, CheckCircle, XCircle, Eye, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type EmailLog = {
  id: string
  type: string
  status: 'PENDING' | 'SENT' | 'FAILED' | 'OPENED'
  recipient: string
  recipientName: string | null
  subject: string
  sentAt: string | null
  createdAt: string
  errorMessage: string | null
}

type EmailPreview = {
  subject: string
  to: string
  toName: string
  html: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  type: 'quote' | 'invoice'
  itemId: string
  itemNumber: string
  recipientEmail: string
  recipientName: string
  onSent?: () => void
}

const statusIcons = {
  PENDING: <Clock size={14} className="text-yellow-500" />,
  SENT: <CheckCircle size={14} className="text-green-500" />,
  FAILED: <XCircle size={14} className="text-red-500" />,
  OPENED: <Mail size={14} className="text-blue-500" />,
}

const statusLabels = {
  PENDING: 'En attente',
  SENT: 'Envoyé',
  FAILED: 'Échec',
  OPENED: 'Ouvert',
}

export function SendEmailModal({
  isOpen,
  onClose,
  type,
  itemId,
  itemNumber,
  recipientEmail,
  recipientName,
  onSent,
}: Props) {
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview')
  const [emailHistory, setEmailHistory] = useState<EmailLog[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [preview, setPreview] = useState<EmailPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Charger le preview et l'historique
  useEffect(() => {
    if (isOpen && itemId) {
      // Charger le preview
      setLoadingPreview(true)
      const previewEndpoint = type === 'quote'
        ? `/api/quotes/${itemId}/preview-email`
        : `/api/invoices/${itemId}/preview-email`

      fetch(previewEndpoint)
        .then(res => res.json())
        .then(data => {
          if (data.html) {
            setPreview(data)
          }
        })
        .catch(err => {
          console.error('Error loading preview:', err)
        })
        .finally(() => setLoadingPreview(false))

      // Charger l'historique
      setLoadingHistory(true)
      const param = type === 'quote' ? 'quoteId' : 'invoiceId'
      fetch(`/api/emails?${param}=${itemId}`)
        .then(res => res.json())
        .then(data => {
          setEmailHistory(Array.isArray(data) ? data : [])
        })
        .catch(err => {
          console.error('Error loading email history:', err)
          setEmailHistory([])
        })
        .finally(() => setLoadingHistory(false))
    }
  }, [isOpen, itemId, type])

  const handleSend = async () => {
    setSending(true)
    try {
      const endpoint = type === 'quote'
        ? `/api/quotes/${itemId}/send-email`
        : `/api/invoices/${itemId}/send-email`

      const res = await fetch(endpoint, { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        // Recharger l'historique
        const param = type === 'quote' ? 'quoteId' : 'invoiceId'
        const historyRes = await fetch(`/api/emails?${param}=${itemId}`)
        const historyData = await historyRes.json()
        setEmailHistory(Array.isArray(historyData) ? historyData : [])
        setActiveTab('history')

        onSent?.()
      } else {
        alert(data.error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert("Erreur lors de l'envoi de l'email")
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail size={20} style={{ color: 'var(--color-accent-lavender)' }} />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                  Envoyer par email
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {type === 'quote' ? 'Devis' : 'Facture'} {itemNumber}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--color-text-muted)',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0',
              borderBottom: '1px solid var(--color-border)',
              padding: '0 24px',
            }}
          >
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === 'preview' ? 'var(--color-accent-lavender)' : 'var(--color-text-muted)',
                borderBottom: activeTab === 'preview' ? '2px solid var(--color-accent-lavender)' : '2px solid transparent',
                marginBottom: '-1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Eye size={16} />
              Aperçu
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === 'history' ? 'var(--color-accent-lavender)' : 'var(--color-text-muted)',
                borderBottom: activeTab === 'history' ? '2px solid var(--color-accent-lavender)' : '2px solid transparent',
                marginBottom: '-1px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <History size={16} />
              Historique
              {emailHistory.length > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                  }}
                >
                  {emailHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'preview' ? (
              <div style={{ padding: '24px' }}>
                {/* Destinataire et sujet */}
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>A: </span>
                      <span style={{ fontWeight: 500 }}>
                        {recipientName} &lt;{recipientEmail || 'aucun email'}&gt;
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Sujet: </span>
                      <span style={{ fontWeight: 500 }}>
                        {preview?.subject || 'Chargement...'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview iframe */}
                {loadingPreview ? (
                  <div
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    Chargement de l&apos;aperçu...
                  </div>
                ) : preview?.html ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#F5F1E8',
                    }}
                  >
                    <iframe
                      srcDoc={preview.html}
                      style={{
                        width: '100%',
                        height: '400px',
                        border: 'none',
                      }}
                      title="Aperçu email"
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    Impossible de charger l&apos;aperçu
                  </div>
                )}

                {/* Note PDF */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    backgroundColor: 'rgba(197, 184, 227, 0.1)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Le PDF du {type === 'quote' ? 'devis' : 'la facture'} sera joint en pièce jointe.
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                {loadingHistory ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '14px',
                    }}
                  >
                    Chargement...
                  </div>
                ) : emailHistory.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    Aucun email envoyé pour ce {type === 'quote' ? 'devis' : 'cette facture'}
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {emailHistory.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '14px 16px',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            {statusIcons[log.status]}
                            <span style={{ fontWeight: 500 }}>
                              {statusLabels[log.status]}
                            </span>
                          </div>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                            {formatDate(log.sentAt || log.createdAt)}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                          {log.recipient}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {log.subject}
                        </div>
                        {log.errorMessage && (
                          <div style={{ color: 'var(--color-status-error)', marginTop: '6px', fontSize: '12px' }}>
                            {log.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !recipientEmail}
              style={{
                padding: '10px 20px',
                backgroundColor: recipientEmail ? 'var(--color-status-info)' : 'var(--color-bg-tertiary)',
                color: recipientEmail ? 'white' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: recipientEmail ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: sending ? 0.7 : 1,
              }}
            >
              <Send size={16} />
              {sending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
