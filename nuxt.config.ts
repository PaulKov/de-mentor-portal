export default defineNuxtConfig({
  compatibilityDate: '2026-06-14',
  devtools: { enabled: false },
  sourcemap: { server: false, client: false },
  vite: {
    build: {
      modulePreload: { polyfill: false }
    }
  },
  css: [
    '~/assets/css/main.css',
    '~/assets/css/control-plane.css',
    '~/assets/css/cockpit.css',
    '~/assets/css/student-launchpad.css',
    '~/assets/css/lesson-hub.css',
    '~/assets/css/session-workspace.css',
    '~/assets/css/review-center.css',
    '~/assets/css/submission-inbox.css',
    '~/assets/css/cohort-dashboard.css',
    '~/assets/css/release-console.css',
    '~/assets/css/global-navigation.css',
    '~/assets/css/delivery-control-room.css',
    '~/assets/css/evidence-ledger.css',
    '~/assets/css/assessment-center.css',
    '~/assets/css/post-lesson-pack.css'
  ],
  app: {
    head: {
      title: 'Greenplum Academy Portal',
      meta: [
        {
          name: 'description',
          content: 'Academy Experience v5 portal for Greenplum mentor sessions'
        }
      ]
    }
  }
})
