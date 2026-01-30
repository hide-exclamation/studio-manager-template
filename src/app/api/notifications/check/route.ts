import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { subDays, addDays, differenceInDays } from 'date-fns'
import { sendEmail, getInvoiceForEmail, canSendEmailType } from '@/lib/email'
import { renderInvoiceReminderEmail, renderInvoiceOverdueEmail } from '@/lib/email-templates'
import { EmailType } from '@prisma/client'

// POST /api/notifications/check - Vérifie et génère les notifications automatiques
export async function POST() {
  try {
    const now = new Date()
    const createdNotifications: string[] = []

    // ========================================
    // 1. INVOICE_OVERDUE - Factures en retard de +30 jours après ENVOI
    // Les frais de 2% s'appliquent 30 jours après l'envoi de la facture
    // ========================================
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        issueDate: { lt: subDays(now, 30) },
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    for (const invoice of overdueInvoices) {
      const daysSinceSent = differenceInDays(now, invoice.issueDate)

      // Vérifier si une notification pour ce mois existe déjà
      // On crée une notification par mois tant que la facture n'est pas payée
      const monthsOverdue = Math.floor((daysSinceSent - 30) / 30) + 1
      const monthLabel = monthsOverdue === 1 ? '1 mois' : `${monthsOverdue} mois`

      const exists = await prisma.notification.findFirst({
        where: {
          type: 'INVOICE_OVERDUE',
          relatedId: invoice.id,
          message: { contains: monthLabel },
        },
      })

      if (!exists) {
        await prisma.notification.create({
          data: {
            type: 'INVOICE_OVERDUE',
            title: 'Facture en retard',
            message: `La facture ${invoice.invoiceNumber} (${invoice.project.client.companyName}) est en retard depuis ${monthLabel} - Frais de 2% appliqués`,
            link: `/projects/${invoice.projectId}?tab=factures`,
            relatedId: invoice.id,
            relatedType: 'invoice',
          },
        })
        createdNotifications.push(`INVOICE_OVERDUE: ${invoice.invoiceNumber} (${monthLabel})`)

        // Envoyer email automatique si activé pour ce client
        try {
          const canSend = await canSendEmailType(invoice.project.clientId, EmailType.INVOICE_OVERDUE)
          if (canSend) {
            const invoiceForEmail = await getInvoiceForEmail(invoice.id)
            if (invoiceForEmail) {
              const contact = invoiceForEmail.project.client.contacts[0]
              if (contact?.email && invoiceForEmail.publicToken) {
                const emailData = await renderInvoiceOverdueEmail({ invoice: invoiceForEmail })
                await sendEmail(
                  {
                    to: emailData.to,
                    toName: emailData.toName,
                    subject: emailData.subject,
                    html: emailData.html,
                  },
                  {
                    type: EmailType.INVOICE_OVERDUE,
                    invoiceId: invoice.id,
                    clientId: invoice.project.clientId,
                  }
                )
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending overdue email:', emailError)
        }
      }
    }

    // ========================================
    // 2. INVOICE_REMINDER - Rappels factures impayées
    // Rappel 1: 21 jours après l'envoi
    // Rappel 2: 28 jours après l'envoi
    // ========================================
    const sentInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'OVERDUE'] },
        // Entre 21 et 30 jours après l'envoi
        issueDate: {
          lt: subDays(now, 21),
          gte: subDays(now, 30),
        },
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    for (const invoice of sentInvoices) {
      const daysSinceSent = differenceInDays(now, invoice.issueDate)

      // Rappels aux seuils 21 et 28 jours après l'envoi
      const thresholds = [
        { days: 21, level: 1 as const, emailType: EmailType.INVOICE_REMINDER_1 },
        { days: 28, level: 2 as const, emailType: EmailType.INVOICE_REMINDER_2 },
      ]

      for (const threshold of thresholds) {
        if (daysSinceSent >= threshold.days && daysSinceSent < threshold.days + 7) {
          const exists = await prisma.notification.findFirst({
            where: {
              type: 'INVOICE_REMINDER',
              relatedId: invoice.id,
              message: { contains: `${threshold.days} jours` },
            },
          })

          if (!exists) {
            await prisma.notification.create({
              data: {
                type: 'INVOICE_REMINDER',
                title: 'Rappel facture impayée',
                message: `La facture ${invoice.invoiceNumber} (${invoice.project.client.companyName}) est impayée depuis ${threshold.days} jours`,
                link: `/projects/${invoice.projectId}?tab=factures`,
                relatedId: invoice.id,
                relatedType: 'invoice',
              },
            })
            createdNotifications.push(`INVOICE_REMINDER: ${invoice.invoiceNumber} (J+${threshold.days})`)

            // Envoyer email automatique si activé pour ce client
            try {
              const canSend = await canSendEmailType(invoice.project.clientId, threshold.emailType)
              if (canSend) {
                const invoiceForEmail = await getInvoiceForEmail(invoice.id)
                if (invoiceForEmail) {
                  const contact = invoiceForEmail.project.client.contacts[0]
                  if (contact?.email && invoiceForEmail.publicToken) {
                    const emailData = await renderInvoiceReminderEmail({
                      invoice: invoiceForEmail,
                      reminderLevel: threshold.level
                    })
                    await sendEmail(
                      {
                        to: emailData.to,
                        toName: emailData.toName,
                        subject: emailData.subject,
                        html: emailData.html,
                      },
                      {
                        type: threshold.emailType,
                        invoiceId: invoice.id,
                        clientId: invoice.project.clientId,
                      }
                    )
                  }
                }
              }
            } catch (emailError) {
              console.error('Error sending reminder email:', emailError)
            }
          }
          break
        }
      }
    }

    // ========================================
    // 3. QUOTE_EXPIRED - Devis expirés
    // ========================================
    const expiredQuotes = await prisma.quote.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED'] },
        validUntil: { lt: now },
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    for (const quote of expiredQuotes) {
      const exists = await prisma.notification.findFirst({
        where: {
          type: 'QUOTE_EXPIRED',
          relatedId: quote.id,
          isRead: false,
        },
      })

      if (!exists) {
        await prisma.notification.create({
          data: {
            type: 'QUOTE_EXPIRED',
            title: 'Devis expiré',
            message: `Le devis ${quote.quoteNumber} (${quote.project.client.companyName}) a expiré`,
            link: `/projects/${quote.projectId}?tab=devis`,
            relatedId: quote.id,
            relatedType: 'quote',
          },
        })
        createdNotifications.push(`QUOTE_EXPIRED: ${quote.quoteNumber}`)
      }
    }

    // ========================================
    // 4. TASK_DUE_SOON - Tâches à venir (J-7, J-3, J-1)
    // ========================================
    const upcomingTasks = await prisma.projectTask.findMany({
      where: {
        status: { not: 'DONE' },
        dueDate: {
          gte: now,
          lte: addDays(now, 7),
        },
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    })

    for (const task of upcomingTasks) {
      if (!task.dueDate) continue

      const daysUntilDue = differenceInDays(task.dueDate, now)
      const thresholds = [1, 3, 7]

      for (const threshold of thresholds) {
        if (daysUntilDue <= threshold) {
          const thresholdLabel = threshold === 1 ? 'demain' : `dans ${threshold} jours`

          // Vérifier si une notification pour ce seuil existe déjà
          const exists = await prisma.notification.findFirst({
            where: {
              type: 'TASK_DUE_SOON',
              relatedId: task.id,
              message: { contains: thresholdLabel },
            },
          })

          if (!exists) {
            await prisma.notification.create({
              data: {
                type: 'TASK_DUE_SOON',
                title: 'Tâche à venir',
                message: `"${task.title}" (${task.project.client.companyName}) est due ${thresholdLabel}`,
                link: `/projects/${task.projectId}?tab=taches`,
                relatedId: task.id,
                relatedType: 'task',
              },
            })
            createdNotifications.push(`TASK_DUE_SOON: ${task.title} (${threshold}j)`)
          }
          break // Ne créer qu'une notification par tâche
        }
      }
    }

    // ========================================
    // 5. PROJECT_PAUSED - Projets en pause depuis +14 jours
    // ========================================
    const pausedProjects = await prisma.project.findMany({
      where: {
        status: 'PAUSED',
        updatedAt: { lt: subDays(now, 14) },
      },
      include: { client: true },
    })

    for (const project of pausedProjects) {
      const exists = await prisma.notification.findFirst({
        where: {
          type: 'PROJECT_PAUSED',
          relatedId: project.id,
          isRead: false,
        },
      })

      if (!exists) {
        const daysPaused = differenceInDays(now, project.updatedAt)
        await prisma.notification.create({
          data: {
            type: 'PROJECT_PAUSED',
            title: 'Projet en pause',
            message: `Le projet "${project.name}" (${project.client.companyName}) est en pause depuis ${daysPaused} jours`,
            link: `/projects/${project.id}`,
            relatedId: project.id,
            relatedType: 'project',
          },
        })
        createdNotifications.push(`PROJECT_PAUSED: ${project.name}`)
      }
    }

    return NextResponse.json({
      success: true,
      created: createdNotifications.length,
      notifications: createdNotifications,
    })
  } catch (error) {
    console.error('Error checking notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des notifications', details: String(error) },
      { status: 500 }
    )
  }
}
