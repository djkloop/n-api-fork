import { useTranslation } from 'react-i18next'

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatNumber, formatTimestampToDate, formatTokens } from '@/lib/format'

import type { IPLogAudit } from '../api'

type DetailProps = {
  audit: IPLogAudit
}

function formatSeen(timestamp: number) {
  return formatTimestampToDate(timestamp)
}

export function IPLogAuditDetails(props: DetailProps) {
  const { t } = useTranslation()
  const audit = props.audit
  const values = [
    [t('Network'), audit.network || t('Unknown')],
    [t('IP version'), audit.ip_version === 4 ? 'IPv4' : 'IPv6'],
    [t('Address type'), audit.is_private ? t('Private') : t('Public')],
    [t('ASN'), audit.asn > 0 ? String(audit.asn) : t('Unavailable')],
    [t('First seen'), formatSeen(audit.first_seen_at)],
    [t('Last seen'), formatSeen(audit.last_seen_at)],
    [t('Successful calls'), formatNumber(audit.consume_count)],
    [t('Errors'), formatNumber(audit.error_count)],
    [t('Log records'), formatNumber(audit.log_count)],
    [t('Prompt tokens'), formatTokens(audit.prompt_tokens)],
    [t('Completion tokens'), formatTokens(audit.completion_tokens)],
    [t('Quota'), formatNumber(audit.quota)],
    [t('Last user'), audit.last_username || t('Unknown')],
    [t('Last model'), audit.last_model_name || t('Unknown')],
    [t('Last token'), audit.last_token_name || t('Unknown')],
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle className='font-mono'>{audit.ip}</DialogTitle>
        <DialogDescription>
          {audit.banned
            ? t('This IP is currently blocked')
            : t('This IP is not blocked')}
        </DialogDescription>
      </DialogHeader>
      <dl className='grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
        {values.map(([label, value]) => (
          <div key={label} className='min-w-0 border-b pb-2'>
            <dt className='text-muted-foreground text-xs'>{label}</dt>
            <dd className='mt-1 truncate text-sm font-medium' title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  )
}
