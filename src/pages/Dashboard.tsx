import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, navigate } from '../lib/router'
import { useAuth } from '../context/AuthContext'
import {
  listProjects,
  deleteProject,
  duplicateProject,
  renameProject,
  setProjectStatus,
  createNewProject,
  saveProject,
  storeProjectMedia,
  type Project,
} from '../lib/projects'
import { LogoMark } from '../components/Logo'
import { Icon } from '../components/icons'
import { UserMenu } from '../components/UserMenu'
import { AuthModal } from '../components/AuthModal'
import { btn, btnPrimary, input } from '../components/ui'
import { fmt } from '../lib/util'

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { user, isConfigured, openAuthModal } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'draft' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name-asc' | 'name-desc'>('recent')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const data = await listProjects(user?.id)
      setProjects(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [user])

  // Filter & Search
  const filtered = useMemo(() => {
    return projects
      .filter((p) => {
        if (filter !== 'all' && p.status !== filter) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          return p.name.toLowerCase().includes(q) || p.videoMeta?.name.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'recent') return b.lastEditedAt - a.lastEditedAt
        if (sortBy === 'oldest') return a.lastEditedAt - b.lastEditedAt
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        return 0
      })
  }, [projects, filter, search, sortBy])

  // Most recent project for Continue Editing
  const mostRecent = useMemo(() => {
    if (!projects.length) return null
    return [...projects].sort((a, b) => b.lastEditedAt - a.lastEditedAt)[0]
  }, [projects])

  const counts = useMemo(() => {
    return {
      all: projects.length,
      draft: projects.filter((p) => p.status === 'draft').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    }
  }, [projects])

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      await deleteProject(id, user?.id)
      setProjects((ps) => ps.filter((p) => p.id !== id))
      if (menuOpenId === id) setMenuOpenId(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    const clone = await duplicateProject(id, user?.id)
    if (clone) {
      setProjects((ps) => [clone, ...ps])
      if (menuOpenId === id) setMenuOpenId(null)
    }
  }

  const handleStatusToggle = async (id: string, curStatus: 'draft' | 'completed') => {
    const newStatus = curStatus === 'draft' ? 'completed' : 'draft'
    await setProjectStatus(id, newStatus, user?.id)
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
    if (menuOpenId === id) setMenuOpenId(null)
  }

  const handleRenameSubmit = async (id: string) => {
    if (!renameVal.trim()) return
    await renameProject(id, renameVal.trim(), user?.id)
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, name: renameVal.trim() } : p)))
    setRenameId(null)
  }

  const handleCreateNew = async (file?: File) => {
    const name = newProjectName.trim() || (file ? file.name.replace(/\.[^.]+$/, '') : 'Untitled Project')
    const proj = createNewProject({
      userId: user?.id,
      name,
      file,
    })
    await saveProject(proj, user?.id)
    if (file) {
      await storeProjectMedia(proj.id, file)
    }
    setNewModalOpen(false)
    navigate(`/editor?project=${proj.id}`)
  }

  return (
    <div className="min-h-dvh bg-ink-950 font-body text-fg antialiased flex flex-col selection:bg-accent-500/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-line bg-ink-900/95 px-4 sm:px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-2"
            title="Return to CutPilot homepage"
          >
            <LogoMark size={28} />
            <span className="font-display text-base font-semibold tracking-tight">CutPilot</span>
          </Link>
          <span className="h-4 w-px bg-line" />
          <span className="font-display text-sm font-medium text-mute hidden sm:inline">My Projects</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              setNewProjectName('')
              setNewModalOpen(true)
            }}
            className={`${btnPrimary} h-9 px-3.5 text-xs font-semibold shadow-[0_0_20px_rgba(139,124,246,0.3)]`}
          >
            <Icon name="upload" size={14} />
            <span>New Project</span>
          </button>
          <span className="h-4 w-px bg-line" />
          <UserMenu />
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Local Storage Banner if guest */}
        {!user && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-accent-500/10 via-ink-900 to-ink-900 p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-500/20 text-accent-300 shrink-0 mt-0.5">
                <Icon name="folder" size={14} />
              </span>
              <div>
                <p className="font-semibold text-fg">Local Workspace Active</p>
                <p className="text-mute mt-0.5 leading-relaxed">
                  Your projects are saved on this browser using IndexedDB. Sign in or create a free account to sync projects across devices and enable cloud backups.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('signup')}
              className="shrink-0 rounded-lg bg-accent-500 px-3 py-1.5 font-medium text-white hover:bg-accent-600 transition-colors"
            >
              Sign up free
            </button>
          </div>
        )}

        {/* Continue Editing Spotlight */}
        {mostRecent && (
          <section aria-labelledby="continue-heading" className="space-y-3">
            <h2 id="continue-heading" className="font-display text-xs font-semibold uppercase tracking-wider text-mute">
              Continue Editing
            </h2>
            <div className="group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border border-line bg-gradient-to-b from-ink-900 to-ink-950 p-5 sm:p-6 shadow-xl transition-all hover:border-accent-500/40">
              <div className="flex items-start gap-4">
                {/* Thumbnail / Aspect box */}
                <div className="relative aspect-video w-32 sm:w-44 shrink-0 overflow-hidden rounded-xl border border-line bg-ink-850 flex items-center justify-center shadow-md">
                  {mostRecent.thumbnail ? (
                    <img src={mostRecent.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid place-items-center text-accent-400">
                      <Icon name="film" size={26} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  {mostRecent.videoMeta && (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white">
                      {fmt(mostRecent.videoMeta.duration)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        mostRecent.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-400/10 text-amber-200 border border-amber-400/30'
                      }`}
                    >
                      {mostRecent.status}
                    </span>
                    <span className="text-xs text-mute font-mono">Edited {timeAgo(mostRecent.lastEditedAt)}</span>
                  </div>

                  <h3 className="font-display text-lg sm:text-xl font-bold text-fg group-hover:text-accent-300 transition-colors">
                    {mostRecent.name}
                  </h3>

                  <p className="text-xs text-mute leading-relaxed max-w-md">
                    {mostRecent.videoMeta?.name
                      ? `Footage: ${mostRecent.videoMeta.name} · ${mostRecent.state.captions.length} captions · ${mostRecent.state.clips.length ? `${mostRecent.state.clips.length} clips` : 'Single cut'}`
                      : 'Unfinished edit ready to resume.'}
                  </p>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => navigate(`/editor?project=${mostRecent.id}`)}
                className={`${btnPrimary} h-10 px-5 text-xs font-semibold shrink-0 shadow-lg`}
              >
                <Icon name="play" size={14} />
                <span>Resume Session</span>
              </button>
            </div>
          </section>
        )}

        {/* Projects Library Section */}
        <section aria-labelledby="library-heading" className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 id="library-heading" className="font-display text-lg font-bold text-fg">
                Project Library
              </h2>
              <p className="text-xs text-mute mt-0.5">Manage your video edits, drafts, and completed cuts</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900 p-1 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filter === 'all' ? 'bg-ink-800 text-white shadow-sm' : 'text-mute hover:text-white'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filter === 'draft' ? 'bg-ink-800 text-white shadow-sm' : 'text-mute hover:text-white'
                }`}
              >
                Drafts ({counts.draft})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  filter === 'completed' ? 'bg-ink-800 text-white shadow-sm' : 'text-mute hover:text-white'
                }`}
              >
                Completed ({counts.completed})
              </button>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Icon
                name="sparkles"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${input} pl-9 pr-8 h-9 text-xs`}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-white"
                  aria-label="Clear search"
                >
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-mute hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-md border border-line bg-ink-900 px-2.5 text-xs text-fg hover:border-white/20 focus:border-accent-500 focus:outline-none cursor-pointer"
              >
                <option value="recent">Recently edited</option>
                <option value="oldest">Oldest edited</option>
                <option value="name-asc">Name (A–Z)</option>
                <option value="name-desc">Name (Z–A)</option>
              </select>
            </div>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="grid place-items-center py-20 text-mute text-sm">
              <div className="flex flex-col items-center gap-3">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500/30 border-t-accent-500" />
                <span>Loading your projects…</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-ink-900/40 p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-ink-850 text-mute">
                <Icon name="folder" size={24} />
              </div>
              <h3 className="font-display text-base font-semibold text-fg">
                {search ? 'No matching projects found' : 'No projects in this section yet'}
              </h3>
              <p className="mt-1 text-xs text-mute max-w-sm mx-auto leading-relaxed">
                {search
                  ? `No projects matched "${search}". Try searching for another term.`
                  : 'Start by importing raw footage or drafting your first video cut.'}
              </p>
              {!search && (
                <button
                  onClick={() => {
                    setNewProjectName('')
                    setNewModalOpen(true)
                  }}
                  className={`${btnPrimary} mt-5 h-9 px-4 text-xs mx-auto`}
                >
                  <Icon name="upload" size={14} />
                  <span>Create First Project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((proj) => {
                const isMenuOpen = menuOpenId === proj.id
                const isRenaming = renameId === proj.id

                return (
                  <div
                    key={proj.id}
                    className="group relative flex flex-col rounded-xl border border-line bg-ink-900 overflow-hidden shadow-lg hover:border-white/20 transition-all"
                  >
                    {/* Card Thumbnail Area */}
                    <div
                      className="relative aspect-video w-full bg-ink-950 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/editor?project=${proj.id}`)}
                    >
                      {proj.thumbnail ? (
                        <img
                          src={proj.thumbnail}
                          alt=""
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-ink-850 to-ink-950 text-dim group-hover:text-accent-400 transition-colors">
                          <Icon name="film" size={32} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ffe14d] text-black shadow-lg">
                          <Icon name="play" size={16} />
                        </span>
                      </div>

                      {/* Video duration tag */}
                      {proj.videoMeta && (
                        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {fmt(proj.videoMeta.duration)}
                        </span>
                      )}

                      {/* Status Tag */}
                      <span
                        className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${
                          proj.status === 'completed'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950/80 text-amber-200 border border-amber-500/40'
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        {isRenaming ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              void handleRenameSubmit(proj.id)
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={renameVal}
                              onChange={(e) => setRenameVal(e.target.value)}
                              className={`${input} h-7 text-xs flex-1`}
                            />
                            <button
                              type="submit"
                              className="h-7 px-2 rounded bg-accent-500 text-white text-xs hover:bg-accent-600"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenameId(null)}
                              className="h-7 px-2 text-xs text-mute hover:text-white"
                            >
                              ✕
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              onClick={() => navigate(`/editor?project=${proj.id}`)}
                              className="font-display text-sm font-semibold text-fg hover:text-accent-300 cursor-pointer truncate flex-1"
                              title={proj.name}
                            >
                              {proj.name}
                            </h3>

                            {/* Card Menu Button */}
                            <div className="relative">
                              <button
                                onClick={() => setMenuOpenId(isMenuOpen ? null : proj.id)}
                                className="grid h-7 w-7 place-items-center rounded-md text-mute hover:bg-ink-800 hover:text-white transition-colors"
                                aria-label="Project actions"
                              >
                                <Icon name="dots" size={14} />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-line bg-ink-850 p-1 shadow-2xl z-20 animate-in fade-in zoom-in-95"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => navigate(`/editor?project=${proj.id}`)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-fg hover:bg-ink-700"
                                  >
                                    <Icon name="play" size={13} className="text-accent-400" />
                                    <span>Open Editor</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRenameVal(proj.name)
                                      setRenameId(proj.id)
                                      setMenuOpenId(null)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-fg hover:bg-ink-700"
                                  >
                                    <Icon name="type" size={13} />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(proj.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-fg hover:bg-ink-700"
                                  >
                                    <Icon name="folder" size={13} />
                                    <span>Duplicate</span>
                                  </button>
                                  <button
                                    onClick={() => handleStatusToggle(proj.id, proj.status)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-fg hover:bg-ink-700"
                                  >
                                    <Icon name="check" size={13} />
                                    <span>{proj.status === 'draft' ? 'Mark Completed' : 'Mark Draft'}</span>
                                  </button>
                                  <div className="border-t border-line my-1" />
                                  <button
                                    onClick={() => handleDelete(proj.id, proj.name)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950/50"
                                  >
                                    <Icon name="trash" size={13} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <p className="text-[11px] text-mute mt-1 truncate">
                          {proj.videoMeta?.name || 'No video linked'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] text-mute font-mono">
                        <span>{timeAgo(proj.lastEditedAt)}</span>
                        <span>{proj.state.captions.length} caps</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* New Project Dialog */}
      {newModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setNewModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-ink-900 p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-fg">Create New Project</h3>
              <button
                onClick={() => setNewModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-mute hover:text-white"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-mute mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. YouTube Short Ep. 4"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className={`${input} h-9 text-xs`}
                />
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-dashed border-line bg-ink-850 p-6 text-center cursor-pointer hover:border-accent-400 transition-colors"
              >
                <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
                  <Icon name="upload" size={20} />
                </span>
                <p className="text-xs font-semibold text-fg">Choose video footage</p>
                <p className="text-[11px] text-mute mt-0.5">MP4, WebM, or MOV up to 4K</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleCreateNew(f)
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleCreateNew()}
                  className={`${btn} h-9 text-xs text-mute hover:text-white`}
                >
                  Start without video first
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${btnPrimary} h-9 px-4 text-xs font-medium`}
                >
                  Select Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  )
}
