import { useState, useRef, useEffect } from 'react'
import type { Aspect } from '../types'
import type { Template } from '../lib/templates'
import { parseIntent, describeState, type AssistantStateSnapshot } from '../lib/assistant'
import { Icon } from './icons'
import { btnPrimary } from './ui'

export interface AssistantProps {
  snapshot: AssistantStateSnapshot
  onDensity: (n: number) => void
  onApplyTemplate: (t: Template) => void
  onSetAllY: (y: number) => void
  onSetCanvas: (aspect: Aspect) => void
  onClearCaptions: () => void
  onTrim: (trim: { start?: number; end?: number }) => void
  onUndo: () => void
  onRedo: () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  time: string
}

const EXAMPLES = [
  'Use 2 word captions',
  'Apply Heavy Pop',
  'Switch to 9:16',
  'Move captions to bottom',
  'How many captions?',
  'Undo that',
]

export function AssistantPanel(p: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'Hi! I can help you adjust captions, apply templates, change canvas format, or manage trim points. Type a command below.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [showExamples, setShowExamples] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (textToSend?: string) => {
    const raw = (textToSend ?? input).trim()
    if (!raw) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: raw,
      time: now,
    }

    const intent = parseIntent(raw)
    let reply = ''

    if (!intent) {
      reply =
        "I didn't recognise that command. Supported commands include:\n" +
        "• Captions: 'use 2 word captions', 'one word at a time'\n" +
        "• Template: 'apply Heavy Pop', 'use Pill template'\n" +
        "• Position: 'move captions to bottom', 'captions at top'\n" +
        "• Canvas: 'switch to 9:16', 'square format'\n" +
        "• Trim: 'trim start at 10s', 'trim end at 45s'\n" +
        "• Actions: 'undo', 'redo', 'clear captions'\n" +
        "• Status: 'how many captions?', 'what template?'"
    } else {
      switch (intent.type) {
        case 'density':
          p.onDensity(intent.words)
          reply = `Set caption density to ${intent.words} word${intent.words > 1 ? 's' : ''} per caption.`
          break
        case 'template':
          p.onApplyTemplate(intent.template)
          reply = `Applied template "${intent.template.name}".`
          break
        case 'position':
          p.onSetAllY(intent.y)
          reply = `Moved all captions to the ${intent.label}.`
          break
        case 'canvas':
          p.onSetCanvas(intent.aspect)
          reply = `Changed canvas aspect ratio to ${intent.aspect === 'source' ? 'Original' : intent.aspect}.`
          break
        case 'clear_captions':
          if (confirm('Are you sure you want to clear all captions? Ctrl+Z will undo.')) {
            p.onClearCaptions()
            reply = 'Cleared all captions.'
          } else {
            reply = 'Clear cancelled.'
          }
          break
        case 'trim':
          p.onTrim({ start: intent.start, end: intent.end })
          if (intent.start !== undefined && intent.end !== undefined) {
            reply = `Updated trim points to ${intent.start}s – ${intent.end}s.`
          } else if (intent.start !== undefined) {
            reply = `Set trim start to ${intent.start}s.`
          } else if (intent.end !== undefined) {
            reply = `Set trim end to ${intent.end}s.`
          }
          break
        case 'undo':
          p.onUndo()
          reply = 'Undid previous action.'
          break
        case 'redo':
          p.onRedo()
          reply = 'Redid action.'
          break
        case 'describe':
          reply = describeState(p.snapshot, intent.query)
          break
      }
    }

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Transparency disclosure banner */}
      <div className="rounded-lg border border-line bg-ink-950 p-2.5 text-[11px] leading-relaxed text-dim">
        <span className="font-semibold text-mute">Pattern-matched assistant: </span>
        Recognises specific commands and maps them directly to editor actions. Runs completely on your device with no external API calls or LLMs.
      </div>

      {/* Chat scroll area */}
      <div
        ref={logRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-line bg-ink-950 p-3 min-h-[220px]"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-accent-500 text-white'
                  : 'border border-line bg-ink-850 text-fg'
              }`}
            >
              {m.text}
            </div>
            <span className="mt-1 px-1 text-[10px] tabular-nums text-dim">{m.time}</span>
          </div>
        ))}
      </div>

      {/* Examples disclosure */}
      <div>
        <button
          type="button"
          onClick={() => setShowExamples((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-mute hover:text-fg"
        >
          <Icon name={showExamples ? 'down' : 'right'} size={14} />
          <span>Example commands</span>
        </button>
        {showExamples && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleSend(ex)}
                className="rounded-full border border-line bg-ink-850 px-2.5 py-1 text-[11px] text-mute hover:border-white/20 hover:text-fg transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command (e.g. 'use 2 word captions', 'apply Heavy Pop')…"
          rows={2}
          className="w-full resize-none rounded-lg border border-line bg-ink-950 p-2.5 text-xs text-fg placeholder:text-dim hover:border-white/15 focus:border-accent-500 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-dim">Press Enter to submit, Shift+Enter for newline</span>
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className={`${btnPrimary} h-7 px-3 text-xs`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
