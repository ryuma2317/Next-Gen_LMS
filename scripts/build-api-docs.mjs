import { readFile, writeFile } from 'node:fs/promises'
import { serializeOpenAPI } from '../api/openapi.mjs'
const target = new URL('../public/openapi.json', import.meta.url)
const content = serializeOpenAPI()
if (process.argv.includes('--check')) {
 const current = await readFile(target, 'utf8').catch(()=> '')
 if (current.replace(/\r\n/g, '\n') !== content) {
  console.error('OpenAPI artifact is stale or missing. Run npm run docs:api and commit public/openapi.json.')
  process.exitCode = 1
 } else console.log('OpenAPI artifact matches its sources.')
} else {
 await writeFile(target, content)
 console.log('Generated public/openapi.json (synthetic examples, no credentials).')
}
