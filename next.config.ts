import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  /* config options here */
}

export default withSentryConfig(nextConfig, {
  org: 'o4511055930785792',
  project: '13runleague',

  // Suppress Sentry CLI output during builds
  silent: true,

  // Upload source maps for readable stack traces in Sentry
  widenClientFileUpload: true,

  // Automatically instrument Next.js data fetching methods
  autoInstrumentServerFunctions: true,

  // Disable the Sentry logger to reduce bundle size
  disableLogger: true,

  // Hide source maps from client bundle
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
