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
import { SendIcon, SquareIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import { ModelGroupSelector } from '@/components/model-group-selector'

import { getInputControlState } from '../../lib'
import type { GroupOption, ModelOption } from '../../types'

type PlaygroundInputControlsProps = {
  disabled?: boolean
  groups: GroupOption[]
  groupValue: string
  isGenerating?: boolean
  isModelLoading?: boolean
  models: ModelOption[]
  modelValue: string
  onGroupChange: (value: string) => void
  onModelChange: (value: string) => void
  onStop?: () => void
  text: string
  tools: ReactNode
}

export function PlaygroundInputControls({
  disabled,
  groups,
  groupValue,
  isGenerating,
  isModelLoading = false,
  models,
  modelValue,
  onGroupChange,
  onModelChange,
  onStop,
  text,
  tools,
}: PlaygroundInputControlsProps) {
  const { t } = useTranslation()
  const { canSubmit, isSelectorDisabled, shouldShowStop } =
    getInputControlState({
      disabled,
      groups,
      hasStopHandler: Boolean(onStop),
      isGenerating,
      isModelLoading,
      models,
      text,
    })

  const submitControl = shouldShowStop ? (
    <PromptInputButton
      className='border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15 font-medium'
      onClick={onStop}
      variant='secondary'
    >
      <SquareIcon className='fill-current' size={16} />
      <span className='hidden sm:inline'>{t('Stop')}</span>
      <span className='sr-only sm:hidden'>{t('Stop')}</span>
    </PromptInputButton>
  ) : (
    <PromptInputButton
      className='bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground h-8 px-3 font-medium shadow-sm'
      disabled={!canSubmit}
      type='submit'
      variant='default'
    >
      <SendIcon size={16} />
      <span className='hidden sm:inline'>{t('Send')}</span>
      <span className='sr-only sm:hidden'>{t('Send')}</span>
    </PromptInputButton>
  )

  return (
    <div
      className='grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 md:grid-cols-[minmax(8rem,1fr)_minmax(0,32rem)_minmax(8rem,1fr)] md:gap-y-0'
      data-slot='playground-input-controls'
    >
      <div
        className='col-start-1 row-start-2 flex min-w-0 items-center justify-start md:col-start-1 md:row-start-1'
        data-slot='playground-input-actions'
      >
        {tools}
      </div>

      <div
        className='col-span-2 row-start-1 flex min-w-0 justify-end md:col-span-1 md:col-start-2 md:row-start-1 md:justify-center'
        data-slot='playground-model-selector'
      >
        <ModelGroupSelector
          className='max-w-none sm:w-full'
          disabled={isSelectorDisabled}
          groups={groups}
          models={models}
          onGroupChange={onGroupChange}
          onModelChange={onModelChange}
          selectedGroup={groupValue}
          selectedModel={modelValue}
        />
      </div>

      <div
        className='col-start-2 row-start-2 flex items-center justify-end md:col-start-3 md:row-start-1 md:justify-self-end'
        data-slot='playground-submit-control'
      >
        {submitControl}
      </div>
    </div>
  )
}
