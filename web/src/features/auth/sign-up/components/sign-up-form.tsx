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
import GoCaptcha from 'go-captcha-react'
import { Loader2, RefreshCw } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { PasswordInput } from '@/components/password-input'
import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getRegistrationCaptcha,
  register,
  wechatLoginByCode,
} from '@/features/auth/api'
import { LegalConsent } from '@/features/auth/components/legal-consent'
import { OAuthProviders } from '@/features/auth/components/oauth-providers'
import { registerFormSchema } from '@/features/auth/constants'
import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'
import { useEmailVerification } from '@/features/auth/hooks/use-email-verification'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'
import {
  getAffiliateCode,
  saveAffiliateCode,
} from '@/features/auth/lib/storage'
import type {
  RegisterPayload,
  RegistrationCaptcha,
} from '@/features/auth/types'
import { useStatus } from '@/hooks/use-status'
import { isAuthBundle } from '@/lib/api'
import { getServerErrorMessageKey } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [agreedToLegal, setAgreedToLegal] = useState(false)
  const [wechatCode, setWeChatCode] = useState('')
  const [isWeChatDialogOpen, setIsWeChatDialogOpen] = useState(false)
  const [isWeChatSubmitting, setIsWeChatSubmitting] = useState(false)
  const [turnstileWidgetKey, setTurnstileWidgetKey] = useState(0)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaType, setCaptchaType] =
    useState<RegistrationCaptcha['type']>('click')
  const [captchaPayload, setCaptchaPayload] =
    useState<RegisterPayload['captcha_payload']>()
  const [captchaData, setCaptchaData] = useState<RegistrationCaptcha | null>(
    null
  )
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false)
  const legalConsentErrorMessage = t('Please agree to the legal terms first')

  const { status } = useStatus()
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const { redirectToLogin, handleLoginSuccess } = useAuthRedirect()
  const {
    isSending: isSendingCode,
    secondsLeft,
    isActive,
    sendCode,
  } = useEmailVerification({
    turnstileToken,
    validateTurnstile,
  })

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const emailValue = form.watch('email')
  const emailVerificationRequired = !!status?.email_verification
  const registrationCaptchaEnabled = Boolean(
    status?.registration_captcha_enabled ??
    status?.data?.registration_captcha_enabled
  )
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)
  const requiresLegalConsent = hasUserAgreement || hasPrivacyPolicy
  const oauthRegisterEnabled =
    status?.oauth_register_enabled ??
    status?.data?.oauth_register_enabled ??
    true
  const hasWeChatLogin = Boolean(status?.wechat_login)
  const turnstileReady = !isTurnstileEnabled || Boolean(turnstileToken)
  const captchaReady =
    !registrationCaptchaEnabled ||
    (Boolean(captchaId) && Boolean(captchaImage) && Boolean(captchaPayload))

  const loadCaptcha = useCallback(async () => {
    if (!registrationCaptchaEnabled) return
    setIsCaptchaLoading(true)
    setCaptchaPayload(undefined)
    setCaptchaImage('')
    try {
      const captcha = await getRegistrationCaptcha()
      setCaptchaId(captcha.id)
      setCaptchaImage(captcha.image)
      setCaptchaType(captcha.type)
      setCaptchaData(captcha)
    } catch {
      setCaptchaId('')
      setCaptchaImage('')
      toast.error(t('Failed to load captcha'))
    } finally {
      setIsCaptchaLoading(false)
    }
  }, [registrationCaptchaEnabled, t])

  const wechatQrCodeUrl = useMemo(() => {
    return (
      status?.wechat_qrcode ||
      status?.wechat_qr_code ||
      status?.wechat_qrcode_image_url ||
      status?.wechat_qr_code_image_url ||
      status?.wechat_account_qrcode_image_url ||
      status?.WeChatAccountQRCodeImageURL ||
      status?.data?.wechat_qrcode ||
      status?.data?.WeChatAccountQRCodeImageURL ||
      ''
    )
  }, [status])

  useEffect(() => {
    void loadCaptcha()
  }, [loadCaptcha])

  useEffect(() => {
    if (requiresLegalConsent) {
      setAgreedToLegal(false)
    } else {
      setAgreedToLegal(true)
    }
  }, [requiresLegalConsent])

  useEffect(() => {
    const aff = new URLSearchParams(window.location.search).get('aff')?.trim()
    if (aff) {
      saveAffiliateCode(aff)
    }
  }, [])

  async function onSubmit(data: z.infer<typeof registerFormSchema>) {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    // Validate email verification if required
    if (emailVerificationRequired) {
      if (!data.email) {
        toast.error(t('Please enter your email'))
        return
      }
      if (!verificationCode) {
        toast.error(t('Please enter the verification code'))
        return
      }
    }

    if (!validateTurnstile()) return
    if (registrationCaptchaEnabled && !captchaReady) {
      toast.error(t('Please enter the image captcha'))
      return
    }

    setIsLoading(true)
    try {
      const res = await register({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        verification_code: verificationCode || undefined,
        aff_code: getAffiliateCode(),
        turnstile: turnstileToken,
        captcha_id: captchaId || undefined,
        captcha_type: captchaType,
        captcha_payload: captchaPayload,
      })

      if (res?.success) {
        toast.success(t('Account created! Please sign in'))
        redirectToLogin()
      } else {
        toast.error(res?.message || t('Failed to create account'))
        await loadCaptcha()
      }
    } catch {
      await loadCaptcha()
      // Errors are handled by global interceptor
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendVerificationCode() {
    if (await sendCode(emailValue || '')) {
      setTurnstileToken('')
      setTurnstileWidgetKey((current) => current + 1)
    }
  }

  const handleOpenWeChatDialog = () => {
    if (requiresLegalConsent && !agreedToLegal) {
      toast.error(legalConsentErrorMessage)
      return
    }

    setIsWeChatDialogOpen(true)
  }

  const handleWeChatDialogChange = (open: boolean) => {
    setIsWeChatDialogOpen(open)
    if (!open) {
      setWeChatCode('')
      setIsWeChatSubmitting(false)
    }
  }

  async function handleWeChatLogin() {
    if (!wechatCode.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsWeChatSubmitting(true)
    try {
      const res = await wechatLoginByCode(wechatCode)
      if (res?.success && isAuthBundle(res.data)) {
        await handleLoginSuccess(res.data)
        toast.success(t('Signed in via WeChat'))
        handleWeChatDialogChange(false)
      } else {
        if (getServerErrorMessageKey(res)) return
        toast.error(res?.message || t('Login failed'))
      }
    } catch (error: unknown) {
      if (getServerErrorMessageKey(error)) return
      toast.error(t('Login failed'))
    } finally {
      setIsWeChatSubmitting(false)
    }
  }

  let verificationCodeAction: ReactNode = t('Send code')
  if (isActive) {
    verificationCodeAction = t('Resend ({{seconds}}s)', {
      seconds: secondsLeft,
    })
  } else if (isSendingCode) {
    verificationCodeAction = <Loader2 className='h-4 w-4 animate-spin' />
  }

  let captchaVisual: ReactNode = <RefreshCw className='h-5 w-5' />
  if (isCaptchaLoading) {
    captchaVisual = <Loader2 className='h-5 w-5 animate-spin' />
  } else if (captchaData) {
    const data = {
      image: captchaData.image,
      thumb: captchaData.thumb,
      thumbX: captchaData.thumb_x ?? 0,
      thumbY: captchaData.thumb_y ?? 0,
      thumbWidth: captchaData.thumb_width ?? 0,
      thumbHeight: captchaData.thumb_height ?? 0,
      thumbSize: captchaData.thumb_size ?? 0,
    }
    if (captchaType === 'click') {
      captchaVisual = (
        <GoCaptcha.Click
          data={data}
          events={{
            confirm: (dots) =>
              setCaptchaPayload({
                click_points: dots.map((dot) => ({ x: dot.x, y: dot.y })),
              }),
          }}
        />
      )
    } else if (captchaType === 'slide') {
      captchaVisual = (
        <GoCaptcha.Slide
          data={data}
          events={{
            confirm: (point) => setCaptchaPayload({ x: point.x, y: point.y }),
          }}
        />
      )
    } else if (captchaType === 'drag') {
      captchaVisual = (
        <GoCaptcha.SlideRegion
          data={data}
          events={{
            confirm: (point) => setCaptchaPayload({ x: point.x, y: point.y }),
          }}
        />
      )
    } else {
      captchaVisual = (
        <GoCaptcha.Rotate
          data={data}
          events={{ confirm: (angle) => setCaptchaPayload({ angle }) }}
        />
      )
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        {...props}
      >
        {/* Username Field */}
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Username')}</FormLabel>
              <FormControl>
                <Input placeholder={t('Enter your username')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password Field */}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t('Enter password (8-20 characters)')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Confirm password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('Confirm password')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email Verification Section */}
        {emailVerificationRequired && (
          <>
            {/* Email Field */}
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('Email (required for verification)')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('name@example.com')}
                      type='email'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Verification Code Field */}
            <div className='flex items-end gap-2'>
              <div className='flex-1'>
                <Input
                  placeholder={t('Verification code')}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
              </div>
              <Button
                variant='outline'
                type='button'
                disabled={
                  isLoading ||
                  isSendingCode ||
                  isActive ||
                  !emailValue ||
                  !turnstileReady
                }
                onClick={handleSendVerificationCode}
              >
                {verificationCodeAction}
              </Button>
            </div>
          </>
        )}

        {registrationCaptchaEnabled && (
          <div className='grid gap-2'>
            <div className='flex items-center justify-between'>
              <Label>{t('Human verification')}</Label>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => void loadCaptcha()}
                disabled={isCaptchaLoading}
                title={t('Refresh captcha')}
                aria-label={t('Refresh captcha')}
              >
                <RefreshCw className='h-4 w-4' />
              </Button>
            </div>
            {captchaVisual}
          </div>
        )}

        {/* Turnstile */}
        {isTurnstileEnabled && (
          <div className='mt-2'>
            <Turnstile
              key={turnstileWidgetKey}
              siteKey={turnstileSiteKey}
              onVerify={setTurnstileToken}
            />
          </div>
        )}

        <LegalConsent
          status={status}
          checked={agreedToLegal}
          onCheckedChange={setAgreedToLegal}
          className='mt-1'
        />

        {/* Submit Button */}
        <Button
          type='submit'
          className='mt-2 w-full justify-center gap-2'
          disabled={
            isLoading ||
            (requiresLegalConsent && !agreedToLegal) ||
            !turnstileReady ||
            !captchaReady ||
            isCaptchaLoading
          }
        >
          {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          {t('Create account')}
        </Button>

        {oauthRegisterEnabled && (
          <OAuthProviders
            status={status}
            disabled={isLoading || (requiresLegalConsent && !agreedToLegal)}
            onWeChatLogin={hasWeChatLogin ? handleOpenWeChatDialog : undefined}
            isWeChatLoading={isWeChatSubmitting}
            className='pt-2'
          />
        )}
      </form>

      {hasWeChatLogin && (
        <Dialog
          open={isWeChatDialogOpen}
          onOpenChange={handleWeChatDialogChange}
          title={t('WeChat sign in')}
          description={t(
            'Scan the QR code to follow the official account and reply with “验证码” to receive your verification code.'
          )}
          contentClassName='max-w-sm'
          headerClassName='text-left'
          contentHeight='auto'
          bodyClassName='space-y-4'
          footer={
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleWeChatDialogChange(false)}
                disabled={isWeChatSubmitting}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleWeChatLogin}
                disabled={
                  isWeChatSubmitting ||
                  !wechatCode.trim() ||
                  (requiresLegalConsent && !agreedToLegal)
                }
                className='gap-2'
              >
                {isWeChatSubmitting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : null}
                {t('Confirm')}
              </Button>
            </>
          }
        >
          {wechatQrCodeUrl ? (
            <div className='flex justify-center'>
              <img
                src={wechatQrCodeUrl}
                alt={t('WeChat login QR code')}
                className='h-40 w-40 rounded-md border object-contain'
              />
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>
              {t('QR code is not configured. Please contact support.')}
            </p>
          )}
          <div className='grid gap-2'>
            <Label htmlFor='wechat-code'>{t('Verification code')}</Label>
            <Input
              id='wechat-code'
              placeholder={t('Enter the verification code')}
              value={wechatCode}
              onChange={(event) => setWeChatCode(event.target.value)}
              autoComplete='one-time-code'
            />
          </div>
        </Dialog>
      )}
    </Form>
  )
}
