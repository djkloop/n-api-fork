import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { createIPBan } from '@/features/ip-bans/api'

import { IPLogAudits } from '..'
import { getIPLogAudits, type IPLogAudit } from '../api'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      if (!values) return key
      return Object.entries(values).reduce(
        (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
        key
      )
    },
  }),
}))

vi.mock('../api', () => ({
  getIPLogAudits: vi.fn(),
  getIPLogAuditEvents: vi.fn(),
}))

vi.mock('@/features/ip-bans/api', () => ({
  createIPBan: vi.fn(),
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
  banned: false,
}

let queryClient: QueryClient

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <IPLogAudits />
    </QueryClientProvider>
  )
}

describe('IPLogAudits actions', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.mocked(getIPLogAudits).mockResolvedValue({
      success: true,
      message: '',
      data: {
        page: 1,
        page_size: 20,
        total: 1,
        items: [audit],
        summary: {
          ip_count: 1,
          request_count: 3,
          error_count: 1,
          log_count: 4,
          last_scanned_at: 1700000400,
        },
      },
    })
    vi.mocked(createIPBan).mockResolvedValue({
      success: true,
      message: '',
      data: {
        id: 8,
        ip: audit.ip,
        reason: 'Manual block',
        source: 'manual',
        expires_at: 1700086400,
        block_outbound: false,
        created_at: 1700000000,
        display_status: 'active',
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  test('opens IP details from a visible details action', async () => {
    const user = userEvent.setup()
    renderPage()

    const detailsButton = await screen.findByRole('button', {
      name: 'View IP details',
    })
    expect(detailsButton).toHaveTextContent('Details')

    await user.click(detailsButton)

    expect(await screen.findByRole('dialog')).toHaveTextContent(audit.ip)
    expect(screen.getByText('audit-model')).toBeInTheDocument()
  })

  test('shows the translated current sort label instead of its raw value', async () => {
    renderPage()

    await screen.findByText(audit.ip)
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent(
      'Last seen'
    )
    expect(
      screen.getByRole('combobox', { name: 'Sort by' })
    ).not.toHaveTextContent('last_seen')
  })

  test('requires confirmation before blocking an IP for 24 hours', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: `Block IP ${audit.ip}` })
    )

    const confirmation = await screen.findByRole('alertdialog')
    expect(confirmation).toHaveTextContent(
      `Block registration from ${audit.ip} for 24 hours?`
    )
    expect(createIPBan).not.toHaveBeenCalled()

    await user.click(
      within(confirmation).getByRole('button', { name: 'Block IP' })
    )

    await waitFor(() => {
      expect(createIPBan).toHaveBeenCalledWith({
        ip: audit.ip,
        reason: 'Manual block',
        block_outbound: false,
        expires_at: expect.any(Number),
      })
    })
  })
})
