'use client'

import useSWR from 'swr'

export function useAppConfig() {
  const { data } = useSWR('/app/config', {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    fetcher: (url: string) => fetch(url).then((r) => r.json()),
  })
  return {
    maintenanceMode: data?.APP_MAINTENANCE_MODE === 'true',
    maintenanceMessage: data?.APP_MAINTENANCE_MESSAGE ?? '',
    announcementActive: data?.APP_ANNOUNCEMENT_ACTIVE === 'true',
    announcementText: data?.APP_ANNOUNCEMENT_TEXT ?? '',
    announcementColor: data?.APP_ANNOUNCEMENT_COLOR ?? '#E53935',
    withdrawEnabled: data?.APP_WITHDRAW_ENABLED !== 'false',
    depositEnabled: data?.APP_DEPOSIT_ENABLED !== 'false',
    challengeEnabled: data?.APP_CHALLENGE_ENABLED !== 'false',
    tournamentJoinEnabled: data?.APP_TOURNAMENT_JOIN_ENABLED !== 'false',
    loginMessage: data?.APP_LOGIN_MESSAGE ?? '',
    homeNotice: data?.APP_HOME_NOTICE ?? '',
    registrationOpen: data?.APP_REGISTRATION_OPEN !== 'false',
    forceUpdateVersion: data?.APP_FORCE_UPDATE_VERSION ?? '',
  }
}
