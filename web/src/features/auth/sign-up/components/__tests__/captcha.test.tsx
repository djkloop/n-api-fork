/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getRegistrationCaptcha: vi.fn(),
  verifyRegistrationCaptcha: vi.fn(),
  register: vi.fn(),
  redirectToLogin: vi.fn(),
  sendCode: vi.fn(),
  status: {
    registration_captcha_enabled: true,
    email_verification: false,
    oauth_register_enabled: false,
    wechat_login: false,
    user_agreement_enabled: false,
    privacy_policy_enabled: false,
  },
}))

vi.mock('@/features/auth/api', () => ({
  getRegistrationCaptcha: mocks.getRegistrationCaptcha,
  register: mocks.register,
  verifyRegistrationCaptcha: mocks.verifyRegistrationCaptcha,
  wechatLoginByCode: vi.fn(),
}))

vi.mock('go-captcha-react', () => ({
  default: {
    Click: ({
      events,
    }: {
      events: { confirm: (dots: Array<{ x: number; y: number }>) => void }
    }) => (
      <button type='button' onClick={() => events.confirm([{ x: 10, y: 10 }])}>
        Confirm captcha
      </button>
    ),
    Slide: ({
      events,
    }: {
      events: { confirm: (point: { x: number; y: number }) => void }
    }) => (
      <button type='button' onClick={() => events.confirm({ x: 10, y: 10 })}>
        Confirm captcha
      </button>
    ),
    SlideRegion: ({
      events,
    }: {
      events: { confirm: (point: { x: number; y: number }) => void }
    }) => (
      <button type='button' onClick={() => events.confirm({ x: 10, y: 10 })}>
        Confirm captcha
      </button>
    ),
    Rotate: ({ events }: { events: { confirm: (angle: number) => void } }) => (
      <button type='button' onClick={() => events.confirm(90)}>
        Confirm captcha
      </button>
    ),
  },
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: mocks.status }),
}))

vi.mock('@/features/auth/hooks/use-turnstile', () => ({
  useTurnstile: () => ({
    isTurnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileToken: '',
    setTurnstileToken: vi.fn(),
    validateTurnstile: () => true,
  }),
}))

vi.mock('@/features/auth/hooks/use-email-verification', () => ({
  useEmailVerification: () => ({
    isSending: false,
    secondsLeft: 0,
    isActive: false,
    sendCode: mocks.sendCode,
  }),
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    redirectToLogin: mocks.redirectToLogin,
    handleLoginSuccess: vi.fn(),
  }),
}))

vi.mock('@/features/auth/components/legal-consent', () => ({
  LegalConsent: () => null,
}))
vi.mock('@/features/auth/components/oauth-providers', () => ({
  OAuthProviders: () => null,
}))

const { SignUpForm } = await import('../sign-up-form')

async function fillRegistrationForm(): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('Enter your username'), 'alice')
  await user.type(
    screen.getByPlaceholderText('Enter password (8-20 characters)'),
    'password123'
  )
  await user.type(
    screen.getByPlaceholderText('Confirm password'),
    'password123'
  )
}

const captcha = (id: string, image = 'first') => ({
  id,
  type: 'click' as const,
  image: `data:image/png;base64,${image}`,
  thumb: 'data:image/png;base64,thumb',
})

describe('SignUpForm behavior captcha', () => {
  beforeEach(() => {
    mocks.getRegistrationCaptcha.mockReset()
    mocks.verifyRegistrationCaptcha.mockReset()
    mocks.verifyRegistrationCaptcha.mockResolvedValue({ success: true })
    mocks.register.mockReset()
    mocks.redirectToLogin.mockReset()
    mocks.sendCode.mockReset()
    mocks.sendCode.mockResolvedValue(false)
    mocks.status.email_verification = false
    mocks.getRegistrationCaptcha.mockResolvedValue(captcha('captcha-1'))
    mocks.register.mockResolvedValue({ success: true, message: '' })
  })

  test('centers the captcha within the registration form', async () => {
    render(<SignUpForm />)

    await screen.findByRole('button', { name: 'Confirm captcha' })

    expect(screen.getByTestId('registration-captcha')).toHaveClass('mx-auto')
  })

  test('keeps registration disabled when only the captcha is complete', async () => {
    render(<SignUpForm />)
    const createButton = screen.getByRole('button', { name: 'Create account' })

    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirm captcha' })
    )

    expect(createButton).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Challenge completed. It will be verified when you submit.'
    )
  })

  test('requires completing the challenge before registration', async () => {
    render(<SignUpForm />)
    const createButton = screen.getByRole('button', { name: 'Create account' })
    expect(createButton).toBeDisabled()

    await fillRegistrationForm()
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirm captcha' })
    )
    expect(createButton).toBeEnabled()
    await userEvent.click(createButton)

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith(
        expect.objectContaining({
          captcha_id: 'captcha-1',
          captcha_type: 'click',
          captcha_payload: { click_points: [{ x: 10, y: 10 }] },
        })
      )
    })
  })

  test('refreshes a consumed challenge when sending email fails', async () => {
    mocks.status.email_verification = true
    mocks.getRegistrationCaptcha
      .mockResolvedValueOnce(captcha('captcha-1'))
      .mockResolvedValueOnce(captcha('captcha-2', 'second'))

    render(<SignUpForm />)
    await userEvent.type(
      screen.getByPlaceholderText('name@example.com'),
      'alice@example.com'
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirm captcha' })
    )
    await screen.findByText('Captcha verified successfully')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    await waitFor(() => {
      expect(mocks.verifyRegistrationCaptcha).toHaveBeenCalledWith({
        captcha_id: 'captcha-1',
        captcha_type: 'click',
        captcha_payload: { click_points: [{ x: 10, y: 10 }] },
      })
      expect(mocks.sendCode).toHaveBeenCalledOnce()
      expect(mocks.getRegistrationCaptcha).toHaveBeenCalledTimes(3)
    })
    expect(
      screen.getByRole('button', { name: 'Create account' })
    ).toBeDisabled()
  })

  test('does not send an email code when captcha verification fails', async () => {
    mocks.status.email_verification = true
    mocks.verifyRegistrationCaptcha.mockResolvedValue({
      success: false,
      message: 'Image captcha is incorrect',
    })

    render(<SignUpForm />)
    await userEvent.type(
      screen.getByPlaceholderText('name@example.com'),
      'alice@example.com'
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Confirm captcha' })
    )

    await waitFor(() => {
      expect(mocks.verifyRegistrationCaptcha).toHaveBeenCalledOnce()
      expect(mocks.getRegistrationCaptcha).toHaveBeenCalledTimes(2)
    })
    expect(mocks.sendCode).not.toHaveBeenCalled()
  })

  test('does not render a separate refresh button beside the challenge', async () => {
    render(<SignUpForm />)
    await screen.findByRole('button', { name: 'Confirm captcha' })

    expect(
      screen.queryByRole('button', { name: 'Refresh captcha' })
    ).not.toBeInTheDocument()
  })
})
