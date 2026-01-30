import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeDecimal } from '@/lib/serialize'

// GET /api/notifications - Liste les notifications avec pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where = unreadOnly ? { isRead: false } : {}

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { isRead: false } }),
    ])

    return NextResponse.json({
      notifications: serializeDecimal(notifications),
      total,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Crée une notification (usage interne)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, message, link, relatedId, relatedType } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'type, title et message sont requis' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        link,
        relatedId,
        relatedType,
      },
    })

    return NextResponse.json({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() || null,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la creation de la notification' },
      { status: 500 }
    )
  }
}
