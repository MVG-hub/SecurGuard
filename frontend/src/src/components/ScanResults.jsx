import { useState } from 'react'
import {
  X, Download, Filter, Search, Copy, Check, ChevronDown, ChevronUp,
  FileCode, AlertTriangle, ShieldAlert, Shield, Info
} from 'lucide-react'

const SEV_CONFIG = {
  CRITICAL: { label: 'CRITICAL', color: 'bg-red-500/20 text-red-300 border-red-500/40', dot: 'bg-red-500', icon: ShieldAlert, ring: 'border-red-500/30' },
  HIGH:     { label: 'HIGH',     color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-500', icon: AlertTriangle, ring: 'border-orange-500/30' },
  MEDIUM:   { label: 'MEDIUM',   color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot: 'bg-yellow-500', icon: Info, ring: 'border-yellow-500/30' },
  LOW:      { label: 'LOW',      color: 'bg-sky-500/20 text-sky-300 border-sky-500/40', dot: 'bg-sky-400', icon: Shield, ring: 'border-sky-500/30' },
}

function SeverityBadge({ sev }) {
  const cfg = SEV_CONFIG[sev] || SEV_CONFIG.LOW
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function FindingCard({ finding }) {
  const [open, setOpen] = useState(false)
  const cfg = SEV_CONFIG[finding.severity] || SEV_CONFIG.LOW

  return (
    <div className={`bg-zinc-900 border rounded-xl overflow-hidden ${cfg.ring}`}>
      {/* Header row */}
      <button
        className="w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-zinc-800/40 transition"
        onClick={() => setOpen(v => !v)}
      >
        <SeverityBadge sev={finding.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-100">{finding.rule_name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <FileCode className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-xs font-mono text-sky-400 truncate">
              {finding.file}:{finding.line}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{finding.description}</p>
        </div>
        <div className="shrink-0 text-zinc-500">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded code context drawer */}
      {open && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {/* Code snippet */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Code Snippet</span>
              <div className="flex gap-2">
                <span className="text-xs font-mono text-zinc-600">Line {finding.line}</span>
                <CopyButton text={finding.snippet} label="Copy Snippet" />
              </div>
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
              <span className="text-zinc-600 select-none mr-3">{finding.line}</span>{finding.snippet}
            </pre>
          </div>

          {/* Remediation */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Remediation</span>
              <CopyButton text={finding.remediation} label="Copy Fix Recommendation" />
            </div>
            <p className="text-sm text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5 leading-relaxed">
              {finding.remediation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------
function exportJSON(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `securcode-report-${report.id || Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportText(report) {
  const lines = [
    `SecurCode Security Report`,
    `Generated: ${new Date().toISOString()}`,
    `Batch: ${report.batch_name}`,
    `Files Scanned: ${report.total_files_scanned}`,
    `Security Score: ${report.security_score}%`,
    `Findings: ${report.total_findings} (CRITICAL: ${report.critical_count}, HIGH: ${report.high_count}, MEDIUM: ${report.medium_count}, LOW: ${report.low_count})`,
    '',
    '='.repeat(80),
    '',
    ...(report.findings || []).flatMap((f, i) => [
      `[${i + 1}] ${f.severity} — ${f.rule_name}`,
      `    File: ${f.file}:${f.line}`,
      `    Description: ${f.description}`,
      `    Snippet: ${f.snippet}`,
      `    Remediation: ${f.remediation}`,
      '',
    ]),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `securcode-report-${report.id || Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ScanResults({ report, onClear }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  const findings = report.findings || []

  const filtered = findings.filter(f => {
    const matchSev = filter === 'ALL' || f.severity === filter
    const q = search.toLowerCase()
    const matchSearch = !q || f.file.toLowerCase().includes(q) || f.rule_name.toLowerCase().includes(q)
    return matchSev && matchSearch
  })

  const scoreColor = report.security_score > 80
    ? 'text-emerald-400' : report.security_score >= 50
    ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              {report.batch_name}
            </h2>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-xs text-zinc-500">{report.total_files_scanned} files scanned</span>
              <span className="text-xs text-zinc-500">{report.total_findings} total findings</span>
              <span className={`text-xs font-bold ${scoreColor}`}>Score: {report.security_score}%</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { sev: 'CRITICAL', count: report.critical_count },
                { sev: 'HIGH',     count: report.high_count },
                { sev: 'MEDIUM',   count: report.medium_count },
                { sev: 'LOW',      count: report.low_count },
              ].map(({ sev, count }) => (
                <span key={sev} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${SEV_CONFIG[sev].color}`}>
                  {count} {sev}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" /> Export Report
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 min-w-max overflow-hidden">
                  <button
                    onClick={() => { exportJSON(report); setShowExportMenu(false) }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => { exportText(report); setShowExportMenu(false) }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition border-t border-zinc-800"
                  >
                    Export as Text / Audit Report
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClear}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg transition"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by file path or rule name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                filter === f
                  ? f === 'ALL' ? 'bg-sky-500 text-white' : `${SEV_CONFIG[f]?.color || ''} border`
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Findings */}
      {findings.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-200">No vulnerabilities detected</h3>
          <p className="text-zinc-500 text-sm mt-1">All scanned files passed security checks.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 border border-zinc-800 rounded-xl">
          <Filter className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">No findings match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Showing {filtered.length} of {findings.length} finding{findings.length !== 1 ? 's' : ''}
          </p>
          {filtered.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  )
}
