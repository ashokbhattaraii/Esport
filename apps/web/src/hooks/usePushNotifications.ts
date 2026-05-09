'use client'
import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

export function usePushNotifications() {
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    // Guard 1: only run on native Android/iOS
    if (!Capacitor.isNativePlatform()) return

    let removeRegistration: (() => void) | null = null
    let removeError: (() => void) | null = null
    let removeReceived: (() => void) | null = null
    let removeAction: (() => void) | null = null

    // Lazy import — only import plugin when actually on native
    // This prevents the module-level crash on web
    const init = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Check permission first before registering
        const permResult = await PushNotifications.checkPermissions()

        if (permResult.receive === 'prompt') {
          const reqResult = await PushNotifications.requestPermissions()
          // User denied — exit gracefully, do NOT register
          if (reqResult.receive !== 'granted') return
        }

        if (permResult.receive === 'denied') return

        // Only register if mounted
        if (!mounted.current) return
        await PushNotifications.register()

        // Use addListener with stored cleanup refs
        const regListener = await PushNotifications.addListener(
          'registration',
          async (token) => {
            if (!mounted.current) return
            try {
              // POST token to backend — non-blocking, never crash on failure
              const { api } = await import('@/lib/api')
              await api('/users/push-token', {
                method: 'POST',
                body: JSON.stringify({
                  token: token.value,
                  platform: Capacitor.getPlatform(),
                }),
              }).catch(() => {}) // silent fail
            } catch {}
          }
        )

        const errListener = await PushNotifications.addListener(
          'registrationError',
          () => {} // silent — do not crash on registration failure
        )

        const rcvListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          async (notification) => {
            if (!mounted.current) return
            try {
              const { LocalNotifications } = await import('@capacitor/local-notifications')
              await LocalNotifications.schedule({
                notifications: [{
                  id: Date.now(),
                  title: notification.title || 'FireSlot Nepal',
                  body: notification.body || '',
                  schedule: { at: new Date(Date.now() + 100) },
                }]
              }).catch(() => {})
            } catch {}
          }
        )

        const actListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            if (!mounted.current) return
            try {
              const data = action.notification.data
              if (!data?.type) return
              const routes: Record<string, string> = {
                PAYMENT_APPROVED: '/tournaments',
                PRIZE_CREDITED: '/wallet',
                ROOM_DETAILS: `/tournaments/${data.tournamentId || ''}`,
                SUPPORT_REPLY: '/support',
                TOURNAMENT_STARTING: `/tournaments/${data.tournamentId || ''}`,
              }
              const route = routes[data.type]
              if (route) window.location.href = route // use window.location not router — safer post-permission-grant
            } catch {}
          }
        )

        removeRegistration = () => regListener.remove()
        removeError = () => errListener.remove()
        removeReceived = () => rcvListener.remove()
        removeAction = () => actListener.remove()

      } catch (e) {
        // Any import or plugin error → silent fail, never crash the app
        console.warn('Push notifications unavailable:', e)
      }
    }

    init()

    return () => {
      mounted.current = false
      removeRegistration?.()
      removeError?.()
      removeReceived?.()
      removeAction?.()
    }
  }, [])
}

function routeFor(data: any): string | null {
  switch (data?.type) {
    case "PAYMENT_APPROVED": return "/tournaments";
    case "PRIZE_CREDITED":   return "/wallet";
    case "ROOM_DETAILS":     return data.tournamentId ? `/tournaments/${data.tournamentId}` : "/tournaments";
    case "SUPPORT_REPLY":    return "/support";
    default: return null;
  }
}
