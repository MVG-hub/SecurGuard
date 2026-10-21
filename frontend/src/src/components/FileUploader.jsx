import { useState, useRef, useCallback } from 'react'
import {
  Upload, FolderOpen, X, FileText, Archive,
  ChevronRight, AlertTriangle, Loader2, FlaskConical,
  CheckCircle2, Plus
} from 'lucide-react'
import api from '../api.js'

const IGNORED_DIRS = new Set(['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build'])

// ---------------------------------------------------------------------------
// Demo test files — embedded directly so evaluators can run instantly
// ---------------------------------------------------------------------------
const DEMO_FILES = [
  {
    relativePath: 'test_demo/src/config/secrets.env',
    content: `# Demo Test File — SecurCode Evaluator
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
GITHUB_TOKEN=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GOOGLE_API_KEY=AIzaSyDummyGoogleCloudAPIKeyForTestingOnly12
db_pass='supersecretpassword123'
api_key='my-super-secret-api-key-value-here'
SLACK_TOKEN=xoxb-1234567890-abcdefghij
`,
  },
  {
    relativePath: 'test_demo/src/controllers/userController.py',
    content: `"""Vulnerable controller — SecurCode evaluator demo."""
import sqlite3, subprocess, pickle

def get_user(user_id):
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = " + user_id)
    return cursor.fetchone()

def run_user_command(user_input):
    result = eval(user_input)
    return result

def execute_dynamic(code):
    exec(code)

def run_shell(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True).stdout

def load_data(data):
    return pickle.loads(data)
`,
  },
  {
    relativePath: 'test_demo/src/utils/helpers.js',
    content: `// Demo JS file with hardcoded secrets
const config = {
  apiKey: 'my-super-secret-api-key-value-here',
  awsKey: 'AKIAIOSFODNN7EXAMPLE',
  githubToken: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
};

function dangerousEval(userCode) {
  return eval(userCode); // SAST: eval usage
}
`,
  },
]

