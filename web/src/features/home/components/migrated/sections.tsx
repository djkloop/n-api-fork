/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import {
  ArrowRight01Icon,
  CodeIcon,
  FlashIcon,
  GlobalIcon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

const FEATURE_ITEMS = [
  {
    title: 'Fast setup',
    description: 'Create a working route in seconds.',
    icon: FlashIcon,
  },
  {
    title: 'Reliable routing',
    description: 'Keep model access behind one stable contract.',
    icon: Shield01Icon,
  },
  {
    title: 'Global reach',
    description: 'Balance traffic across providers and regions.',
    icon: GlobalIcon,
  },
  {
    title: 'Developer first',
    description: 'Use the tools and protocols your team already knows.',
    icon: CodeIcon,
  },
] as const

export function FeaturesSection() {
  const { t } = useTranslation()
  return (
    <section id='features' className='home-section'>
      <div className='home-shell'>
        <div className='home-section__intro home-section__intro--wide'>
          <p className='home-kicker'>{t('Features')}</p>
          <h2>{t('The gateway is the product')}</h2>
          <p>
            {t(
              'A focused control plane for teams that need model choice without endpoint sprawl.'
            )}
          </p>
        </div>
        <div className='home-feature-grid'>
          {FEATURE_ITEMS.map((item, index) => (
            <article
              key={item.title}
              className={
                index === 0 || index === 3
                  ? 'home-feature home-feature--wide'
                  : 'home-feature'
              }
            >
              <div className='home-feature__number'>0{index + 1}</div>
              <HugeiconsIcon
                icon={item.icon}
                strokeWidth={1.6}
                className='home-feature__icon'
              />
              <h3>{t(item.title)}</h3>
              <p>{t(item.description)}</p>
              <span className='home-feature__line' aria-hidden='true' />
            </article>
          ))}
        </div>
        <div className='home-feature-strip'>
          <span>{t('Load Balancing')}</span>
          <span>{t('Rate Limiting')}</span>
          <span>{t('Cost Tracking')}</span>
          <span>{t('Observability')}</span>
          <span>{t('Pass-Through')}</span>
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  const { t } = useTranslation()
  const plans = [
    {
      name: 'Live catalog',
      rate: 'LIVE',
      description: 'Standard model group',
      color: 'home-price--green',
    },
    {
      name: 'Usage billing',
      rate: 'PAYG',
      description: 'Developer-friendly routing',
      color: 'home-price--blue',
    },
    {
      name: 'Group routing',
      rate: 'FLEX',
      description: 'Efficient everyday usage',
      color: 'home-price--yellow',
    },
  ] as const

  return (
    <section id='pricing' className='home-section home-section--rule'>
      <div className='home-shell home-pricing'>
        <div className='home-section__intro'>
          <p className='home-kicker'>{t('Pricing')}</p>
          <h2>{t('Clear usage, no guessing')}</h2>
          <p>
            {t(
              'See the live model catalog for the current price and group multiplier.'
            )}
          </p>
        </div>
        <div className='home-pricing__body'>
          <div className='home-price-grid'>
            {plans.map((plan) => (
              <article key={plan.name} className='home-price'>
                <p>{t(plan.name)}</p>
                <strong className={plan.color}>{plan.rate}</strong>
                <span>{t(plan.description)}</span>
              </article>
            ))}
          </div>
          <div className='home-pricing__footer'>
            <span>{t('Pay as you go with real-time usage monitoring.')}</span>
            <Button
              variant='link'
              className='home-inline-link'
              render={<Link to='/pricing' />}
            >
              {t('Open model pricing')}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                strokeWidth={2}
                data-icon='inline-end'
              />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

const WORKFLOW_ITEMS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    quote:
      'The pay-per-call model and familiar API contract make experiments much easier.',
  },
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    quote:
      'Switching models behind one endpoint keeps the development flow lightweight.',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    quote:
      'The routing layer gives our team a clean place to manage access and usage.',
  },
] as const

export function TestimonialsSection() {
  const { t } = useTranslation()
  return (
    <section className='home-section home-testimonials'>
      <div className='home-shell'>
        <div className='home-section__intro home-section__intro--wide'>
          <p className='home-kicker'>{t('Supported Applications')}</p>
          <h2>{t('Keep the interface simple')}</h2>
          <p>
            {t(
              'The best gateway is the one that disappears into the workflow.'
            )}
          </p>
        </div>
        <div className='home-testimonials__track'>
          {['first', 'second'].flatMap((setId) =>
            WORKFLOW_ITEMS.map((item) => (
              <figure key={`${setId}-${item.id}`} className='home-quote'>
                <p>{t(item.quote)}</p>
                <figcaption>
                  <strong>{t(item.name)}</strong>
                  <span>{t('Supported Applications')}</span>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
