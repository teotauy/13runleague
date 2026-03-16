'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function SentryInit() {
  useEffect(() => {
    Sentry.init({
      dsn: 'https://4f205b170301daa6df2c8bb67ba3fe50@o4511055930785792.ingest.us.sentry.io/4511055951691776',
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.05,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
    })
  }, [])

  return null
}