// ---------------------------------------------------------------------------
// Recursive folder reader via FileSystem API
// ---------------------------------------------------------------------------
async function readEntry(entry, basePath = '') {
  const relPath = basePath ? `${basePath}/${entry.name}` : entry.name
  if (entry.isFile) {
    return new Promise((resolve) => entry.getFile((file) => resolve([{ file, relativePath: relPath }])))
  }
  if (entry.isDirectory) {
    if (IGNORED_DIRS.has(entry.name)) return []
    return new Promise((resolve) => {
      const reader = entry.createReader()
      const all = []
      const readBatch = () => {
        reader.readEntries(async (entries) => {
          if (!entries.length) {
            resolve((await Promise.all(all.map(e => readEntry(e, relPath)))).flat())
            return
          }
          all.push(...entries)
          readBatch()
        })
      }
      readBatch()
    })
  }
  return []
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  const colors = { py: 'text-yellow-400', js: 'text-yellow-300', env: 'text-emerald-400', json: 'text-sky-400', sql: 'text-orange-400' }
  return colors[ext] || 'text-zinc-400'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FileUploader({ onScanComplete }) {
  const [staged, setStaged] = useState([])
  const [dragging, setDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState(0) // flash counter
  const fileInputRef = useRef()
  const folderInputRef = useRef()

  const addFiles = useCallback((entries) => {
    setStaged(prev => {
      const existing = new Set(prev.map(e => e.relativePath))
      const fresh = entries.filter(e => !existing.has(e.relativePath))
      if (fresh.length) setJustAdded(fresh.length)
      return [...prev, ...fresh]
    })
    setError('')
  }, [])

  // Drop handler
  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    const items = [...e.dataTransfer.items]
    const collected = []
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.()
      if (!entry) continue
      collected.push(...(await readEntry(entry)))
    }
    if (collected.length) addFiles(collected)
  }, [addFiles])

  // Regular file input
  const handleFileInput = (e) => {
    const entries = [...e.target.files].map(f => ({
      file: f,
      relativePath: f.webkitRelativePath || f.name,
    }))
    addFiles(entries)
    e.target.value = ''
  }

  // Load demo files
  const loadDemo = () => {
    const entries = DEMO_FILES.map(({ relativePath, content }) => {
      const blob = new Blob([content], { type: 'text/plain' })
      const fileName = relativePath.split('/').pop()
      const file = new File([blob], fileName, { type: 'text/plain' })
      return { file, relativePath }
    })
    setStaged([])
    setTimeout(() => addFiles(entries), 50)
    setError('')
  }

  const removeFile = (idx) => setStaged(prev => prev.filter((_, i) => i !== idx))
  const clearAll = () => { setStaged([]); setJustAdded(0) }

  // Submit scan
  const handleScan = async () => {
    if (!staged.length) return
    setScanning(true)
    setProgress(5)
    setProgressLabel('Preparing files…')
    setError('')

    const formData = new FormData()
    const paths = []
    for (const { file, relativePath } of staged) {
      formData.append('files', file, file.name)
      paths.push(relativePath)
    }
    formData.append('relative_paths', JSON.stringify(paths))

    try {
      setProgress(20)
      setProgressLabel('Uploading…')
      const res = await api.post('/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.round((evt.loaded / evt.total) * 50)
            setProgress(20 + pct)
            setProgressLabel(`Uploading… ${20 + pct}%`)
          }
        },
      })
      setProgress(90)
      setProgressLabel('Analysing…')
      await new Promise(r => setTimeout(r, 400))
      setProgress(100)
      setProgressLabel('Complete!')
      onScanComplete(res.data)
      setStaged([])
      setJustAdded(0)
    } catch (err) {
      setError(err.response?.data?.detail || 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
      setProgress(0)
      setProgressLabel('')
    }
  }

  const totalSize = staged.reduce((s, e) => s + (e.file?.size || 0), 0)
  const isZip = staged.length === 1 && staged[0].file.name.endsWith('.zip')
  const hasFiles = staged.length > 0

  return (
    <div className="space-y-4">

      {/* ---------------------------------------------------------------- */}
      {/* Demo banner */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between bg-zinc-900/60 border border-amber-500/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-200">Evaluator Demo</p>
            <p className="text-xs text-zinc-500">Instantly load 3 pre-built vulnerable files covering all detection rules</p>
          </div>
        </div>
        <button
          onClick={loadDemo}
          className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-semibold px-4 py-2 rounded-lg transition shrink-0"
        >
          <FlaskConical className="w-4 h-4" />
          Load Demo Files
        </button>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Drop zone */}
      {/* ---------------------------------------------------------------- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragging
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
            : hasFiles
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 cursor-pointer'
        }`}
        onClick={() => !hasFiles && fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
        <input ref={folderInputRef} type="file" className="hidden" webkitdirectory="true" multiple onChange={handleFileInput} />

        {hasFiles ? (
          /* ---- Files are staged: show compact summary inside drop zone ---- */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-300">
                  {staged.length} file{staged.length !== 1 ? 's' : ''} ready to scan
                  {justAdded > 0 && (
                    <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      +{justAdded} added
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{formatBytes(totalSize)} total · Drop more files to add</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add More
            </button>
          </div>
        ) : (
          /* ---- Empty state ---- */
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <div className={`p-4 rounded-full ${dragging ? 'bg-sky-500/20' : 'bg-zinc-800'}`}>
              <Upload className={`w-8 h-8 ${dragging ? 'text-sky-400' : 'text-zinc-400'}`} />
            </div>
            <div>
              <p className="text-zinc-200 font-medium">
                {dragging ? 'Release to add files' : 'Drop files, folders, or a '}
                {!dragging && <span className="text-sky-400">.zip</span>}
                {!dragging && ' archive here'}
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                Supports: .py .js .ts .env .json .yml .xml .sql .sh and more
              </p>
            </div>
            <div className="flex gap-3 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition"
              >
                <FileText className="w-4 h-4" /> Select Files
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click() }}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition"
              >
                <FolderOpen className="w-4 h-4" /> Select Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Staged file list */}
      {/* ---------------------------------------------------------------- */}
      {hasFiles && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
            <div className="flex items-center gap-3">
              {isZip
                ? <Archive className="w-4 h-4 text-amber-400" />
                : <FileText className="w-4 h-4 text-sky-400" />
              }
              <span className="text-sm font-medium text-zinc-300">
                {staged.length} file{staged.length !== 1 ? 's' : ''} staged
              </span>
              <span className="text-xs text-zinc-500">({formatBytes(totalSize)})</span>
            </div>
            <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-red-400 transition">
              Clear all
            </button>
          </div>

          {/* File list */}
          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-800/40">
            {staged.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-zinc-800/30 group">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span className={`text-xs font-mono truncate ${getFileIcon(entry.relativePath)}`}>
                    {entry.relativePath}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs text-zinc-600">{formatBytes(entry.file.size)}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {scanning && (
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  <span className="text-xs text-zinc-400">{progressLabel}</span>
                </div>
                <span className="text-xs text-zinc-500">{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2 bg-red-500/5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {/* Scan button */}
          {!scanning && (
            <div className="px-4 py-3 border-t border-zinc-800">
              <button
                onClick={handleScan}
                className="w-full bg-sky-500 hover:bg-sky-400 active:scale-[0.99] text-white font-semibold py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Upload className="w-4 h-4" />
                Scan All {staged.length} File{staged.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
