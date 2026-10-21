import { useState } from 'react'
import {
  Clock, FolderOpen, FileText, Trash2, Eye, ChevronDown, ChevronUp,
  ShieldAlert, AlertTriangle, Info, Shield
} from 'lucide-react'
import api from '../api.js'

function ScoreBadge({ score }) {
  const color = score > 80
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : score >= 50
    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
    : 'bg-red-500/20 text-red-300 border-red-500/40'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score}%
    </span>
  )
}

function MiniSeverity({ label, count, colorClass }) {
  if (!count) return null
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {count} {label}
    </span>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoricalLog({ scans, onRefresh, onViewReport }) {
  const [deleting, setDeleting] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scan report?')) return
    setDeleting(id)
    try {
      await api.delete(`/scans/${id}`)
      onRefresh()
    } finally {
      setDeleting(null)
    }
  }

  const handleView = async (id) => {
    setLoadingId(id)
    try {
      const res = await api.get(`/scans/${id}`)
      onViewReport(res.data)
    } finally {
      setLoadingId(null)
    }
  }

  if (!scans || scans.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">No scan history yet. Run your first scan above.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Batch / Date</span>
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Files</span>
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Severity Distribution</span>
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Score</span>
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-center">Actions</span>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {scans.map((scan) => (
          <div key={scan.id}>
            {/* Main row */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-zinc-800/20 transition">
              {/* Batch + date */}
              <div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-sm font-medium text-zinc-200 truncate">{scan.batch_name}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-zinc-600" />
                  <span className="text-xs text-zinc-500">{formatDate(scan.created_at)}</span>
                </div>
              </div>

              {/* Files count */}
              <div className="flex items-center justify-center md:justify-center">
                <span className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-300">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  {scan.total_files_scanned}
                </span>
              </div>

              {/* Severity distribution */}
              <div className="flex flex-wrap gap-1.5">
                <MiniSeverity label="C" count={scan.critical_count} colorClass="bg-red-500/20 text-red-300 border-red-500/40" />
                <MiniSeverity label="H" count={scan.high_count} colorClass="bg-orange-500/20 text-orange-300 border-orange-500/40" />
                <MiniSeverity label="M" count={scan.medium_count} colorClass="bg-yellow-500/20 text-yellow-300 border-yellow-500/40" />
                <MiniSeverity label="L" count={scan.low_count} colorClass="bg-sky-500/20 text-sky-300 border-sky-500/40" />
                {!scan.critical_count && !scan.high_count && !scan.medium_count && !scan.low_count && (
                  <span className="text-xs text-emerald-400 font-medium">Clean</span>
                )}
              </div>

              {/* Score */}
              <div className="flex justify-center">
                <ScoreBadge score={scan.security_score} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => handleView(scan.id)}
                  disabled={loadingId === scan.id}
                  className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {loadingId === scan.id ? '…' : 'View'}
                </button>
                <button
                  onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                  className="text-zinc-600 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-800 transition"
                  title="Drill-down details"
                >
                  {expanded === scan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDelete(scan.id)}
                  disabled={deleting === scan.id}
                  className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition disabled:opacity-50"
                  title="Delete scan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drill-down summary row */}
            {expanded === scan.id && (
              <div className="border-t border-zinc-800 bg-zinc-950/30 px-5 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'CRITICAL', count: scan.critical_count, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
                    { label: 'HIGH',     count: scan.high_count,     icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                    { label: 'MEDIUM',   count: scan.medium_count,   icon: Info,    color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                    { label: 'LOW',      count: scan.low_count,      icon: Shield,  color: 'text-sky-400', bg: 'bg-sky-500/10' },
                  ].map(({ label, count, icon: Icon, color, bg }) => (
                    <div key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${bg} border border-zinc-800`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                      <div>
                        <p className={`text-lg font-bold ${color}`}>{count}</p>
                        <p className="text-xs text-zinc-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {scan.total_findings} total finding{scan.total_findings !== 1 ? 's' : ''} across {scan.total_files_scanned} file{scan.total_files_scanned !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => handleView(scan.id)}
                    className="text-xs text-sky-400 hover:text-sky-300 transition"
                  >
                    View full report →
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
