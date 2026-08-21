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
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type { UsageLog } from '../../../data/schema'
import { useCommonLogsColumns } from '../common-logs-columns'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

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
      request_host: 'ai.pkcfcf.cn',
    },
  }),
  request_id: 'request-domain-column',
  upstream_request_id: '',
}

function RequestDomainColumnProbe(props: { isAdmin: boolean; row?: UsageLog }) {
  const columns = useCommonLogsColumns(props.isAdmin)
  const table = useReactTable({
    columns,
    data: [props.row ?? log],
    getCoreRowModel: getCoreRowModel(),
  })
  const column = table.getColumn('request_host')
  const cell = table
    .getRowModel()
    .rows[0]?.getAllCells()
    .find((item) => item.column.id === 'request_host')

  if (!column || !cell) return null

  return (
    <div>
      <span>{String(column.columnDef.header)}</span>
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </div>
  )
}

describe('usage log request domain column', () => {
  test('shows the request domain in the administrator table', () => {
    render(<RequestDomainColumnProbe isAdmin />)

    expect(screen.getByText('Request Domain')).toBeInTheDocument()
    expect(screen.getByText('ai.pkcfcf.cn')).toBeInTheDocument()
  })

  test('shows a placeholder for historical logs without a request domain', () => {
    render(
      <RequestDomainColumnProbe
        isAdmin
        row={{ ...log, other: JSON.stringify({ admin_info: {} }) }}
      />
    )

    expect(screen.getByText('Request Domain')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('does not expose the request domain column in the user table', () => {
    render(<RequestDomainColumnProbe isAdmin={false} />)

    expect(screen.queryByText('Request Domain')).not.toBeInTheDocument()
    expect(screen.queryByText('ai.pkcfcf.cn')).not.toBeInTheDocument()
  })
})
