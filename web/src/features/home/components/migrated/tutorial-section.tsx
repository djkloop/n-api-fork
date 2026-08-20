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
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

const TOOL_IDS = ['claude-code', 'codex', 'gemini-cli', 'opencode'] as const
type ToolId = (typeof TOOL_IDS)[number]
type PlatformId = 'windows' | 'macos' | 'linux'

const PLATFORM_IDS: PlatformId[] = ['windows', 'macos', 'linux']
const TOOL_LABELS: Record<ToolId, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex CLI',
  'gemini-cli': 'Gemini CLI',
  opencode: 'OpenCode',
}
const PLATFORM_LABELS: Record<PlatformId, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
}

function getHomePath(tool: ToolId, platform: PlatformId) {
  if (platform === 'windows') {
    if (tool === 'claude-code') return '%USERPROFILE%\\.claude\\settings.json'
    if (tool === 'codex') return '%USERPROFILE%\\.codex\\config.toml'
    if (tool === 'gemini-cli') return '%USERPROFILE%\\.gemini\\.env'
    return '%APPDATA%\\opencode\\opencode.json'
  }

  if (tool === 'claude-code') return '~/.claude/settings.json'
  if (tool === 'codex') return '~/.codex/config.toml'
  if (tool === 'gemini-cli') return '~/.gemini/.env'
  return '~/.config/opencode/opencode.json'
}

function getToolFolder(tool: ToolId) {
  if (tool === 'claude-code') return '.claude'
  if (tool === 'codex') return '.codex'
  return '.gemini'
}

function getCreateCommand(tool: ToolId, platform: PlatformId) {
  if (platform === 'windows') {
    if (tool === 'opencode') return 'mkdir %APPDATA%\\opencode'
    return `mkdir %USERPROFILE%\\${getToolFolder(tool)}`
  }

  if (tool === 'opencode') return 'mkdir -p ~/.config/opencode'
  return `mkdir -p ~/${getToolFolder(tool)}`
}

function getConfig(tool: ToolId, baseUrl: string) {
  if (tool === 'claude-code') {
    return `{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "<YOUR_API_KEY>",
    "ANTHROPIC_BASE_URL": "${baseUrl}/v1"
  }
}`
  }
  if (tool === 'codex') {
    return `[model_providers.gateway]\nname = "gateway"\nbase_url = "${baseUrl}/v1"\nwire_api = "responses"\nrequires_openai_auth = true\n\nmodel_provider = "gateway"\nmodel = "gpt-5"`
  }
  if (tool === 'gemini-cli') {
    return `GOOGLE_GEMINI_BASE_URL=${baseUrl}/v1\nGEMINI_API_KEY=<YOUR_API_KEY>\nGEMINI_MODEL=gemini-2.5-pro`
  }
  return `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "gateway": {
      "options": {
        "baseURL": "${baseUrl}/v1",
        "apiKey": "<YOUR_API_KEY>"
      }
    }
  }
}`
}

export function TutorialSection() {
  const { t } = useTranslation()
  const [activeTool, setActiveTool] = useState<ToolId>('claude-code')
  const [platform, setPlatform] = useState<PlatformId>('windows')
  const [copied, setCopied] = useState(false)
  const baseUrl =
    typeof window === 'undefined'
      ? 'https://your-gateway.example'
      : window.location.origin
  const config = getConfig(activeTool, baseUrl)
  const path = getHomePath(activeTool, platform)

  const copyConfig = async () => {
    const success = await copyToClipboard(config)
    if (success) {
      setCopied(true)
      toast.success(t('Configuration copied'))
      window.setTimeout(() => setCopied(false), 1800)
      return
    }
    toast.error(t('Could not copy configuration'))
  }

  return (
    <section id='tutorial' className='home-section home-section--rule'>
      <div className='home-shell home-tutorial'>
        <div className='home-section__intro'>
          <p className='home-kicker'>{t('Tutorial')}</p>
          <h2>{t('Configure your favorite AI tool')}</h2>
          <p>
            {t(
              'Pick a tool, choose your platform, and connect it to the gateway in three steps.'
            )}
          </p>
          <span className='home-note'>{t('Only three steps')}</span>
        </div>

        <div className='home-tutorial__workbench'>
          <Tabs
            value={activeTool}
            onValueChange={(value) => setActiveTool(value as ToolId)}
          >
            <TabsList className='home-tabs'>
              {TOOL_IDS.map((tool) => (
                <TabsTrigger key={tool} value={tool}>
                  {t(TOOL_LABELS[tool])}
                </TabsTrigger>
              ))}
            </TabsList>
            {TOOL_IDS.map((tool) => (
              <TabsContent
                key={tool}
                value={tool}
                className='home-tutorial__panel'
              >
                <div className='home-step'>
                  <span>01</span>
                  <div>
                    <h3>{t('Create an API key')}</h3>
                    <p>
                      {t(
                        'Open the console, create a key, and choose the matching model group.'
                      )}
                    </p>
                    <Button
                      variant='link'
                      className='home-inline-link'
                      render={<Link to='/keys' />}
                    >
                      {t('Open API keys')}
                    </Button>
                  </div>
                </div>
                <div className='home-step'>
                  <span>02</span>
                  <div>
                    <h3>{t('Create the configuration folder')}</h3>
                    <p>
                      {t(
                        'Choose your operating system and create the folder in a terminal.'
                      )}
                    </p>
                    <Tabs
                      value={platform}
                      onValueChange={(value) =>
                        setPlatform(value as PlatformId)
                      }
                    >
                      <TabsList className='home-platform-tabs'>
                        {PLATFORM_IDS.map((item) => (
                          <TabsTrigger key={item} value={item}>
                            {t(PLATFORM_LABELS[item])}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <TabsContent value={platform} className='home-code-block'>
                        <code>{`> ${getCreateCommand(tool, platform)}`}</code>
                      </TabsContent>
                    </Tabs>
                    <p className='home-code-label'>{t('Configuration path')}</p>
                    <div className='home-code-block'>
                      <code>{path}</code>
                    </div>
                  </div>
                </div>
                <div className='home-step'>
                  <span>03</span>
                  <div>
                    <h3>{t('Paste the configuration')}</h3>
                    <p>
                      {t(
                        'Replace the placeholder key, save the file, and restart the tool.'
                      )}
                    </p>
                    <div className='home-code-block home-code-block--config'>
                      <pre>{config}</pre>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        className='home-copy-button'
                        onClick={copyConfig}
                        aria-label={
                          copied
                            ? t('Configuration copied')
                            : t('Copy configuration')
                        }
                      >
                        <HugeiconsIcon
                          icon={copied ? Tick01Icon : Copy01Icon}
                          strokeWidth={2}
                        />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className='home-tutorial__footnote'>
                  {t(
                    'Restart the tool after saving. Keep your API key private.'
                  )}
                </p>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  )
}
