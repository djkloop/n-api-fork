/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { Channel, ChannelModelTestItem } from '../../../types'
import { ChannelTestDialogContent } from '../channel-test-dialog'

const testItems: ChannelModelTestItem[] = [
  {
    id: 1,
    channel_id: 7,
    model: 'gpt-test',
    success: false,
    response_time: 420,
    tested_at: 1_700_000_003,
    message: 'upstream unavailable',
    error_code: 'upstream_error',
    history: [
      {
        id: 3,
        item_id: 1,
        channel_id: 7,
        success: false,
        response_time: 420,
        tested_at: 1_700_000_003,
        message: 'upstream unavailable',
        error_code: 'upstream_error',
      },
      {
        id: 2,
        item_id: 1,
        channel_id: 7,
        success: true,
        response_time: 180,
        tested_at: 1_700_000_002,
        message: '',
        error_code: '',
      },
      {
        id: 1,
        item_id: 1,
        channel_id: 7,
        success: true,
        response_time: 160,
        tested_at: 1_700_000_001,
        message: '',
        error_code: '',
      },
    ],
  },
]

const apiMocks = vi.hoisted(() => ({
  getChannelModelTestResults: vi.fn(),
  testChannel: vi.fn(),
  updateChannel: vi.fn(),
}))

vi.mock('../../../api', () => apiMocks)

const channel: Channel = {
  id: 7,
  type: 1,
  key: '',
  openai_organization: null,
  test_model: null,
  status: 1,
  name: 'History channel',
  weight: 1,
  created_time: 1_700_000_000,
  test_time: 0,
  response_time: 0,
  base_url: null,
  other: '',
  balance: 0,
  balance_updated_time: 0,
  models: 'gpt-test',
  group: 'default',
  used_quota: 0,
  model_mapping: null,
  status_code_mapping: null,
  priority: 0,
  auto_ban: 1,
  other_info: '',
  tag: null,
  setting: null,
  param_override: null,
  header_override: null,
  remark: '',
  max_input_tokens: 0,
  channel_info: {
    is_multi_key: false,
    multi_key_size: 0,
    multi_key_polling_index: 0,
    multi_key_mode: 'random',
  },
  settings: '{}',
}

describe('channel model test history', () => {
  beforeEach(() => {
    apiMocks.getChannelModelTestResults.mockReset()
    apiMocks.getChannelModelTestResults.mockResolvedValue({
      success: true,
      data: testItems,
    })
    apiMocks.testChannel.mockReset()
    apiMocks.updateChannel.mockReset()
  })

  test('expands a model row and shows its three persisted results', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ChannelTestDialogContent
          open
          onOpenChange={() => undefined}
          currentRow={channel}
        />
      </QueryClientProvider>
    )

    const toggle = await screen.findByRole('button', {
      name: 'Toggle test history for gpt-test',
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(
      await screen.findByRole('region', { name: 'Recent test results' })
    ).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'Toggle test history for gpt-test',
      })
    ).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('upstream unavailable')).toBeVisible()
    expect(screen.getAllByText('Success')).toHaveLength(2)
    expect(screen.getAllByText('Failed')).toHaveLength(2)
  })

  test('does not let a late initial history response replace a newer test result', async () => {
    let resolveInitialHistory: ((value: unknown) => void) | undefined
    apiMocks.getChannelModelTestResults.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialHistory = resolve
        })
    )
    const latestItem: ChannelModelTestItem = {
      ...testItems[0],
      success: false,
      response_time: 90,
      tested_at: 1_700_000_010,
      message: 'latest failure',
      error_code: 'latest_error',
      history: [
        {
          ...testItems[0].history[0],
          id: 10,
          response_time: 90,
          tested_at: 1_700_000_010,
          message: 'latest failure',
          error_code: 'latest_error',
        },
      ],
    }
    apiMocks.testChannel.mockResolvedValueOnce({
      success: false,
      message: latestItem.message,
      error_code: latestItem.error_code,
      data: {
        response_time: latestItem.response_time,
        test_result: latestItem,
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ChannelTestDialogContent
          open
          onOpenChange={() => undefined}
          currentRow={channel}
        />
      </QueryClientProvider>
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Test Connection' })
    )
    await waitFor(() => {
      const modelRow = screen.getByText('gpt-test').closest('tr')
      if (!modelRow) {
        throw new Error('model row not found')
      }
      expect(within(modelRow).getByText('latest failure')).toBeVisible()
    })

    resolveInitialHistory?.({ success: true, data: testItems })

    await waitFor(() => {
      const modelRow = screen.getByText('gpt-test').closest('tr')
      if (!modelRow) {
        throw new Error('model row not found')
      }
      expect(within(modelRow).getByText('latest failure')).toBeVisible()
      expect(
        within(modelRow).queryByText('upstream unavailable')
      ).not.toBeInTheDocument()
    })
  })
})
