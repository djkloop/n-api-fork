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
import { ArrowRight01Icon, Key01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

import { FlowVisualization } from './flow-visualization'

interface HeroSectionProps {
  isAuthenticated: boolean
}

export function HeroSection(props: HeroSectionProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const { status } = useStatus()
  const version =
    (status?.version as string | undefined) ||
    (status?.data?.version as string | undefined)

  return (
    <section className='home-hero'>
      <div className='home-hero__rail' aria-hidden='true'>
        <span>{t('Unified AI API')}</span>
        <span>{t('OpenAI-compatible')}</span>
        <span>{t('Multi-provider routing')}</span>
      </div>

      <div className='home-shell home-hero__layout'>
        <div className='home-hero__copy'>
          <div className='home-hero__stamp'>
            <span>{systemName}</span>
            {version && <small>v{version}</small>}
          </div>
          <h1>
            {t('Build AI apps')}
            <span>{t('with one API')}</span>
          </h1>
          <p>
            {t(
              'Connect models, control usage, and ship reliable AI workflows through a single OpenAI-compatible gateway.'
            )}
          </p>

          <div className='home-hero__actions'>
            <Button
              size='lg'
              className='home-button home-button--primary'
              render={
                <Link to={props.isAuthenticated ? '/dashboard' : '/sign-up'} />
              }
            >
              {props.isAuthenticated ? t('Go to Dashboard') : t('Start now')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                data-icon='inline-end'
              />
            </Button>
            <Button
              size='lg'
              variant='outline'
              className='home-button'
              render={
                <Link to={props.isAuthenticated ? '/keys' : '/sign-in'} />
              }
            >
              <HugeiconsIcon
                icon={Key01Icon}
                strokeWidth={2}
                data-icon='inline-start'
              />
              {props.isAuthenticated ? t('Manage API keys') : t('Sign in')}
            </Button>
          </div>

          <dl className='home-hero__facts'>
            <div>
              <dt>40+</dt>
              <dd>{t('AI providers')}</dd>
            </div>
            <div>
              <dt>3</dt>
              <dd>{t('database engines')}</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>{t('compatible endpoint')}</dd>
            </div>
          </dl>
        </div>

        <div className='home-hero__visual'>
          <FlowVisualization />
        </div>
      </div>
    </section>
  )
}
