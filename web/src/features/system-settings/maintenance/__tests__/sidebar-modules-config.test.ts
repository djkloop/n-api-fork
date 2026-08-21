import { describe, expect, test } from 'vitest'

import {
  parseSidebarModulesAdmin,
  serializeSidebarModulesAdmin,
} from '../config'

describe('sidebar module configuration', () => {
  test('moves legacy IP controls from admin to the super-admin section', () => {
    const config = parseSidebarModulesAdmin(
      JSON.stringify({
        admin: {
          enabled: true,
          channel: true,
          ipBan: false,
          ipLogAudit: true,
        },
      })
    )

    expect(config.superAdmin).toEqual({
      enabled: true,
      ipBan: false,
      ipLogAudit: true,
    })
    expect(config.admin).not.toHaveProperty('ipBan')
    expect(config.admin).not.toHaveProperty('ipLogAudit')

    const serialized = JSON.parse(
      serializeSidebarModulesAdmin(config)
    ) as Record<string, Record<string, boolean>>
    expect(serialized.superAdmin.ipBan).toBe(false)
    expect(serialized.admin).not.toHaveProperty('ipBan')
  })
})
