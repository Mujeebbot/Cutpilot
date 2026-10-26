import type { Aspect, CanvasSettings, Caption, CaptionStyle, Clip, Density, OutputFormat, Trim } from '../types'
import { DEFAULT_STYLE, DEFAULT_CANVAS } from '../types'
import type { DraftPlan } from './draft/plan'
import { supabase, isSupabaseConfigured } from './supabase'

export interface ProjectMetadata {
  name: string
  size: number
  type: string
  duration: number
  width: number
  height: number
}

export interface ProjectState {
  trim: Trim
  clips: Clip[]
  captions: Caption[]
  style: CaptionStyle
  presetId: string | null
  canvas: CanvasSettings
  density: Density
  brief: { text: string; format: OutputFormat }
  plan: DraftPlan | null
}

export interface Project {
  id: string
  userId?: string | null
  name: string
  status: 'draft' | 'completed'
  createdAt: number
  updatedAt: number
  lastEditedAt: number
  thumbnail?: string | null
  videoMeta?: ProjectMetadata | null
  videoStorage?: { kind: 'indexeddb' | 'cloud'; key?: string }
  state: ProjectState
}

const DB_NAME = 'cutpilot_v2'
const DB_VERSION = 1
const STORE_PROJECTS = 'projects'
const STORE_MEDIA = 'media'

/** Open the multi-project IndexedDB */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this browser.'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const pStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' })
        pStore.createIndex('lastEditedAt', 'lastEditedAt', { unique: false })
        pStore.createIndex('userId', 'userId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Could not open CutPilot database.'))
  })
}

async function runTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const req = fn(tx.objectStore(storeName))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error ?? new Error(`Storage transaction failed on ${storeName}`))
      tx.onabort = () => reject(tx.error ?? new Error('Transaction was aborted.'))
    })
  } finally {
    db.close()
  }
}

/** Generate a unique project ID */
export function generateProjectId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'proj_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Store raw video file locally for a project */
export async function storeProjectMedia(projectId: string, file: File | Blob): Promise<void> {
  await runTx(STORE_MEDIA, 'readwrite', (s) =>
    s.put({ id: projectId, file, updatedAt: Date.now() })
  )
}

/** Load raw video file for a project */
export async function loadProjectMedia(projectId: string): Promise<File | Blob | null> {
  try {
    const res = await runTx<{ id: string; file: File | Blob } | undefined>(
      STORE_MEDIA,
      'readonly',
      (s) => s.get(projectId)
    )
    return res?.file ?? null
  } catch {
    return null
  }
}

/** Delete raw video media for a project */
export async function removeProjectMedia(projectId: string): Promise<void> {
  try {
    await runTx(STORE_MEDIA, 'readwrite', (s) => s.delete(projectId))
  } catch {
    // Ignore if not found
  }
}

/** Create a fresh project structure */
export function createNewProject(params: {
  id?: string
  userId?: string | null
  name?: string
  file?: File | null
  dims?: { w: number; h: number }
  duration?: number
}): Project {
  const id = params.id || generateProjectId()
  const now = Date.now()
  const name = params.name || (params.file ? params.file.name.replace(/\.[^.]+$/, '') : 'Untitled Project')

  const videoMeta: ProjectMetadata | null = params.file
    ? {
        name: params.file.name,
        size: params.file.size,
        type: params.file.type,
        duration: params.duration || 0,
        width: params.dims?.w || 1920,
        height: params.dims?.h || 1080,
      }
    : null

  return {
    id,
    userId: params.userId ?? null,
    name,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    lastEditedAt: now,
    thumbnail: null,
    videoMeta,
    videoStorage: { kind: 'indexeddb', key: id },
    state: {
      trim: { start: 0, end: params.duration || 0 },
      clips: [],
      captions: [],
      style: { ...DEFAULT_STYLE },
      presetId: 'heavy-pop',
      canvas: { ...DEFAULT_CANVAS },
      density: 2,
      brief: { text: '', format: '9:16' },
      plan: null,
    },
  }
}

/** Save a project to local IndexedDB and Supabase if signed in */
export async function saveProject(project: Project, userId?: string | null): Promise<void> {
  const now = Date.now()
  const updatedProject: Project = {
    ...project,
    userId: userId !== undefined ? userId : project.userId,
    updatedAt: now,
    lastEditedAt: now,
  }

  // 1. Save to local IndexedDB
  await runTx(STORE_PROJECTS, 'readwrite', (s) => s.put(updatedProject))

  // 2. If signed in and Supabase is configured, sync to cloud
  const targetUserId = userId || project.userId
  if (isSupabaseConfigured && targetUserId) {
    try {
      await supabase.from('projects').upsert({
        id: updatedProject.id,
        user_id: targetUserId,
        name: updatedProject.name,
        status: updatedProject.status,
        thumbnail: updatedProject.thumbnail ?? null,
        video_metadata: updatedProject.videoMeta ?? null,
        video_storage: updatedProject.videoStorage ?? null,
        state: updatedProject.state,
        last_edited_at: new Date(now).toISOString(),
      })
    } catch (e) {
      console.warn('Failed to sync project to Supabase:', e)
    }
  }
}

