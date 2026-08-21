import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { getIPLogAuditEvents } from '../api'
import { IPLogAuditEvents } from '../components/ip-log-audit-events'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../api', () => ({
  getIPLogAuditEvents: vi.fn(),
}))

describe('IPLogAuditEvents', () => {
  test('shows the domain used for the audited request', async () => {
    vi.mocked(getIPLogAuditEvents).mockResolvedValue({
      success: true,
      message: '',
      data: {
        page: 1,
        page_size: 10,
        total: 1,
        items: [
          {
            id: 1,
            created_at: 1700000000,
            type: 2,
            username: 'audit-user',
            model_name: 'gpt-audit',
            token_name: 'audit-token',
            quota: 100,
            prompt_tokens: 20,
            completion_tokens: 10,
            use_time: 1,
            request_id: 'request-domain-audit',
            request_host: 'ai.pkcfcf.cn',
          },
        ],
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <IPLogAuditEvents ip='192.0.2.10' />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Request Domain')).toBeInTheDocument()
    expect(screen.getByText('ai.pkcfcf.cn')).toBeInTheDocument()
  })
})
