import { describe, expect, test } from 'vitest'

import { parseHeaderNavModules } from '../nav-modules'

describe('parseHeaderNavModules', () => {
  test('preserves the rankings administrator-only access rule', () => {
    const modules = parseHeaderNavModules(
      JSON.stringify({
        rankings: {
          enabled: true,
          requireAuth: false,
          adminOnly: true,
        },
      })
    )

    expect(modules.rankings).toMatchObject({
      enabled: true,
      requireAuth: false,
      adminOnly: true,
    })
  })
})
