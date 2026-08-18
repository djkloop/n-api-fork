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
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { PlaygroundInputControls } from '../playground-input-controls'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/model-group-selector', () => ({
  ModelGroupSelector: (props: { className?: string }) => (
    <button className={props.className} type='button'>
      Model selector
    </button>
  ),
}))

describe('playground input controls layout', () => {
  test('places actions, model selector, and submit control in three desktop columns', () => {
    render(
      <PlaygroundInputControls
        groups={[{ label: 'Default', value: 'default', ratio: 1 }]}
        groupValue='default'
        models={[{ label: 'Test model', value: 'test-model' }]}
        modelValue='test-model'
        onGroupChange={() => undefined}
        onModelChange={() => undefined}
        text='Ready to send'
        tools={<button type='button'>Actions</button>}
      />
    )

    const controls = document.querySelector(
      '[data-slot="playground-input-controls"]'
    )
    const actions = document.querySelector(
      '[data-slot="playground-input-actions"]'
    )
    const selector = document.querySelector(
      '[data-slot="playground-model-selector"]'
    )
    const submit = document.querySelector(
      '[data-slot="playground-submit-control"]'
    )

    expect(controls).toHaveClass(
      'md:grid-cols-[minmax(8rem,1fr)_minmax(0,32rem)_minmax(8rem,1fr)]'
    )
    expect(actions).toHaveClass('md:col-start-1', 'md:row-start-1')
    expect(selector).toHaveClass(
      'md:col-start-2',
      'md:row-start-1',
      'md:justify-center'
    )
    expect(submit).toHaveClass(
      'md:col-start-3',
      'md:row-start-1',
      'md:justify-self-end'
    )
    expect(
      screen.getAllByRole('button', { name: 'Model selector' })
    ).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Model selector' })).toHaveClass(
      'max-w-none',
      'sm:w-full'
    )
  })
})
