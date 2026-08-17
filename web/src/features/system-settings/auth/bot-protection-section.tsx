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
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { RegistrationProtectionSection } from './registration-protection-section'

const botProtectionSchema = z.object({
  RegistrationCaptchaEnabled: z.boolean(),
  RegistrationCaptchaWeights: z.string(),
  TurnstileCheckEnabled: z.boolean(),
  TurnstileSiteKey: z.string().optional(),
  TurnstileSecretKey: z.string().optional(),
})

type BotProtectionFormValues = z.infer<typeof botProtectionSchema>

type BotProtectionSectionProps = {
  defaultValues: BotProtectionFormValues
}

const captchaWeightTypes = [
  { key: 'click', label: 'Click captcha' },
  { key: 'slide', label: 'Slide captcha' },
  { key: 'drag', label: 'Drag captcha' },
  { key: 'rotate', label: 'Rotate captcha' },
] as const

function getCaptchaWeight(value: string, type: string): string {
  const entry = value
    .split(',')
    .find((item) => item.trim().startsWith(`${type}:`))
  return entry?.split(':')[1]?.trim() ?? '0'
}

function setCaptchaWeight(value: string, type: string, weight: string): string {
  const weights = new Map(
    value.split(',').flatMap((item) => {
      const [key, currentWeight] = item.split(':').map((part) => part.trim())
      return key && currentWeight ? [[key, currentWeight]] : []
    })
  )
  weights.set(type, weight)
  return captchaWeightTypes
    .map(({ key }) => `${key}:${weights.get(key) ?? '0'}`)
    .join(',')
}

export function BotProtectionSection({
  defaultValues,
}: BotProtectionSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<BotProtectionFormValues>({
    resolver: zodResolver(botProtectionSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const onSubmit = async (data: BotProtectionFormValues) => {
    const updates = Object.entries(data).filter(
      ([key, value]) =>
        value !== defaultValues[key as keyof BotProtectionFormValues]
    )

    for (const [key, value] of updates) {
      await updateOption.mutateAsync({ key, value: value ?? '' })
    }
  }

  return (
    <>
      <SettingsSection title={t('Bot Protection')}>
        <Form {...form}>
          <SettingsForm
            onSubmit={form.handleSubmit(onSubmit)}
            autoComplete='off'
          >
            <SettingsPageFormActions
              onSave={form.handleSubmit(onSubmit)}
              isSaving={updateOption.isPending}
            />
            <FormField
              control={form.control}
              name='RegistrationCaptchaEnabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable image captcha')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Protect password registration with a locally generated image captcha'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <FormField
              control={form.control}
              name='RegistrationCaptchaWeights'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Captcha type weights')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Comma-separated weights for click, slide, drag, and rotate captcha types'
                    )}
                  </FormDescription>
                  <FormControl>
                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                      {captchaWeightTypes.map(({ key, label }) => (
                        <div key={key} className='grid gap-1'>
                          <FormLabel className='text-xs'>{t(label)}</FormLabel>
                          <Input
                            type='number'
                            min={0}
                            max={100}
                            step={1}
                            inputMode='numeric'
                            value={getCaptchaWeight(field.value, key)}
                            onChange={(event) =>
                              field.onChange(
                                setCaptchaWeight(
                                  field.value,
                                  key,
                                  event.target.value
                                )
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='TurnstileCheckEnabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable Turnstile')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Protect login and registration with Cloudflare Turnstile'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />

            <FormField
              control={form.control}
              name='TurnstileSiteKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Site Key')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Your Turnstile site key')}
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='TurnstileSecretKey'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Secret Key')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={t('Your Turnstile secret key')}
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsForm>
        </Form>
      </SettingsSection>
      <RegistrationProtectionSection />
    </>
  )
}
