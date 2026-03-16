import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://4f205b170301daa6df2c8bb67ba3fe50@o4511055930785792.ingest.us.sentry.io/4511055951691776',
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,

})