/** Get a project by ID */
export async function getProject(projectId: string): Promise<Project | null> {
  // Try local IndexedDB first
  try {
    const local = await runTx<Project | undefined>(STORE_PROJECTS, 'readonly', (s) =>
      s.get(projectId)
    )
    if (local) return local
  } catch {
    // Continue to cloud fallback
  }

  // Fallback to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!error && data) {
        const proj: Project = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          status: data.status,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime(),
          lastEditedAt: new Date(data.last_edited_at).getTime(),
          thumbnail: data.thumbnail,
          videoMeta: data.video_metadata,
          videoStorage: data.video_storage,
          state: data.state,
        }
        // Cache locally for offline availability
        await runTx(STORE_PROJECTS, 'readwrite', (s) => s.put(proj)).catch(() => undefined)
        return proj
      }
    } catch {
      // Return null below
    }
  }

  return null
}

/** List all projects for dashboard */
export async function listProjects(userId?: string | null): Promise<Project[]> {
  const localProjects: Project[] = []

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_PROJECTS, 'readonly')
    const req = tx.objectStore(STORE_PROJECTS).getAll()

    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => {
        localProjects.push(...(req.result || []))
        resolve()
      }
      req.onerror = () => reject(req.error)
    })
    db.close()
  } catch (err) {
    console.warn('Could not read local projects:', err)
  }

  // If user is authenticated, sync with Supabase
  if (isSupabaseConfigured && userId) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('last_edited_at', { ascending: false })

      if (!error && data) {
        const cloudProjects: Project[] = data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          name: d.name,
          status: d.status,
          createdAt: new Date(d.created_at).getTime(),
          updatedAt: new Date(d.updated_at).getTime(),
          lastEditedAt: new Date(d.last_edited_at).getTime(),
          thumbnail: d.thumbnail,
          videoMeta: d.video_metadata,
          videoStorage: d.video_storage,
          state: d.state,
        }))

        // Merge cloud with local: keep the latest version of each
        const map = new Map<string, Project>()
        for (const lp of localProjects) {
          map.set(lp.id, lp)
        }
        for (const cp of cloudProjects) {
          const existing = map.get(cp.id)
          if (!existing || cp.lastEditedAt >= existing.lastEditedAt) {
            map.set(cp.id, cp)
            // update local cache
            runTx(STORE_PROJECTS, 'readwrite', (s) => s.put(cp)).catch(() => undefined)
          }
        }

        const merged = Array.from(map.values())
        return merged.sort((a, b) => b.lastEditedAt - a.lastEditedAt)
      }
    } catch (e) {
      console.warn('Could not fetch cloud projects:', e)
    }
  }

  return localProjects.sort((a, b) => b.lastEditedAt - a.lastEditedAt)
}

/** Delete a project */
export async function deleteProject(projectId: string, userId?: string | null): Promise<void> {
  // 1. Delete from local IndexedDB
  await runTx(STORE_PROJECTS, 'readwrite', (s) => s.delete(projectId))
  await removeProjectMedia(projectId)

  // 2. Delete from Supabase
  if (isSupabaseConfigured && userId) {
    try {
      await supabase.from('projects').delete().eq('id', projectId)
    } catch (e) {
      console.warn('Could not delete project from Supabase:', e)
    }
  }
}

/** Duplicate a project */
export async function duplicateProject(projectId: string, userId?: string | null): Promise<Project | null> {
  const orig = await getProject(projectId)
  if (!orig) return null

  const newId = generateProjectId()
  const now = Date.now()

  const clone: Project = {
    ...orig,
    id: newId,
    userId: userId || orig.userId,
    name: `${orig.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    lastEditedAt: now,
    videoStorage: { kind: 'indexeddb', key: newId },
  }

  // Clone media blob if present
  const media = await loadProjectMedia(projectId)
  if (media) {
    await storeProjectMedia(newId, media)
  }

  await saveProject(clone, userId)
  return clone
}

/** Rename a project */
export async function renameProject(projectId: string, newName: string, userId?: string | null): Promise<void> {
  const proj = await getProject(projectId)
  if (!proj) return
  proj.name = newName
  await saveProject(proj, userId)
}

/** Update project status (e.g. 'completed' when exported) */
export async function setProjectStatus(projectId: string, status: 'draft' | 'completed', userId?: string | null): Promise<void> {
  const proj = await getProject(projectId)
  if (!proj) return
  proj.status = status
  await saveProject(proj, userId)
}

/** Migrate local guest projects to a registered user account */
export async function migrateGuestProjects(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !userId) return 0
  let count = 0
  try {
    const list = await listProjects()
    for (const proj of list) {
      if (!proj.userId) {
        proj.userId = userId
        await saveProject(proj, userId)
        count++
      }
    }
  } catch (err) {
    console.warn('Migration of guest projects encountered error:', err)
  }
  return count
}
