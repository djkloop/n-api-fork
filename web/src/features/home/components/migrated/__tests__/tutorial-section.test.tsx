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
*/
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
  toastSuccess: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: ReactNode; to: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
}))

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: mocks.copyToClipboard,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: vi.fn(),
  },
}))

const { TutorialSection } = await import('../tutorial-section')

describe('migrated home tutorial', () => {
  test('updates the generated path and configuration when tool and platform change', async () => {
    const user = userEvent.setup()
    render(<TutorialSection />)

    await user.click(screen.getByRole('tab', { name: 'Gemini CLI' }))
    await user.click(screen.getByRole('tab', { name: 'Linux' }))

    expect(screen.getByText('> mkdir -p ~/.gemini')).toBeVisible()
    expect(screen.getByText('~/.gemini/.env')).toBeVisible()
    expect(
      screen.getByText(/GOOGLE_GEMINI_BASE_URL=http:\/\/localhost:3000\/v1/)
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Copy configuration' }))

    expect(mocks.copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('GEMINI_API_KEY=<YOUR_API_KEY>')
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Configuration copied')
  })
})
