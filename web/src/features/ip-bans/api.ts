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
import { api } from '@/lib/api'

export type IPBan = {
  id: number
  ip: string
  reason: string
  source: 'manual' | 'automatic'
  expires_at: number
  block_outbound: boolean
  created_at: number
  display_status: 'active' | 'expired' | 'released'
}

type ApiResult<T> = {
  success: boolean
  message: string
  data: T
}

type PageData = {
  items: IPBan[]
  total: number
}

export async function getIPBans(keyword = ''): Promise<ApiResult<PageData>> {
  const query = new URLSearchParams({ p: '1', page_size: '100' })
  if (keyword.trim()) query.set('keyword', keyword.trim())
  const response = await api.get(`/api/user/ip-bans?${query.toString()}`)
  const result = response.data as ApiResult<PageData>
  if (!result.success) throw new Error(result.message)
  return result
}

export async function createIPBan(data: {
  ip: string
  reason: string
  block_outbound: boolean
  expires_at: number
}) {
  const response = await api.post('/api/user/ip-bans', data)
  const result = response.data as ApiResult<IPBan>
  if (!result.success) throw new Error(result.message)
  return result
}

export async function releaseIPBan(id: number) {
  const response = await api.delete(`/api/user/ip-bans/${id}`)
  const result = response.data as ApiResult<{ id: number }>
  if (!result.success) throw new Error(result.message)
  return result
}
