import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { UsageLog } from '../../../data/schema'
import { DetailsDialog } from '../details-dialog'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const log: UsageLog = {
  id: 1,
  user_id: 2,
  created_at: 1700000000,
  type: 2,
  content: '',
  username: 'audit-user',
  token_name: 'audit-token',
  model_name: 'gpt-audit',
  quota: 100,
  prompt_tokens: 20,
  completion_tokens: 10,
  use_time: 1,
  is_stream: false,
  channel: 3,
  channel_name: 'channel-a',
  token_id: 4,
  group: 'default',
  ip: '192.0.2.10',
  other: JSON.stringify({
    admin_info: {
      request_host: 'cybertruckai.top',
    },
  }),
  request_id: 'request-domain-details',
  upstream_request_id: '',
}

describe('usage log request domain', () => {
  test('shows the request domain to administrators', () => {
    render(<DetailsDialog log={log} isAdmin open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Request Domain')).toBeInTheDocument()
    expect(screen.getByText('cybertruckai.top')).toBeInTheDocument()
  })
})
