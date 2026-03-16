import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://4f205b170301daa6df2c8bb67ba3fe50@o4511055930785792.ingest.us.sentry.io/4511055951691776',
  environment: process.env.NODE_ENV,

  // Capture 100% of errors, 10% of performance traces
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Don't send errors from localhost
  enabled: process.env.NODE_ENV === 'production',
})
