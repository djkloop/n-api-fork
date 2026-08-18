import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  ShieldBan,
} from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { createIPBan } from '@/features/ip-bans/api'
import { formatNumber, formatTimestampToDate } from '@/lib/format'
import { getPageNumbers } from '@/lib/utils'

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
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<IPLogAuditSort>('last_seen')
  const [page, setPage] = useState(1)
  const [selectedAudit, setSelectedAudit] = useState<IPLogAudit | null>(null)
  const [pendingBanAudit, setPendingBanAudit] = useState<IPLogAudit | null>(
    null
  )
  const [expandedIP, setExpandedIP] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['ip-log-audits', keyword, sort, page],
    queryFn: () => getIPLogAudits({ keyword, sort, page, pageSize }),
    refetchInterval: 60_000,
    placeholderData: (previousData) => previousData,
  })
  const banMutation = useMutation({
    mutationFn: (audit: IPLogAudit) =>
      createIPBan({
        ip: audit.ip,
        reason: t('Manual block'),
        block_outbound: false,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      }),
    onSuccess: () => {
      toast.success(t('IP blocked successfully'))
      setPendingBanAudit(null)
      void queryClient.invalidateQueries({ queryKey: ['ip-log-audits'] })
      void queryClient.invalidateQueries({ queryKey: ['ip-bans'] })
    },
    onError: () => toast.error(t('Failed to block IP')),
  })
  const data = query.data?.data
  const totalPages = Math.max(
    1,
    Math.ceil((data?.total ?? 0) / (data?.page_size || pageSize))
  )
  const pageNumbers = getPageNumbers(page, totalPages)

  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages)
  }, [data, page, totalPages])

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
  let sortLabel = t('Last seen')
  if (sort === 'calls') sortLabel = t('Most calls')
  if (sort === 'errors') sortLabel = t('Most errors')
  if (sort === 'quota') sortLabel = t('Highest quota')

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>{t('IP Log Audit')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex h-full min-h-0 flex-col gap-4'>
          <div className='text-muted-foreground max-w-3xl shrink-0 text-sm'>
            {t('IP Log Audit description')}
          </div>

          <div className='grid shrink-0 gap-3 border-y py-3 sm:grid-cols-4'>
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

          <div className='flex shrink-0 flex-col gap-3 sm:flex-row'>
            <Input
              aria-label={t('Search IP audit')}
              className='sm:max-w-sm'
              placeholder={t('Search IP, network, user, or model')}
              value={keyword}
              onChange={(event) => updateKeyword(event.target.value)}
            />
            <Select value={sort} onValueChange={updateSort}>
              <SelectTrigger className='sm:w-48' aria-label={t('Sort by')}>
                <SelectValue placeholder={t('Sort by')}>
                  {sortLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='last_seen'>{t('Last seen')}</SelectItem>
                <SelectItem value='calls'>{t('Most calls')}</SelectItem>
                <SelectItem value='errors'>{t('Most errors')}</SelectItem>
                <SelectItem value='quota'>{t('Highest quota')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border'>
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
                            <div className='flex items-center gap-1'>
                              <span className='font-mono'>{audit.ip}</span>
                              {!audit.banned && (
                                <Button
                                  variant='destructive'
                                  size='icon-xs'
                                  aria-label={t('Block IP {{ip}}', {
                                    ip: audit.ip,
                                  })}
                                  title={t('Block IP {{ip}}', {
                                    ip: audit.ip,
                                  })}
                                  onClick={() => setPendingBanAudit(audit)}
                                >
                                  <ShieldBan className='size-3' />
                                </Button>
                              )}
                            </div>
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
                          size='sm'
                          aria-label={t('View IP details')}
                          title={t('View IP details')}
                          onClick={() => setSelectedAudit(audit)}
                        >
                          <Eye className='size-4' />
                          {t('Details')}
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
            <div className='flex shrink-0 items-center justify-between gap-3 overflow-x-auto'>
              <span className='text-muted-foreground shrink-0 text-sm'>
                {t('Page {{page}} of {{total}}', {
                  page,
                  total: totalPages,
                })}
              </span>
              <div className='flex shrink-0 items-center gap-1'>
                <Button
                  variant='outline'
                  size='icon-sm'
                  className='hidden sm:inline-flex'
                  aria-label={t('Go to first page')}
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  <ChevronsLeft className='size-4' />
                </Button>
                <Button
                  variant='outline'
                  size='icon-sm'
                  aria-label={t('Go to previous page')}
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className='size-4' />
                </Button>
                {pageNumbers.map((pageNumber, index) =>
                  typeof pageNumber === 'string' ? (
                    <span
                      key={`ellipsis-${pageNumbers[index - 1] ?? 'start'}`}
                      className='text-muted-foreground px-1 text-sm'
                      aria-hidden='true'
                    >
                      ...
                    </span>
                  ) : (
                    <Button
                      key={pageNumber}
                      variant={page === pageNumber ? 'default' : 'outline'}
                      size='icon-sm'
                      aria-label={t('Go to page {{page}}', {
                        page: pageNumber,
                      })}
                      aria-current={page === pageNumber ? 'page' : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  )
                )}
                <Button
                  variant='outline'
                  size='icon-sm'
                  aria-label={t('Go to next page')}
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <ChevronRight className='size-4' />
                </Button>
                <Button
                  variant='outline'
                  size='icon-sm'
                  className='hidden sm:inline-flex'
                  aria-label={t('Go to last page')}
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  <ChevronsRight className='size-4' />
                </Button>
              </div>
            </div>
          )}
        </div>
        {selectedAudit && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) setSelectedAudit(null)
            }}
          >
            <DialogContent className='max-h-[min(760px,calc(100vh-2rem))] max-w-2xl overflow-y-auto'>
              <IPLogAuditDetails audit={selectedAudit} />
            </DialogContent>
          </Dialog>
        )}
        <AlertDialog
          open={pendingBanAudit !== null}
          onOpenChange={(open) => {
            if (!open && !banMutation.isPending) setPendingBanAudit(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('Block IP')}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingBanAudit &&
                  t(
                    'Block registration from {{ip}} for 24 hours? You can unblock it later from IP Blackroom.',
                    { ip: pendingBanAudit.ip }
                  )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={banMutation.isPending}>
                {t('Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant='destructive'
                disabled={!pendingBanAudit || banMutation.isPending}
                onClick={() => {
                  if (pendingBanAudit) banMutation.mutate(pendingBanAudit)
                }}
              >
                <ShieldBan className='size-4' />
                {t('Block IP')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
