import { describe, expect, test } from 'vitest'

import { parseHeaderNavModules, serializeHeaderNavModules } from '../config'

describe('header navigation settings config', () => {
  test('round-trips the rankings administrator-only setting', () => {
    const parsed = parseHeaderNavModules(
      JSON.stringify({
        rankings: {
          enabled: true,
          requireAuth: false,
          adminOnly: true,
        },
      })
    )

    expect(parsed.rankings.adminOnly).toBe(true)
    expect(JSON.parse(serializeHeaderNavModules(parsed))).toMatchObject({
      rankings: {
        enabled: true,
        requireAuth: false,
        adminOnly: true,
      },
    })
  })

  test('keeps administrator-only access disabled for legacy settings', () => {
    const parsed = parseHeaderNavModules(
      JSON.stringify({
        rankings: { enabled: true, requireAuth: true },
      })
    )

    expect(parsed.rankings.adminOnly).toBe(false)
  })
})
