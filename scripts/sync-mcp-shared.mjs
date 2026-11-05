// The MCP server keeps copies of some files from src/lib so its numbers match the app.
// `npm run sync:mcp` copies them; `npm run sync:mcp -- --check` only reports drift.
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FILES = ['constants', 'dates', 'merchants', 'metrics', 'periods', 'recurring', 'tags', 'transfers']
const app = fileURLToPath(new URL('../src/lib/', import.meta.url))
const mcp = fileURLToPath(new URL('../../money-tracker-caliche-mcp/src/shared/', import.meta.url))
const check = process.argv.includes('--check')

if (!existsSync(mcp)) {
  console.log('MCP project not found next to this one, nothing to sync.')
  process.exit(0)
}

const drift = FILES.filter(name => !existsSync(`${mcp}${name}.js`) || readFileSync(`${app}${name}.js`, 'utf8') !== readFileSync(`${mcp}${name}.js`, 'utf8'))
if (check) {
  console.log(drift.length ? `Out of sync: ${drift.join(', ')}` : 'MCP shared files are in sync.')
  process.exit(drift.length ? 1 : 0)
}
for (const name of drift) copyFileSync(`${app}${name}.js`, `${mcp}${name}.js`)
console.log(drift.length ? `Copied: ${drift.join(', ')}` : 'Already in sync.')
