import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { Dialog, DialogContent } from '@/components/ui/dialog'

import type { IPLogAudit } from '../api'
import { IPLogAuditDetails } from '../components/ip-log-audit-details'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const audit: IPLogAudit = {
  id: 1,
  ip: '203.0.113.10',
  network: '203.0.113.0/24',
  asn: 64500,
  ip_version: 4,
  is_private: false,
  log_count: 4,
  request_count: 3,
  consume_count: 2,
  error_count: 1,
  login_count: 0,
  manage_count: 0,
  prompt_tokens: 1200,
  completion_tokens: 800,
  quota: 4500,
  first_seen_at: 1700000000,
  last_seen_at: 1700000300,
  last_scanned_at: 1700000400,
  last_user_id: 9,
  last_username: 'audit-user',
  last_model_name: 'audit-model',
  last_token_name: 'audit-token',
  banned: true,
}

describe('IPLogAuditDetails', () => {
  test('shows the IP identity and cumulative request metrics', () => {
    render(
      <Dialog open>
        <DialogContent>
          <IPLogAuditDetails audit={audit} />
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByText(audit.ip)).toBeInTheDocument()
    expect(screen.getByText('This IP is currently blocked')).toBeInTheDocument()
    expect(screen.getByText('audit-user')).toBeInTheDocument()
    expect(screen.getByText('audit-model')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
