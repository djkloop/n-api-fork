#!/usr/bin/env node

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

const defaultConfigPath = '/etc/new-api/cluster-deploy.json'

function printHelp() {
  console.log(`Usage: deploy-cluster.mjs [options]

Deploy the primary node first, then deploy the secondary node over SSH.

Options:
  --config <path>     Config file (default: ${defaultConfigPath})
  --secondary-only   Skip the primary node and retry only the secondary node
  --dry-run          Validate config and print commands without executing them
  --help             Show this help
`)
}

function fail(message) {
  throw new Error(message)
}

function readConfig(configPath) {
  let raw
  try {
    raw = fs.readFileSync(configPath, 'utf8')
  } catch (error) {
    fail(`cannot read config ${configPath}: ${error.message}`)
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    fail(`invalid JSON in ${configPath}: ${error.message}`)
  }
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${name} must be a non-empty string`)
  }
  if (/[\r\n\0]/.test(value)) {
    fail(`${name} contains an invalid control character`)
  }
  return value
}

function positiveInteger(value, name, fallback) {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    fail(`${name} must be a positive integer`)
  }
  return resolved
}

function normalizeConfig(config) {
  const primary = config.primary ?? {}
  const secondary = config.secondary ?? {}
  const ssh = config.ssh ?? {}

  const primarySourceDir = requireString(
    primary.sourceDir ?? '/opt/1panel/apps/new-api-source',
    'primary.sourceDir'
  )
  const sourceDir = requireString(
    secondary.sourceDir ?? '/opt/1panel/apps/new-api-source',
    'secondary.sourceDir'
  )
  const appDir = requireString(
    secondary.appDir ?? '/opt/1panel/apps/new-api-node2',
    'secondary.appDir'
  )

  return {
    lockFile: requireString(
      config.lockFile ?? '/tmp/new-api-cluster-deploy.lock',
      'lockFile'
    ),
    commandTimeoutSeconds: positiveInteger(
      config.commandTimeoutSeconds,
      'commandTimeoutSeconds',
      3600
    ),
    primary: {
      sourceDir: primarySourceDir,
      deployScript: requireString(
        primary.deployScript ??
          '/opt/1panel/apps/new-api-source/scripts/deploy-1panel.sh',
        'primary.deployScript'
      ),
    },
    secondary: {
      host: requireString(secondary.host, 'secondary.host'),
      identityFile: requireString(
        secondary.identityFile ?? '/root/.ssh/new-api-node2-deploy',
        'secondary.identityFile'
      ),
      deployScript: requireString(
        secondary.deployScript ?? `${sourceDir}/scripts/deploy-1panel.sh`,
        'secondary.deployScript'
      ),
      sourceDir,
      appDir,
      composeFile: requireString(
        secondary.composeFile ?? `${appDir}/docker-compose.yml`,
        'secondary.composeFile'
      ),
      branch: requireString(secondary.branch ?? 'main', 'secondary.branch'),
      serviceName: requireString(
        secondary.serviceName ?? 'new-api',
        'secondary.serviceName'
      ),
      containerName: requireString(
        secondary.containerName ?? 'new-api-node-2',
        'secondary.containerName'
      ),
      imageRepository: requireString(
        secondary.imageRepository ?? 'new-api-custom',
        'secondary.imageRepository'
      ),
      healthTimeout: positiveInteger(
        secondary.healthTimeout,
        'secondary.healthTimeout',
        180
      ),
      backupDir:
        secondary.backupDir === undefined
          ? null
          : requireString(secondary.backupDir, 'secondary.backupDir'),
    },
    ssh: {
      connectTimeoutSeconds: positiveInteger(
        ssh.connectTimeoutSeconds,
        'ssh.connectTimeoutSeconds',
        15
      ),
    },
  }
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`
}

function formatCommand(command, args) {
  return [command, ...args].map(shellQuote).join(' ')
}

function acquireLock(lockFile) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600)
      fs.writeFileSync(fd, `${process.pid}\n`, 'utf8')
      return () => {
        try {
          fs.closeSync(fd)
        } catch {}
        try {
          fs.unlinkSync(lockFile)
        } catch {}
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        fail(`cannot create lock ${lockFile}: ${error.message}`)
      }

      let ownerPid = 0
      try {
        ownerPid = Number.parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10)
      } catch {}

      if (Number.isInteger(ownerPid) && ownerPid > 0) {
        try {
          process.kill(ownerPid, 0)
          fail(`another cluster deployment is running with pid ${ownerPid}`)
        } catch (ownerError) {
          if (ownerError.message.startsWith('another cluster deployment')) {
            throw ownerError
          }
          if (ownerError.code !== 'ESRCH') {
            fail(`cannot inspect deployment lock owner ${ownerPid}: ${ownerError.message}`)
          }
        }
      }

      try {
        fs.unlinkSync(lockFile)
      } catch (unlinkError) {
        fail(`cannot remove stale lock ${lockFile}: ${unlinkError.message}`)
      }
    }
  }

  fail(`cannot acquire deployment lock ${lockFile}`)
}

