import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ROLE } from '@/lib/roles'

import { useTopNavLinks } from '../use-top-nav-links'

let currentRole: number | null
let currentStatus: Record<string, unknown>

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: currentStatus }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      user: currentRole === null ? null : { role: currentRole },
    },
  }),
}))

function useHasRankingsLink() {
  return useTopNavLinks().some((link) => link.href === '/rankings')
}

describe('useTopNavLinks rankings access', () => {
  beforeEach(() => {
    currentRole = null
    currentStatus = {
      HeaderNavModules: JSON.stringify({
        rankings: {
          enabled: true,
          requireAuth: false,
          adminOnly: true,
        },
      }),
    }
  })

  test('shows an administrator-only rankings link only to administrators', () => {
    const { result, rerender } = renderHook(useHasRankingsLink)
    expect(result.current).toBe(false)

    currentRole = ROLE.USER
    rerender()
    expect(result.current).toBe(false)

    currentRole = ROLE.ADMIN
    rerender()
    expect(result.current).toBe(true)
  })
})
