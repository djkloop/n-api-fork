import { api } from '@/lib/api'

export type IPLogAudit = {
  id: number
  ip: string
  network: string
  asn: number
  ip_version: number
  is_private: boolean
  log_count: number
  request_count: number
  consume_count: number
  error_count: number
  login_count: number
  manage_count: number
  prompt_tokens: number
  completion_tokens: number
  quota: number
  first_seen_at: number
  last_seen_at: number
  last_scanned_at: number
  last_user_id: number
  last_username: string
  last_model_name: string
  last_token_name: string
  banned: boolean
}

export type IPLogAuditSummary = {
  ip_count: number
  request_count: number
  error_count: number
  log_count: number
  last_scanned_at: number
}

export type IPLogAuditEvent = {
  id: number
  created_at: number
  type: number
  username: string
  model_name: string
  token_name: string
  quota: number
  prompt_tokens: number
  completion_tokens: number
  use_time: number
  request_id: string
}

type ApiResult<T> = {
  success: boolean
  message: string
  data: T
}

export type IPLogAuditPage = {
  page: number
  page_size: number
  total: number
  items: IPLogAudit[]
  summary: IPLogAuditSummary
}

export type IPLogAuditEventsPage = {
  page: number
  page_size: number
  total: number
  items: IPLogAuditEvent[]
}

export type IPLogAuditSort = 'last_seen' | 'calls' | 'errors' | 'quota'

export async function getIPLogAudits(params: {
  keyword?: string
  sort?: IPLogAuditSort
  page?: number
  pageSize?: number
}): Promise<ApiResult<IPLogAuditPage>> {
  const query = new URLSearchParams({
    p: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 20),
    sort: params.sort ?? 'last_seen',
  })
  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim())
  const response = await api.get(`/api/user/ip-log-audits?${query.toString()}`)
  const result = response.data as ApiResult<IPLogAuditPage>
  if (!result.success) throw new Error(result.message)
  return result
}

export async function getIPLogAuditEvents(
  ip: string,
  page = 1,
  pageSize = 10
): Promise<ApiResult<IPLogAuditEventsPage>> {
  const query = new URLSearchParams({
    p: String(page),
    page_size: String(pageSize),
  })
  const response = await api.get(
    `/api/user/ip-log-audits/${encodeURIComponent(ip)}/logs?${query.toString()}`
  )
  const result = response.data as ApiResult<IPLogAuditEventsPage>
  if (!result.success) throw new Error(result.message)
  return result
}
