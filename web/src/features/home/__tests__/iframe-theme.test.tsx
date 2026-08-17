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
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolvedTheme: 'dark' as 'dark' | 'light',
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh-CN' },
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/components/layout/components/footer', () => ({ Footer: () => null }))
vi.mock('@/components/rich-content', () => ({ RichContent: () => null }))
vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ resolvedTheme: mocks.resolvedTheme }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: null } }),
}))
vi.mock('../components', () => ({
  CTA: () => null,
  Features: () => null,
  Hero: () => null,
  HowItWorks: () => null,
  Stats: () => null,
}))
vi.mock('../hooks', () => ({
  useHomePageContent: () => ({
    content: 'https://example.com/home',
    isLoaded: true,
    isUrl: true,
  }),
}))

const { Home } = await import('../index')

describe('Home iframe theme synchronization', () => {
  test('sends common dark-mode fields when the iframe loads', () => {
    render(<Home />)
    const iframe = screen.getByTitle('Custom Home Page') as HTMLIFrameElement
    if (!iframe.contentWindow) {
      throw new Error('iframe contentWindow is unavailable')
    }
    const postMessage = vi.spyOn(iframe.contentWindow, 'postMessage')

    fireEvent.load(iframe)

    expect(postMessage).toHaveBeenCalledWith(
      {
        themeMode: 'dark',
        theme: 'dark',
        colorMode: 'dark',
        isDark: true,
      },
      '*'
    )
    expect(postMessage).toHaveBeenCalledWith({ lang: 'zh-CN' }, '*')
    expect(iframe).toHaveStyle({ colorScheme: 'dark' })
  })
})
