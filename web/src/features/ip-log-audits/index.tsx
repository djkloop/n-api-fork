import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber, formatTimestampToDate } from '@/lib/format'

import { getIPLogAudits, type IPLogAudit, type IPLogAuditSort } from './api'
import { IPLogAuditDetails } from './components/ip-log-audit-details'
import { IPLogAuditEvents } from './components/ip-log-audit-events'

const pageSize = 20

function formatAuditType(
  audit: IPLogAudit,
  privateLabel: string,
  publicLabel: string
) {
  return audit.is_private ? privateLabel : publicLabel
}

export function IPLogAudits() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<IPLogAuditSort>('last_seen')
  const [page, setPage] = useState(1)
  const [selectedAudit, setSelectedAudit] = useState<IPLogAudit | null>(null)
  const [expandedIP, setExpandedIP] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['ip-log-audits', keyword, sort, page],
    queryFn: () => getIPLogAudits({ keyword, sort, page, pageSize }),
    refetchInterval: 60_000,
  })
  const data = query.data?.data
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))

  const updateKeyword = (value: string) => {
    setKeyword(value)
    setPage(1)
  }

  const updateSort = (value: string | null) => {
    if (
      value === 'last_seen' ||
      value === 'calls' ||
      value === 'errors' ||
      value === 'quota'
    ) {
      setSort(value)
      setPage(1)
    }
  }

  const summary = data?.summary

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>{t('IP Log Audit')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <div className='text-muted-foreground max-w-3xl text-sm'>
            {t('IP Log Audit description')}
          </div>

          <div className='grid gap-3 border-y py-3 sm:grid-cols-4'>
            <div>
              <div className='text-muted-foreground text-xs'>
                {t('IP addresses')}
              </div>
              <div className='text-lg font-semibold'>
                {formatNumber(summary?.ip_count)}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-xs'>
                {t('API calls')}
              </div>
              <div className='text-lg font-semibold'>
                {formatNumber(summary?.request_count)}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-xs'>{t('Errors')}</div>
              <div className='text-lg font-semibold'>
                {formatNumber(summary?.error_count)}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-xs'>
                {t('Last scan')}
              </div>
              <div className='text-sm font-semibold'>
                {summary?.last_scanned_at
                  ? formatTimestampToDate(summary.last_scanned_at)
                  : t('Not scanned yet')}
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row'>
            <Input
              aria-label={t('Search IP audit')}
              className='sm:max-w-sm'
              placeholder={t('Search IP, network, user, or model')}
              value={keyword}
              onChange={(event) => updateKeyword(event.target.value)}
            />
            <Select value={sort} onValueChange={updateSort}>
              <SelectTrigger className='sm:w-48' aria-label={t('Sort by')}>
                <SelectValue placeholder={t('Sort by')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='last_seen'>{t('Last seen')}</SelectItem>
                <SelectItem value='calls'>{t('Most calls')}</SelectItem>
                <SelectItem value='errors'>{t('Most errors')}</SelectItem>
                <SelectItem value='quota'>{t('Highest quota')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('IP address')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('API calls')}</TableHead>
                  <TableHead>{t('Errors')}</TableHead>
                  <TableHead>{t('Last seen')}</TableHead>
                  <TableHead>{t('Last user')}</TableHead>
                  <TableHead className='text-right'>{t('Details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((audit) => (
                  <Fragment key={audit.id}>
                    <TableRow>
                      <TableCell>
                        <div className='flex items-start gap-1'>
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            className='mt-[-2px] shrink-0'
                            aria-label={
                              expandedIP === audit.ip
                                ? t('Collapse IP records')
                                : t('Expand IP records')
                            }
                            aria-expanded={expandedIP === audit.ip}
                            title={
                              expandedIP === audit.ip
                                ? t('Collapse IP records')
                                : t('Expand IP records')
                            }
                            onClick={() =>
                              setExpandedIP((current) =>
                                current === audit.ip ? null : audit.ip
                              )
                            }
                          >
                            <ChevronRight
                              className={`size-4 transition-transform ${expandedIP === audit.ip ? 'rotate-90' : ''}`}
                            />
                          </Button>
                          <div className='min-w-0'>
                            <div className='font-mono'>{audit.ip}</div>
                            <div className='text-muted-foreground text-xs'>
                              {audit.network}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatAuditType(audit, t('Private'), t('Public'))}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {formatNumber(audit.request_count)}
                      </TableCell>
                      <TableCell>{formatNumber(audit.error_count)}</TableCell>
                      <TableCell>
                        {formatTimestampToDate(audit.last_seen_at)}
                      </TableCell>
                      <TableCell className='max-w-40 truncate'>
                        {audit.last_username || t('Unknown')}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          aria-label={t('View IP details')}
                          title={t('View IP details')}
                          onClick={() => setSelectedAudit(audit)}
                        >
                          <Eye className='size-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedIP === audit.ip && (
                      <TableRow>
                        <TableCell colSpan={7} className='p-0'>
                          <IPLogAuditEvents ip={audit.ip} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
            {query.isError && (
              <div className='text-destructive p-8 text-center text-sm'>
                {t('Failed to load IP audit data')}
              </div>
            )}
            {!query.isLoading &&
              !query.isError &&
              (data?.items.length ?? 0) === 0 && (
                <div className='text-muted-foreground p-8 text-center'>
                  {t('No IP audit records found')}
                </div>
              )}
          </div>

          {totalPages > 1 && (
            <div className='flex items-center justify-end gap-2'>
              <span className='text-muted-foreground text-sm'>
                {t('Page {{page}} of {{total}}', { page, total: totalPages })}
              </span>
              <Button
                variant='outline'
                size='icon-sm'
                aria-label={t('Previous page')}
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className='size-4' />
              </Button>
              <Button
                variant='outline'
                size='icon-sm'
                aria-label={t('Next page')}
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                <ChevronRight className='size-4' />
              </Button>
            </div>
          )}
        </div>
      </SectionPageLayout.Content>
      <Dialog
        open={selectedAudit !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAudit(null)
        }}
      >
        <DialogContent className='max-h-[min(760px,calc(100vh-2rem))] max-w-2xl overflow-y-auto'>
          {selectedAudit && <IPLogAuditDetails audit={selectedAudit} />}
        </DialogContent>
      </Dialog>
    </SectionPageLayout>
  )
}