function runCommand(label, command, args, timeoutSeconds, dryRun) {
  console.log(`[cluster] ${label}`)
  if (dryRun) {
    console.log(`[cluster] dry-run: ${formatCommand(command, args)}`)
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: 'inherit',
    })
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref()
    }, timeoutSeconds * 1000)

    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(new Error(`${label} could not start: ${error.message}`))
    })

    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      if (timedOut) {
        reject(new Error(`${label} timed out after ${timeoutSeconds}s`))
        return
      }
      if (code !== 0) {
        reject(
          new Error(
            `${label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`
          )
        )
        return
      }
      resolve()
    })
  })
}

function readCommand(label, command, args, timeoutSeconds, dryRun) {
  console.log(`[cluster] ${label}`)
  if (dryRun) {
    console.log(`[cluster] dry-run: ${formatCommand(command, args)}`)
    return Promise.resolve('<primary-commit>')
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    let output = ''
    let timedOut = false

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      output += chunk
    })

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref()
    }, timeoutSeconds * 1000)

    child.once('error', (error) => {
      clearTimeout(timeout)
      reject(new Error(`${label} could not start: ${error.message}`))
    })

    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      if (timedOut) {
        reject(new Error(`${label} timed out after ${timeoutSeconds}s`))
        return
      }
      if (code !== 0) {
        reject(
          new Error(
            `${label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`
          )
        )
        return
      }
      resolve(output.trim())
    })
  })
}

function secondarySshArgs(config, deployCommit) {
  const secondary = config.secondary
  const remoteEnv = {
    SOURCE_DIR: secondary.sourceDir,
    APP_DIR: secondary.appDir,
    COMPOSE_FILE: secondary.composeFile,
    BRANCH: secondary.branch,
    DEPLOY_COMMIT: deployCommit,
    SERVICE_NAME: secondary.serviceName,
    CONTAINER_NAME: secondary.containerName,
    IMAGE_REPOSITORY: secondary.imageRepository,
    HEALTH_TIMEOUT: String(secondary.healthTimeout),
  }
  if (secondary.backupDir !== null) {
    remoteEnv.BACKUP_DIR = secondary.backupDir
  }

  const remoteCommand = [
    'env',
    ...Object.entries(remoteEnv).map(
      ([name, value]) => `${name}=${shellQuote(value)}`
    ),
    'bash',
    shellQuote(secondary.deployScript),
  ].join(' ')

  return [
    '-T',
    '-i',
    secondary.identityFile,
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-o',
    'StrictHostKeyChecking=accept-new',
    '-o',
    `ConnectTimeout=${config.ssh.connectTimeoutSeconds}`,
    '-o',
    'ServerAliveInterval=15',
    '-o',
    'ServerAliveCountMax=3',
    secondary.host,
    remoteCommand,
  ]
}

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', default: defaultConfigPath },
      'secondary-only': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printHelp()
    return
  }

  const configPath = path.resolve(values.config)
  const config = normalizeConfig(readConfig(configPath))
  const dryRun = values['dry-run']

  if (!dryRun) {
    if (!fs.existsSync(config.primary.sourceDir)) {
      fail(`primary source directory not found: ${config.primary.sourceDir}`)
    }
    if (!values['secondary-only'] && !fs.existsSync(config.primary.deployScript)) {
      fail(`primary deploy script not found: ${config.primary.deployScript}`)
    }
    if (!fs.existsSync(config.secondary.identityFile)) {
      fail(`SSH identity file not found: ${config.secondary.identityFile}`)
    }
  }

  const releaseLock = dryRun ? () => {} : acquireLock(config.lockFile)
  try {
    if (!values['secondary-only']) {
      await runCommand(
        'deploying primary node',
        'bash',
        [config.primary.deployScript],
        config.commandTimeoutSeconds,
        dryRun
      )
    }

    const deployCommit = await readCommand(
      'reading primary deployed commit',
      'git',
      ['-C', config.primary.sourceDir, 'rev-parse', 'HEAD'],
      config.commandTimeoutSeconds,
      dryRun
    )
    if (!dryRun && !/^[0-9a-f]{40}$/i.test(deployCommit)) {
      fail(`primary deployed commit is invalid: ${deployCommit}`)
    }
    console.log(`[cluster] secondary target commit: ${deployCommit}`)

    await runCommand(
      'deploying secondary node',
      'ssh',
      secondarySshArgs(config, deployCommit),
      config.commandTimeoutSeconds,
      dryRun
    )

    console.log('[cluster] deployment succeeded on all requested nodes')
  } finally {
    releaseLock()
  }
}

main().catch((error) => {
  console.error(`[cluster] ERROR: ${error.message}`)
  process.exitCode = 1
})
