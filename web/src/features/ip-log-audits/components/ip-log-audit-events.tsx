import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber, formatTimestampToDate, formatTokens } from '@/lib/format'

import { getIPLogAuditEvents, type IPLogAuditEvent } from '../api'

type Props = {
  ip: string
}

const pageSize = 10

function getEventType(event: IPLogAuditEvent, t: (key: string) => string) {
  if (event.type === 2) return t('Consume')
  if (event.type === 5) return t('Error')
  if (event.type === 7) return t('Login')
  if (event.type === 3) return t('Manage')
  return t('Other')
}

export function IPLogAuditEvents(props: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['ip-log-audit-events', props.ip, page],
    queryFn: () => getIPLogAuditEvents(props.ip, page, pageSize),
  })
  const data = query.data?.data
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))

  if (query.isLoading) {
    return (
      <div className='text-muted-foreground p-4 text-sm'>{t('Loading')}</div>
    )
  }
  if (query.isError) {
    return (
      <div className='text-destructive p-4 text-sm'>
        {t('Failed to load IP log events')}
      </div>
    )
  }
  if (!data || data.items.length === 0) {
    return (
      <div className='text-muted-foreground p-4 text-sm'>
        {t('No IP log events found')}
      </div>
    )
  }

  return (
    <div className='bg-muted/20 space-y-3 border-t p-3'>
      <div className='text-muted-foreground text-xs'>
        {t('IP log events')}: {formatNumber(data.total)}
      </div>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Event time')}</TableHead>
              <TableHead>{t('Event type')}</TableHead>
              <TableHead>{t('User')}</TableHead>
              <TableHead>{t('Model')}</TableHead>
              <TableHead>{t('Request Domain')}</TableHead>
              <TableHead>{t('Quota')}</TableHead>
              <TableHead>{t('Tokens')}</TableHead>
              <TableHead>{t('Request ID')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((event) => (
              <TableRow
                key={`${event.created_at}-${event.request_id}-${event.type}`}
              >
                <TableCell className='whitespace-nowrap'>
                  {formatTimestampToDate(event.created_at)}
                </TableCell>
                <TableCell>{getEventType(event, t)}</TableCell>
                <TableCell>{event.username || t('Unknown')}</TableCell>
                <TableCell className='max-w-48 truncate'>
                  {event.model_name || t('Unknown')}
                </TableCell>
                <TableCell className='max-w-56 truncate font-mono text-xs'>
                  {event.request_host || '-'}
                </TableCell>
                <TableCell>{formatNumber(event.quota)}</TableCell>
                <TableCell className='whitespace-nowrap'>
                  {formatTokens(event.prompt_tokens + event.completion_tokens)}
                </TableCell>
                <TableCell className='max-w-48 truncate font-mono text-xs'>
                  {event.request_id || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className='flex items-center justify-end gap-2'>
          <span className='text-muted-foreground text-xs'>
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
  )
}
