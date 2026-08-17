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
  window_hours: z.number().int().min(1).max(8760),
  duration_hours: z.number().int().min(0).max(8760),
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  enabled: 1,
  threshold: 5,
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
              {t('Enable automatic IP blocking')}
            </div>
            <p className='text-muted-foreground text-sm'>
              {t(
                'Automatically block an IP after repeated successful registrations.'
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
        <div className='grid gap-4 sm:grid-cols-3'>
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
      </SettingsForm>
    </SettingsSection>
  )
}
