import type { ProjectBrief } from '../types'
import type { DraftPlan } from './draft/plan'

/**
 * Keeps the current project's VIDEO and draft plan in this browser's IndexedDB, so a refresh, a trip back to the
 * landing page, or a direct visit to /editor does not lose them. Nothing here is ever sent anywhere.
 * (Captions, style, trim, clips and canvas are autosaved separately in localStorage, as before.)
 *
 * Two records: 'video' (written once per project, large) and 'draft' (brief + plan, small, rewritten on every change).
 */
export const AUTOSAVE_KEY = 'cutpilot.autosave.v1'
const DB = 'cutpilot', STORE = 'session'

interface VideoRecord { id: 'video'; file: File; brief: ProjectBrief; savedAt: number }
interface DraftRecord { id: 'draft'; brief: ProjectBrief; plan: DraftPlan | null; savedAt: number }
export interface Session { file: File; brief: ProjectBrief; plan: DraftPlan | null; savedAt: number }

/** A project handed from the landing page to the editor in memory (it is also persisted to IndexedDB when possible). */
export interface Handoff { file: File; brief: ProjectBrief; persistError?: string }
let handoff: Handoff | null = null
export const setHandoff = (h: Handoff) => { handoff = h }
export const takeHandoff = () => { const h = handoff; handoff = null; return h }

const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available in this browser.'))
  const req = indexedDB.open(DB, 1)
  req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }) }
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error ?? new Error('Could not open browser storage.'))
  req.onblocked = () => reject(new Error('Browser storage is blocked by another CutPilot tab.'))
})

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode)
      const r = run(t.objectStore(STORE))
      t.oncomplete = () => resolve(r.result)
      t.onerror = () => reject(t.error ?? new Error('Browser storage failed.'))
      t.onabort = () => reject(t.error ?? new Error('Browser storage refused the write (it may be full).'))
    })
  } finally { db.close() }
}

/** Replaces the stored project (video + brief) and discards any previous draft plan. */
export async function saveProject(file: File, brief: ProjectBrief): Promise<void> {
  await tx('readwrite', (s) => s.put({ id: 'video', file, brief, savedAt: Date.now() } satisfies VideoRecord))
  await tx('readwrite', (s) => s.put({ id: 'draft', brief, plan: null, savedAt: Date.now() } satisfies DraftRecord))
}
export const saveDraft = (brief: ProjectBrief, plan: DraftPlan | null) =>
  tx('readwrite', (s) => s.put({ id: 'draft', brief, plan, savedAt: Date.now() } satisfies DraftRecord))

export async function loadSession(): Promise<Session | null> {
  try {
    const v = await tx<VideoRecord | undefined>('readonly', (s) => s.get('video'))
    if (!v || !(v.file instanceof Blob)) return null
    const d = await tx<DraftRecord | undefined>('readonly', (s) => s.get('draft'))
    return { file: v.file, brief: d?.brief ?? v.brief, plan: d?.plan ?? null, savedAt: d?.savedAt ?? v.savedAt }
  } catch { return null }
}

export async function clearSession() {
  try { await tx('readwrite', (s) => s.delete('video')); await tx('readwrite', (s) => s.delete('draft')) } catch { /* nothing to clear */ }
}

export function clearAutosave() { try { localStorage.removeItem(AUTOSAVE_KEY) } catch { /* ignore */ } }

/** For the landing page's "Continue" link; does not hold on to the file. */
export async function peekSession(): Promise<{ name: string; videoName: string; savedAt: number } | null> {
  const s = await loadSession()
  return s ? { name: s.brief.name, videoName: s.file.name, savedAt: s.savedAt } : null
}

/** Starts a new project from the landing page: replaces whatever was stored, keeps the file in memory for the editor. */
export async function startProject(file: File, brief: ProjectBrief): Promise<Handoff> {
  clearAutosave()
  const h: Handoff = { file, brief }
  try { await saveProject(file, brief) } catch (e) { h.persistError = e instanceof Error ? e.message : String(e) }
  setHandoff(h)
  return h
}
