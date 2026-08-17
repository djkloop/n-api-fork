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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldBan, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { createIPBan, getIPBans, releaseIPBan, type IPBan } from './api'

const formatTime = (timestamp: number, permanentLabel: string) =>
  timestamp === 0 ? permanentLabel : new Date(timestamp * 1000).toLocaleString()

export function IPBans() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [ip, setIp] = useState('')
  const [reason, setReason] = useState('')
  const [blockOutbound, setBlockOutbound] = useState(false)
  const [hours, setHours] = useState('24')

  const query = useQuery({
    queryKey: ['ip-bans', keyword],
    queryFn: () => getIPBans(keyword),
  })
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ip-bans'] })
  const createMutation = useMutation({
    mutationFn: createIPBan,
    onSuccess: () => {
      toast.success(t('IP blocked successfully'))
      setIp('')
      setReason('')
      setBlockOutbound(false)
      invalidate()
    },
    onError: () => toast.error(t('Failed to block IP')),
  })
  const releaseMutation = useMutation({
    mutationFn: releaseIPBan,
    onSuccess: () => {
      toast.success(t('IP unblocked successfully'))
      invalidate()
    },
    onError: () => toast.error(t('Failed to unblock IP')),
  })

  const submit = () => {
    const duration = Number(hours)
    if (!ip.trim() || !Number.isInteger(duration) || duration < 0) {
      toast.error(t('Enter a valid IP and duration'))
      return
    }
    createMutation.mutate({
      ip: ip.trim(),
      reason: reason.trim() || t('Manual block'),
      block_outbound: blockOutbound,
      expires_at:
        duration === 0 ? 0 : Math.floor(Date.now() / 1000) + duration * 3600,
    })
  }

  const getStatusText = (status: IPBan['display_status']) => {
    if (status === 'active') return t('Active')
    if (status === 'expired') return t('Expired')
    return t('Released')
  }

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>{t('IP Blackroom')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <div className='grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_180px_auto]'>
            <Input
              aria-label={t('IP address')}
              placeholder={t('IP address')}
              value={ip}
              onChange={(event) => setIp(event.target.value)}
            />
            <Input
              aria-label={t('Reason')}
              placeholder={t('Reason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Input
              aria-label={t('Duration (hours)')}
              type='number'
              min='0'
              placeholder={t('Duration (hours)')}
              value={hours}
              onChange={(event) => setHours(event.target.value)}
            />
            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={blockOutbound}
                onCheckedChange={(checked) =>
                  setBlockOutbound(checked === true)
                }
              />
              {t('Also block outbound SSRF access')}
            </label>
            <Button onClick={submit} disabled={createMutation.isPending}>
              <ShieldBan className='mr-2 size-4' />
              {t('Block IP')}
            </Button>
          </div>
          <div className='flex gap-2'>
            <Input
              aria-label={t('Search IP bans')}
              placeholder={t('Search IP bans')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('IP address')}</TableHead>
                  <TableHead>{t('Reason')}</TableHead>
                  <TableHead>{t('Source')}</TableHead>
                  <TableHead>{t('SSRF')}</TableHead>
                  <TableHead>{t('Expires at')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className='text-right'>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.data.items ?? []).map((ban: IPBan) => (
                  <TableRow key={ban.id}>
                    <TableCell className='font-mono'>{ban.ip}</TableCell>
                    <TableCell>{ban.reason}</TableCell>
                    <TableCell>
                      {ban.source === 'automatic'
                        ? t('Automatic')
                        : t('Manual')}
                    </TableCell>
                    <TableCell>
                      {ban.block_outbound ? t('Enabled') : t('Disabled')}
                    </TableCell>
                    <TableCell>
                      {formatTime(ban.expires_at, t('Permanent'))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ban.display_status === 'active'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {getStatusText(ban.display_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      {ban.display_status === 'active' && (
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => releaseMutation.mutate(ban.id)}
                          disabled={releaseMutation.isPending}
                        >
                          <ShieldCheck className='mr-2 size-4' />
                          {t('Unblock')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!query.isLoading && (query.data?.data.items.length ?? 0) === 0 && (
              <div className='text-muted-foreground p-8 text-center'>
                {t('No IP bans found')}
              </div>
            )}
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
