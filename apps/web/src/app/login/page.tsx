"use client"

import { useEffect, useState } from 'react'
import { GoogleAuthPanel } from '@/components/GoogleAuthPanel'
import { config } from '@/lib/config'
import { InlineLoading } from '@/components/ui'

export default function LoginPage() {
  const [clientId, setClientId] = useState(config.googleClientId)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (clientId) return
    let attempts = 0
    const interval = setInterval(() => {
      const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
      if (id) { setClientId(id); clearInterval(interval) }
      if (++attempts >= 6) clearInterval(interval)
    }, 500)
    return () => clearInterval(interval)
  }, [clientId])

  if (!clientId) {
    return (
      <div className="mx-auto max-w-md text-center py-12">
        <InlineLoading label="Initializing sign-in..." />
        <p className="text-sm text-white/60 mt-3">If this message persists, please contact the app maintainers.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md">
      <GoogleAuthPanel title="Sign in to FireSlot" next="/dashboard" />
    </div>
  )
}
