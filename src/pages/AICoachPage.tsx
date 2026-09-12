import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Play,
  RotateCcw,
  Compass,
} from 'lucide-react'
import { useAuth } from '../lib/supabase/auth'
import { sendAICoachMessage, type ChatMessage } from '../lib/ai/aiCoach'

interface DisplayMessage {
  id: string
  role: 'user' | 'model'
  content: string
  suggestsWorkout?: boolean
  timestamp: string
}

const STARTER_PROMPTS = [
  'Give me a 15-minute workout',
  'How can I improve my squat form?',
  'What should I do on a rest day?',
  'What workout should I do today?',
]

export default function AICoachPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content:
        "Hello! I'm your FitNova AI Coach. Whether you need a customized workout, form correction tips, or exercise progression advice, I'm here to support your fitness journey. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    setInputText('')
    setErrorMessage(null)

    const userMessage: DisplayMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    setSending(true)

    // Prepare history for Gemini API
    const history: ChatMessage[] = messages
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const result = await sendAICoachMessage(text, history)

      if (result.response) {
        const botMessage: DisplayMessage = {
          id: 'model-' + Date.now(),
          role: 'model',
          content: result.response,
          suggestsWorkout: result.suggestsWorkout,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages((prev) => [...prev, botMessage])
      } else if (result.error) {
        setErrorMessage(result.error)
      }
    } catch (err) {
      console.error('Failed to communicate with AI Coach:', err)
      setErrorMessage('The AI Coach is temporarily unavailable. Please try again shortly.')
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-msg-' + Date.now(),
        role: 'model',
        content:
          "Hello! I'm your FitNova AI Coach. How can I help with your training today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setErrorMessage(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Connecting to AI Coach...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold text-white">
                Fit<span className="text-emerald-400">Nova</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Coach</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Chat</span>
            </button>

            <Link
              to="/workout-session"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Start Workout</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Chat Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Header Title Section */}
        <div className="mb-4 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
            FitNova AI Coach
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Gemini 3.8 Flash
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Ask questions about workout routines, exercise technique, modifications, or recovery tips.
          </p>
        </div>

        {/* Chat Card */}
        <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl min-h-[500px]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : 'bg-purple-500/20 border border-purple-500/30 text-purple-400'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1.5">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-sm shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/80 border border-slate-800/80 text-slate-200 rounded-tl-sm shadow-lg'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Optional Workout Action Button if routine suggested */}
                  {msg.role === 'model' && msg.suggestsWorkout && (
                    <div className="pt-1">
                      <Link
                        to="/workout-session"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition duration-200 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-emerald-400" />
                        <span>Launch Workout Session</span>
                      </Link>
                    </div>
                  )}

                  <span
                    className={`text-[10px] text-slate-500 px-1 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading typing bubble */}
            {sending && (
              <div className="flex gap-3 max-w-xl mr-auto animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-sm bg-slate-950/80 border border-slate-800/80 flex items-center gap-2 text-slate-400 text-xs shadow-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Coach is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-center justify-between gap-3">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-[11px] transition cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Starter Prompts Suggestions */}
          <div className="px-4 sm:px-6 pt-3 pb-2 border-t border-slate-800/80 bg-slate-950/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Compass className="w-3 h-3 text-purple-400" />
              <span>Suggested Topics</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={sending}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-purple-500/30 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/80">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  placeholder="Ask your coach anything (e.g. 'I only have 15 minutes today')..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                disabled={sending || !inputText.trim()}
                onClick={() => handleSendMessage()}
                className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer flex items-center justify-center gap-1.5"
                title="Send message"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

