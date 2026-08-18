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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  getRegistrationProtectionSetting,
  updateRegistrationProtectionSetting,
} from '../api'
import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'

const schema = z.object({
  enabled: z.number().int().min(0).max(1),
  threshold: z.number().int().min(1).max(10000),
  subnet_threshold: z.number().int().min(0).max(1000000),
  asn_threshold: z.number().int().min(0).max(1000000),
  blocked_asns: z.string().max(4096),
  window_hours: z.number().int().min(1).max(8760),
  duration_hours: z.number().int().min(0).max(8760),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  enabled: 1,
  threshold: 5,
  subnet_threshold: 20,
  asn_threshold: 0,
  blocked_asns: '',
  window_hours: 24,
  duration_hours: 24,
}

export function RegistrationProtectionSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['registration-protection-setting'],
    queryFn: getRegistrationProtectionSetting,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const mutation = useMutation({
    mutationFn: async (setting: FormValues) => {
      const result = await updateRegistrationProtectionSetting(setting)
      if (!result.success) throw new Error(result.message)
      return result
    },
    onSuccess: () => {
      toast.success(t('Registration protection settings saved'))
      queryClient.invalidateQueries({
        queryKey: ['registration-protection-setting'],
      })
    },
    onError: (error) => toast.error(error.message),
  })

  useEffect(() => {
    if (query.data?.success && query.data.data) {
      form.reset(query.data.data)
    }
  }, [form, query.data])

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values)
  }

  return (
    <SettingsSection title={t('Registration IP Protection')}>
      <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
        <SettingsPageFormActions
          onSave={form.handleSubmit(onSubmit)}
          isSaving={mutation.isPending}
        />
        <SettingsSwitchItem>
          <SettingsSwitchContent>
            <div className='font-medium'>
              {t('Enable registration network protection')}
            </div>
            <p className='text-muted-foreground text-sm'>
              {t(
                'Detect rotating proxy registrations by IP, subnet, and optional local ASN data.'
              )}
            </p>
          </SettingsSwitchContent>
          <Switch
            checked={form.watch('enabled') === 1}
            onCheckedChange={(checked) =>
              form.setValue('enabled', checked ? 1 : 0)
            }
          />
        </SettingsSwitchItem>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <label className='grid gap-2 text-sm font-medium'>
            {t('Registration threshold')}
            <Input
              type='number'
              min={1}
              max={10000}
              {...form.register('threshold', { valueAsNumber: true })}
            />
            <span className='text-muted-foreground text-xs font-normal'>
              {t('Successful registrations from one IP before blocking.')}
            </span>
          </label>
          <label className='grid gap-2 text-sm font-medium'>
            {t('Subnet threshold')}
            <Input
              type='number'
              min={0}
              max={1000000}
              {...form.register('subnet_threshold', { valueAsNumber: true })}
            />
            <span className='text-muted-foreground text-xs font-normal'>
              {t(
                'Successful registrations from one IPv4 /24 or IPv6 /48 network. Set to 0 to disable.'
              )}
            </span>
          </label>
          <label className='grid gap-2 text-sm font-medium'>
            {t('ASN threshold')}
            <Input
              type='number'
              min={0}
              max={1000000}
              {...form.register('asn_threshold', { valueAsNumber: true })}
            />
            <span className='text-muted-foreground text-xs font-normal'>
              {t(
                'Successful registrations from one ASN. Set to 0 to disable; use carefully for carrier networks.'
              )}
            </span>
          </label>
          <label className='grid gap-2 text-sm font-medium sm:col-span-2 lg:col-span-3'>
            {t('Blocked ASNs')}
            <Input
              placeholder='200373,26548'
              {...form.register('blocked_asns')}
            />
            <span className='text-muted-foreground text-xs font-normal'>
              {t('Comma-separated ASN numbers, for example: 200373,26548.')}
            </span>
          </label>
          <label className='grid gap-2 text-sm font-medium'>
            {t('Detection window (hours)')}
            <Input
              type='number'
              min={1}
              max={8760}
              {...form.register('window_hours', { valueAsNumber: true })}
            />
          </label>
          <label className='grid gap-2 text-sm font-medium'>
            {t('Automatic ban duration (hours)')}
            <Input
              type='number'
              min={0}
              max={8760}
              {...form.register('duration_hours', { valueAsNumber: true })}
            />
            <span className='text-muted-foreground text-xs font-normal'>
              {t('Set to 0 for a permanent ban.')}
            </span>
          </label>
        </div>
        {query.data?.data && (
          <div className='text-muted-foreground text-sm'>
            <span className='text-foreground font-medium'>
              {query.data.data.asn_database_available
                ? t('Local ASN database available')
                : t('Local ASN database unavailable')}
            </span>
            {!query.data.data.asn_database_available && (
              <span className='ml-2'>
                {t(
                  'Set ASN_DB_PATH to a local GeoLite2-ASN MMDB file and restart the service.'
                )}
              </span>
            )}
          </div>
        )}
      </SettingsForm>
    </SettingsSection>
  )
}
