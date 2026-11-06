import { schemas, ref } from './schemas.mjs'
import { operations } from './operations.mjs'

const errors = {
 400: 'Malformed input, invalid identifier, unsupported fields or page.',
 401: 'Sign in with a valid Supabase user access token.',
 403: 'Scope, verified eligibility, MFA or permitted resource state is unavailable.',
 404: 'Resource is unavailable. Private details are not disclosed.',
 409: 'Action unavailable: check permission, MFA, revision, workflow, capacity, time window or configured rules. Preserve unsaved work and reload permitted state before deciding to retry.',
 413: 'Request exceeds the global 32768-byte body limit.',
 415: 'Send Content-Type: application/json.',
 429: 'Coarse abuse limiter rejected this request; wait before retrying.',
 500: 'Unexpected failure; private error details are withheld.',
 503: 'Required provider/configuration is unavailable or a database read failed.'
}
const noStore = { 'Cache-Control': { description: 'API data must not be cached.', schema: { type: 'string', const: 'no-store' } } }
const json = schema => ({ 'application/json': { schema } })
export function buildOpenAPI() {
 const paths = {}
 for (const op of operations) {
  const handler = op.handler ?? op.path.replace(/\{([^}]+)\}/g, ':$1')
  const parameters = [...op.path.matchAll(/\{([^}]+)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: ref('UUID'), description: 'The UUID of this path resource, not a preview/demo ID.' }))
  if (op.offset) parameters.push({ name: 'offset', in: 'query', required: false, schema: { type: 'integer', minimum: 0, maximum: 10000, default: 0 }, description: 'Row offset; response is a bare array. Work, project-task and project-candidate pages contain at most 50 rows, quiz reports at most 100. Stop on a shorter page. Query text must be 1–5 decimal digits.' })
  const status = op.success ?? 200
  const response = { description: 'Successful response.', headers: noStore, content: json(op.response) }
  if (op.example) response.content['application/json'].example = op.example
  const responses = { [status]: response }
  const codes = new Set([413,500,...(op.operationId === 'health' ? [] : [503]),...(!op.public ? [401] : []),...(op.path.includes('{id}') && op.operationId !== 'publishedRecruitmentForm' ? [400] : []),...(op.errors ?? [])])
  for (const code of [...codes].sort((a,b)=>a-b)) responses[code] = { description: errors[code], headers: { ...noStore, ...(code === 429 ? { 'Retry-After': { description: 'Current cooldown in seconds.', schema: { type: 'string', const: '60' } } } : {}) }, content: json(ref('Error')) }
  const operation = {
   operationId: op.operationId, summary: op.summary, tags: [op.tag],
   description: op.access + (op.rateLimit ? '\n\nRate limit: ' + op.rateLimit : '') + (op.method === 'post' ? '\n\nJSON bodies are bounded to 32 KiB. Unknown fields are rejected by the relevant validators; cross-field, scope and timing rules remain server/database checks.' : ''),
   ...(op.public ? { security: [] } : {}),
   ...(parameters.length ? { parameters } : {}),
   ...(op.request ? { requestBody: { required: true, content: json(op.request) } } : {}),
   responses,
   'x-handler-route': handler,
   ...(op.variant ? { 'x-handler-variant': op.variant } : {}),
   'x-requires-mfa': !!op.mfa,
   'x-access-scope': op.access
  }
  paths[op.path] ??= {}
  if (paths[op.path][op.method]) throw new Error('Duplicate operation: ' + op.method + ' ' + op.path)
  paths[op.path][op.method] = operation
 }
 return {
  openapi: '3.1.0',
  info: { title: 'Next-Gen Engagement LMS API', version: '0.4.0', description: 'Implemented LMS HTTP interface. See API_GUIDE.md for setup, authentication, revisions, limitations and Apidog import. No production deployment or complete LMS is implied. All examples are synthetic; schemas do not replace database authorization or runtime verification.' },
  servers: [{ url: 'http://127.0.0.1:5173', description: 'Local Vite/Worker development only. Configure a separate approved test environment in your API client.' }],
  tags: [...new Set(operations.map(op=>op.tag))].map(name=>({name})),
  security: [{ BearerAuth: [] }], paths,
  components: { securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Supabase USER access token, validated by Auth. Never use a service-role/secret key as a user token. Membership, capability, scope and MFA are enforced separately. Some owner/trainer paths require MFA only for privileged access; read operation descriptions.' } }, schemas }
 }
}
export const serializeOpenAPI = () => JSON.stringify(buildOpenAPI(), null, 2) + '\n'
