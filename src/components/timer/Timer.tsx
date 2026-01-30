'use client'

import { useState, useEffect } from 'react'
import { Play, Square, Clock } from 'lucide-react'
import { useToast } from '@/components/ui'

type TimerProps = {
  projectId: string
  onTimeEntrySaved?: () => void
}

type RunningTimer = {
  id: string
  startTime: string
  description: string | null
}

export function Timer({ projectId, onTimeEntrySaved }: TimerProps) {
  const toast = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [description, setDescription] = useState('')

  // Verifier s'il y a un timer en cours au chargement
  useEffect(() => {
    const checkRunningTimer = async () => {
      try {
        const res = await fetch(`/api/time-entries?projectId=${projectId}&isRunning=true`)
        const entries = await res.json()
        if (entries.length > 0) {
          const timer = entries[0]
          setRunningTimer(timer)
          setIsRunning(true)
          setDescription(timer.description || '')
        }
      } catch (error) {
        console.error('Error checking running timer:', error)
      }
    }
    checkRunningTimer()
  }, [projectId])

  // Mettre a jour le temps ecoule
  useEffect(() => {
    if (isRunning && runningTimer) {
      const startTime = new Date(runningTimer.startTime).getTime()

      const updateElapsed = () => {
        const now = Date.now()
        setElapsedSeconds(Math.floor((now - startTime) / 1000))
      }

      updateElapsed()
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    }
  }, [isRunning, runningTimer])

  const startTimer = async () => {
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: description || null,
          startTimer: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error)
        return
      }

      const timer = await res.json()
      setRunningTimer(timer)
      setIsRunning(true)
      setElapsedSeconds(0)
    } catch (error) {
      console.error('Error starting timer:', error)
    }
  }

  const stopTimer = async () => {
    if (!runningTimer) return

    try {
      const res = await fetch(`/api/time-entries/${runningTimer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopTimer: true,
          description: description || null,
        }),
      })

      if (res.ok) {
        setRunningTimer(null)
        setIsRunning(false)
        setElapsedSeconds(0)
        setDescription('')
        onTimeEntrySaved?.()
      }
    } catch (error) {
      console.error('Error stopping timer:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Timer display */}
        <div className="flex items-center gap-2">
          <Clock size={20} style={{ color: isRunning ? 'var(--color-status-success)' : 'var(--color-text-muted)' }} />
          <span
            className="text-2xl font-mono"
            style={{
              fontFamily: 'var(--font-heading)',
              color: isRunning ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* Description input */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description..."
          disabled={isRunning}
          className="flex-1 px-3 py-2 rounded-lg text-sm disabled:opacity-60"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-light)',
            color: 'var(--color-text-primary)',
          }}
        />

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-status-success)',
                color: 'white',
              }}
              title="Demarrer"
            >
              <Play size={20} />
            </button>
          ) : (
            <button
              onClick={stopTimer}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-status-error)',
                color: 'white',
              }}
              title="Arrêter"
            >
              <Square size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
