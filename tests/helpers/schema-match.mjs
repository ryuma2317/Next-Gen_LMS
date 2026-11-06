// Deliberately limited to the JSON Schema keywords used by this contract.
// This is a fixture assertion, not an independent OpenAPI compliance validator.
import assert from 'node:assert/strict'
export function assertSchema(schema, value, document, path='$') {
 if (schema.$ref) {
  assert(schema.$ref.startsWith('#/'), 'Only local references are supported')
  const resolved = schema.$ref.slice(2).split('/').reduce((node,key)=>node?.[key.replaceAll('~1','/').replaceAll('~0','~')],document)
  assert(resolved, 'Unresolved reference ' + schema.$ref)
  return assertSchema(resolved,value,document,path)
 }
 const matches = branch => { try { assertSchema(branch,value,document,path); return true } catch { return false } }
 if (schema.anyOf) assert(schema.anyOf.some(matches),path+' does not match any branch')
 if (schema.oneOf) assert.equal(schema.oneOf.filter(matches).length,1,path+' must match exactly one branch')
 if (Object.hasOwn(schema,'const')) assert.deepEqual(value,schema.const,path+' constant')
 if (schema.enum) assert(schema.enum.includes(value),path+' enumeration')
 if (schema.type) {
  const valid = schema.type === 'null' ? value === null : schema.type === 'array' ? Array.isArray(value) : schema.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : schema.type === 'integer' ? Number.isSafeInteger(value) : typeof value === schema.type
  assert(valid,path+' expected '+schema.type)
 }
 if (typeof value === 'string') {
  const length = [...value].length
  if (schema.minLength !== undefined) assert(length >= schema.minLength,path+' too short')
  if (schema.maxLength !== undefined) assert(length <= schema.maxLength,path+' too long')
  if (schema.pattern) assert(new RegExp(schema.pattern).test(value),path+' pattern')
  if (schema.format === 'uuid') assert(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value),path+' UUID')
  if (schema.format === 'date-time') assert(/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/i.test(value) && Number.isFinite(Date.parse(value)),path+' absolute timestamp')
  if (schema.format === 'uri') assert.doesNotThrow(()=>new URL(value),path+' URI')
  if (schema.format === 'email') assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),path+' email')
 }
 if (typeof value === 'number') {
  if (schema.minimum !== undefined) assert(value >= schema.minimum,path+' minimum')
  if (schema.maximum !== undefined) assert(value <= schema.maximum,path+' maximum')
  if (schema.multipleOf) assert(Number.isInteger(value/schema.multipleOf),path+' multipleOf')
 }
 if (Array.isArray(value)) {
  if (schema.minItems !== undefined) assert(value.length >= schema.minItems,path+' minItems')
  if (schema.maxItems !== undefined) assert(value.length <= schema.maxItems,path+' maxItems')
  if (schema.uniqueItems) assert.equal(new Set(value.map(v=>JSON.stringify(v))).size,value.length,path+' uniqueItems')
  if (schema.items) value.forEach((item,index)=>assertSchema(schema.items,item,document,path+'['+index+']'))
 } else if (value !== null && typeof value === 'object') {
  if (schema.maxProperties !== undefined) assert(Object.keys(value).length <= schema.maxProperties,path+' maxProperties')
  for (const key of schema.required ?? []) assert(Object.hasOwn(value,key),path+' missing '+key)
  for (const [key,item] of Object.entries(value)) {
   if (schema.propertyNames) assertSchema(schema.propertyNames,key,document,path+' key')
   if (Object.hasOwn(schema.properties ?? {},key)) assertSchema(schema.properties[key],item,document,path+'.'+key)
   else if (schema.additionalProperties === false) assert.fail(path+' unexpected '+key)
   else if (typeof schema.additionalProperties === 'object') assertSchema(schema.additionalProperties,item,document,path+'.'+key)
  }
 }
}
