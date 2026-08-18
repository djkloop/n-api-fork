import { createFileRoute, redirect } from '@tanstack/react-router'

import { IPLogAudits } from '@/features/ip-log-audits'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/ip-log-audits/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({ to: '/403' })
    }
  },
  component: IPLogAudits,
})
