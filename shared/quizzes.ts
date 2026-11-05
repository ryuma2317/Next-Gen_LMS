export type QuizMode = 'exam' | 'game'
export type Question = { id: string; kind: 'single' | 'multiple'; prompt: string; options: { id: string; text: string }[]; correct: string[]; points: number }
export type PublicQuestion = Omit<Question, 'correct'>
export type QuizConfig = {
  opens_at: string | null; closes_at: string | null; duration_seconds: number | null; max_attempts: number | null;
  results: 'immediate' | 'after_close' | 'teacher' | null; monitoring: 'fullscreen_visibility' | 'none' | null;
  focus_response: 'report' | 'warn_report' | null; question_seconds: number | null;
  scoring: 'correct' | 'speed' | null; speed_bonus_percent: number | null; leaderboard: 'each_question' | 'end' | null;
}
export type QuizDraft = { title: string; description: string; mode: QuizMode; config: QuizConfig; questions: Question[] }
export type QuizSummary = { id: string; section_id: string; title: string; description: string; mode: QuizMode; config: QuizConfig; state: 'draft' | 'published' | 'closed'; version: number; released: boolean }
export type QuizAttempt = { id: string; status: 'active' | 'submitted'; version: number; deadline: string; server_now: string; answers: Record<string, string[]>; questions: PublicQuestion[]; score_units: number | null; max_units: number; flags: number }
export type GameView = { id: string; version: number; phase: 'lobby' | 'question' | 'reveal' | 'finished'; question_index: number; deadline: string | null; server_now: string; question: PublicQuestion | null; correct: string[] | null; joined: boolean; answered: boolean; players: number; answered_count: number; standings: { label: string; score_units: number; rank: number; is_you: boolean }[] }
export const emptyQuizConfig = (): QuizConfig => ({ opens_at: null, closes_at: null, duration_seconds: null, max_attempts: null, results: null, monitoring: null, focus_response: null, question_seconds: null, scoring: null, speed_bonus_percent: null, leaderboard: null })
export const shape = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',')
export const quizText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)
const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(v) && !['constructor', 'prototype'].includes(v)
const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max
export function validateQuizDraft(value: unknown): QuizDraft {
  if (!shape(value, ['title', 'description', 'mode', 'config', 'questions']) || !quizText(value.title, 160) || !value.title.trim() || !quizText(value.description, 1500) || !['exam', 'game'].includes(String(value.mode))) throw new Error('Check quiz title, description and mode')
  const c = value.config
  if (!shape(c, Object.keys(emptyQuizConfig()))) throw new Error('Invalid quiz settings')
  for (const key of ['opens_at', 'closes_at']) if (c[key] !== null && (typeof c[key] !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(c[key] as string) || !Number.isFinite(Date.parse(c[key] as string)))) throw new Error('Use valid opening/closing times')
  for (const [key, min, max] of [['duration_seconds', 30, 10800], ['max_attempts', 1, 5], ['question_seconds', 5, 300], ['speed_bonus_percent', 0, 100]] as const) if (c[key] !== null && !integer(c[key], min, max)) throw new Error('Quiz setting is outside its supported range')
  for (const [key, choices] of Object.entries({ results: ['immediate', 'after_close', 'teacher'], monitoring: ['fullscreen_visibility', 'none'], focus_response: ['report', 'warn_report'], scoring: ['correct', 'speed'], leaderboard: ['each_question', 'end'] })) if (c[key] !== null && !choices.includes(String(c[key]))) throw new Error('Unknown quiz setting')
  if (!Array.isArray(value.questions) || value.questions.length > 15) throw new Error('Use at most 15 questions in this increment')
  const seen = new Set<string>()
  for (const q of value.questions) {
    if (!shape(q, ['id', 'kind', 'prompt', 'options', 'correct', 'points']) || !validId(q.id) || seen.has(q.id) || !['single', 'multiple'].includes(String(q.kind)) || !quizText(q.prompt, 1000) || !integer(q.points, 1, 100) || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || !Array.isArray(q.correct)) throw new Error('Invalid question')
    seen.add(q.id); const options = new Set<string>()
    for (const o of q.options) { if (!shape(o, ['id', 'text']) || !validId(o.id) || options.has(o.id) || !quizText(o.text, 200)) throw new Error('Invalid answer option'); options.add(o.id) }
    if (new Set(q.correct).size !== q.correct.length || q.correct.some((id: unknown) => typeof id !== 'string' || !options.has(id)) || (q.kind === 'single' && q.correct.length > 1)) throw new Error('Choose valid, distinct correct options')
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > 26000) throw new Error('Quiz content exceeds the 26 KB limit')
  return value as QuizDraft
}
export function quizPublicationProblems(draft: QuizDraft, now = Date.now()): string[] {
  const p: string[] = [], c = draft.config
  if (!draft.questions.length || draft.questions.some(q => !q.prompt.trim() || q.options.some(o => !o.text.trim()) || !q.correct.length)) p.push('Complete every question, option and correct answer')
  if (draft.mode === 'exam') {
    if (!c.opens_at || !c.closes_at || Date.parse(c.closes_at) <= Math.max(Date.parse(c.opens_at), now)) p.push('Choose a closing time after opening and the current time')
    if (!c.duration_seconds || !c.max_attempts || !c.results || !c.monitoring || !c.focus_response) p.push('Choose duration, attempts, result release and monitoring settings')
  } else if (!c.question_seconds || !c.scoring || !c.leaderboard || (c.scoring === 'speed' && c.speed_bonus_percent === null)) p.push('Choose question duration, scoring, speed bonus when used, and leaderboard timing')
  return p
}
export function validateQuizAnswers(questions: PublicQuestion[], value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid answers')
  const result: Record<string, string[]> = Object.create(null)
  for (const [id, selected] of Object.entries(value)) {
    const q = questions.find(item => item.id === id)
    if (!q || !Array.isArray(selected) || selected.length > q.options.length || new Set(selected).size !== selected.length || selected.some(s => typeof s !== 'string' || !q.options.some(o => o.id === s)) || (q.kind === 'single' && selected.length > 1)) throw new Error('Invalid selected options')
    result[id] = [...selected].sort()
  }
  return result
}
export function gradeChoice(question: Question, selected: string[], remainingMs = 0, durationMs = 1, bonusPercent = 0): number {
  if (selected.length !== question.correct.length || !question.correct.length || new Set(selected).size !== selected.length || selected.some(id => !question.correct.includes(id))) return 0
  const base = question.points * 100
  return base + Math.floor(base * Math.max(0, Math.min(100, bonusPercent)) * Math.max(0, Math.min(durationMs, remainingMs)) / (100 * Math.max(1, durationMs)))
}
export type QuizSignal = 'hidden' | 'visible' | 'fullscreen_exit' | 'fullscreen_enter' | 'fullscreen_unavailable'
export const quizSignals: QuizSignal[] = ['hidden', 'visible', 'fullscreen_exit', 'fullscreen_enter', 'fullscreen_unavailable']
