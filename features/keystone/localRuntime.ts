import { mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { PrismaClient } from '@prisma/client'

// Local-only isolation, not professional, clinical, merchant or provider authority.
// A flag alone is insufficient: the private owned cluster and actual DB are checked.
export function localRuntimeDescriptor() {
  const file = process.env.MEDSPA_LOCAL_RUNTIME_FILE
  if (!file) return null
  const root = realpathSync(process.cwd())
  const expected = resolve(root, '.runtime/medspa-goal/owner.json')
  if (file !== expected || realpathSync(file) !== expected) throw new Error('Invalid local runtime descriptor path')
  const stat = statSync(file)
  if ((stat.mode & 0o777) !== 0o600 || stat.uid !== process.getuid?.()) throw new Error('Local runtime descriptor must be private and owned')
  const d = JSON.parse(readFileSync(file, 'utf8')) as { root: string; datadir: string; role: string; db: string; port: number }
  if (d.root !== root || d.datadir !== resolve(root, '.runtime/medspa-goal/pgdata') || !/^medspa_goal_[a-f0-9]{12}$/.test(d.role) || d.db !== d.role || !Number.isInteger(d.port) || d.port < 1 || d.port > 65535) throw new Error('Invalid owned runtime identity')
  const url = new URL(process.env.DATABASE_URL || '')
  if (url.hostname !== '127.0.0.1' || url.port !== String(d.port) || url.username !== d.role || url.pathname !== `/${d.db}`) throw new Error('Local runtime database target mismatch')
  for (const key of Object.keys(process.env)) {
    if (/^(S3_|AWS_|SMTP_|MAIL_|STRIPE_|PAYPAL_|OPENAI_|OPENROUTER_|ANTHROPIC_|PAYMENT_ADAPTER_)/.test(key) && process.env[key]) throw new Error('External integration configuration is forbidden in the owned offline runtime')
  }
  const pidLines = readFileSync(resolve(d.datadir, 'postmaster.pid'), 'utf8').split('\n')
  const pid = Number(pidLines[0])
  if (!Number.isInteger(pid) || pid < 1 || pidLines[1] !== d.datadir || Number(pidLines[3]) !== d.port) throw new Error('Owned PostgreSQL process identity mismatch')
  const command = execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim()
  if (!command.endsWith(`/postgres -D ${d.datadir}`)) throw new Error('Owned PostgreSQL datadir process mismatch')
  process.kill(pid, 0)
  return d
}

export async function assertOwnedLocalDatabase(prisma: PrismaClient) {
  const d = localRuntimeDescriptor()
  if (!d) return false
  const rows = await prisma.$queryRawUnsafe<Array<{ db: string; role: string; datadir: string; port: number; owner: string }>>(`SELECT current_database() AS db, current_user AS role, current_setting('data_directory') AS datadir, inet_server_port() AS port, (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()) AS owner`)
  const r = rows[0]
  if (!r || r.db !== d.db || r.role !== d.role || r.owner !== d.role || r.datadir !== d.datadir || r.port !== d.port) throw new Error('Actual local server/role/database owner mismatch')
  const images = resolve(d.root, '.runtime/medspa-goal/public-images')
  mkdirSync(images, { recursive: true, mode: 0o700 })
  if (realpathSync(images) !== images || !statSync(images).isDirectory() || statSync(images).uid !== process.getuid?.()) throw new Error('Unsafe local image storage')
  return true
}
