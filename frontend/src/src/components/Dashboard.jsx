import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, ShieldAlert, LogOut, RefreshCw,
  Activity, BarChart3, AlertTriangle, CheckCircle2,
  TrendingUp, Bug
} from 'lucide-react'
import api from '../api.js'
import FileUploader from './FileUploader.jsx'
import ScanResults from './ScanResults.jsx'
import HistoricalLog from './HistoricalLog.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, subtext, color, bgColor, borderColor }) {
  return (
    <div className={`bg-zinc-900 border ${borderColor} rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Posture Dial (SVG)
// ─────────────────────────────────────────────────────────────────────────────
function PostureDial({ score }) {
  const color = score > 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171'
  const r = 32, circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Security Posture</p>
      <div className="flex items-center gap-4">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
          <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 42 42)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          <text x="42" y="47" textAnchor="middle" fill={color} fontSize="15" fontWeight="700">{score}%</text>
        </svg>
        <div>
          <p className="text-lg font-bold" style={{ color }}>
            {score > 80 ? 'Healthy' : score >= 50 ? 'At Risk' : 'Critical'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Latest scan posture</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Sparkline (pure SVG — no deps)
// ─────────────────────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#38bdf8', height = 36, width = 120 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]}
        r="3" fill={color} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar Chart (SVG) — severity distribution across all scans
// ─────────────────────────────────────────────────────────────────────────────
function SeverityBarChart({ scans }) {
  const last8 = [...scans].reverse().slice(-8)
  if (!last8.length) return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">No scan data yet</div>
  )
  const maxFindings = Math.max(...last8.map(s => s.total_findings), 1)
  const W = 100 / last8.length

  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-28 px-2">
        {last8.map((scan, i) => {
          const total = scan.total_findings || 0
          const pctC = (scan.critical_count / Math.max(total, 1)) * 100
          const pctH = (scan.high_count / Math.max(total, 1)) * 100
          const pctM = (scan.medium_count / Math.max(total, 1)) * 100
          const pctL = (scan.low_count / Math.max(total, 1)) * 100
          const barH = total === 0 ? 4 : Math.max(12, (total / maxFindings) * 96)
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs whitespace-nowrap shadow-xl">
                  <p className="text-zinc-300 font-medium truncate max-w-[100px]">{scan.batch_name}</p>
                  <p className="text-zinc-500">{total} findings</p>
                  {scan.critical_count > 0 && <p className="text-red-400">{scan.critical_count} CRITICAL</p>}
                  {scan.high_count > 0 && <p className="text-orange-400">{scan.high_count} HIGH</p>}
                </div>
                <div className="w-2 h-2 bg-zinc-800 border-r border-b border-zinc-700 rotate-45 -mt-1" />
              </div>
              {/* Stacked bar */}
              <div className="w-full rounded-sm overflow-hidden flex flex-col-reverse cursor-pointer"
                style={{ height: `${barH}px` }}>
                {total === 0
                  ? <div className="flex-1 bg-emerald-500/30 rounded-sm" />
                  : <>
                    <div style={{ height: `${pctL}%` }} className="bg-sky-500/70" />
                    <div style={{ height: `${pctM}%` }} className="bg-yellow-500/70" />
                    <div style={{ height: `${pctH}%` }} className="bg-orange-500/80" />
                    <div style={{ height: `${pctC}%` }} className="bg-red-500" />
                  </>
                }
              </div>
              <span className="text-[9px] text-zinc-600 truncate w-full text-center">
                #{scans.length - scans.indexOf(scan)}
              </span>
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-2">
        {[['bg-red-500','CRITICAL'],['bg-orange-500/80','HIGH'],['bg-yellow-500/70','MEDIUM'],['bg-sky-500/70','LOW']].map(([cls, lbl]) => (
          <div key={lbl} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
            <span className="text-[10px] text-zinc-500">{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut chart — finding type breakdown
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart({ scans }) {
  const totals = scans.reduce((acc, s) => {
    acc.critical += s.critical_count
    acc.high += s.high_count
    acc.medium += s.medium_count
    acc.low += s.low_count
    return acc
  }, { critical: 0, high: 0, medium: 0, low: 0 })

  const total = totals.critical + totals.high + totals.medium + totals.low
  if (total === 0) return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">No findings yet</div>
  )

  const segs = [
    { key: 'critical', label: 'Critical', val: totals.critical, color: '#ef4444' },
    { key: 'high',     label: 'High',     val: totals.high,     color: '#f97316' },
    { key: 'medium',   label: 'Medium',   val: totals.medium,   color: '#eab308' },
    { key: 'low',      label: 'Low',      val: totals.low,      color: '#38bdf8' },
  ].filter(s => s.val > 0)

  const cx = 52, cy = 52, r = 36, stroke = 14
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 104 104">
        {segs.map((seg) => {
          const pct = seg.val / total
          const dash = pct * circ
          const el = (
            <circle key={seg.key} cx={cx} cy={cy} r={r}
              fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          )
          offset += dash
          return el
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e4e4e7" fontSize="14" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#71717a" fontSize="9">findings</text>
      </svg>
      <div className="space-y-1.5">
        {segs.map(seg => (
          <div key={seg.key} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-zinc-400">{seg.label}</span>
            <span className="text-xs font-bold ml-auto" style={{ color: seg.color }}>{seg.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Score trend line
// ─────────────────────────────────────────────────────────────────────────────
function ScoreTrend({ scans }) {
  const last10 = [...scans].reverse().slice(-10)
  const scores = last10.map(s => s.security_score)
  const latest = scores[scores.length - 1] ?? 100
  const prev = scores[scores.length - 2]
  const delta = prev != null ? latest - prev : null
  const color = latest > 80 ? '#34d399' : latest >= 50 ? '#fbbf24' : '#f87171'

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{latest}%</p>
        {delta != null && (
          <p className={`text-xs mt-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs prev scan
          </p>
        )}
      </div>
      <Sparkline data={scores} color={color} width={100} height={36} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [scans, setScans] = useState([])
  const [activeReport, setActiveReport] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  // Track which user's data is loaded — clear on user change
  const loadedForUser = useRef(null)

  const fetchScans = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await api.get('/scans')
      setScans(res.data)
      if (user) loadedForUser.current = user.email
    } catch {
      // silence
    } finally {
      setLoadingHistory(false)
    }
  }, [user])

  // Clear stale data immediately if a different user is now logged in
  useEffect(() => {
    if (user && loadedForUser.current && loadedForUser.current !== user.email) {
      setScans([])
      setActiveReport(null)
      loadedForUser.current = null
    }
    fetchScans()
  }, [fetchScans, user])

  const handleScanComplete = (report) => {
    setActiveReport(report)
    fetchScans()
  }

  const handleViewReport = (report) => {
    setActiveReport(report)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Metrics (per-user, computed from fresh scans state) ─────────────────
  const totalScans = scans.length

  // Security score: use active report if present, else latest scan, else 100
  const latestScore = activeReport?.security_score ?? (scans[0]?.security_score ?? 100)

  // Critical + High across ALL scans for this user
  const activeAlerts = scans.reduce((s, r) => s + r.critical_count + r.high_count, 0)

  // Clean files rate: per-file granularity
  // A file is "clean" if it contributed 0 findings. We approximate from scan totals:
  // scannedFiles that had ANY finding = total_findings > 0 ? total_files_scanned : 0
  // This is conservative. Better: track per-scan clean vs dirty files.
  const totalFilesAll = scans.reduce((s, r) => s + r.total_files_scanned, 0)
  // For a scan: dirty files = min(total_findings, total_files_scanned)
  // because each finding is on a different file (worst case). Use actual finding count
  // capped at file count as a proxy for affected files.
  const dirtyFilesApprox = scans.reduce((s, r) => {
    // Use the scan's finding count as proxy for affected files, capped at file count
    return s + Math.min(r.total_findings, r.total_files_scanned)
  }, 0)
  const cleanRate = totalFilesAll > 0
    ? Math.max(0, Math.round(((totalFilesAll - dirtyFilesApprox) / totalFilesAll) * 100))
    : 100

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">SecurCode</span>
            <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
              <Activity className="w-3 h-3" /> Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-xs text-zinc-500 truncate max-w-[220px]">{user.email}</span>
            )}
            <button onClick={fetchScans} title="Refresh"
              className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 text-sm px-3 py-1.5 rounded-lg transition">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Metric Cards ── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard icon={BarChart3} label="Total Scans Conducted" value={totalScans}
              subtext="All-time scan runs for this account"
              color="text-sky-400" bgColor="bg-sky-500/10" borderColor="border-sky-500/20" />
            <PostureDial score={latestScore} />
            <MetricCard icon={ShieldAlert} label="Active Critical & High" value={activeAlerts}
              subtext="Unresolved high-priority findings"
              color={activeAlerts > 0 ? 'text-red-400' : 'text-emerald-400'}
              bgColor={activeAlerts > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}
              borderColor={activeAlerts > 0 ? 'border-red-500/20' : 'border-emerald-500/20'} />
            <MetricCard icon={CheckCircle2} label="Clean Files Rate" value={`${cleanRate}%`}
              subtext={`${totalFilesAll} total files scanned`}
              color={cleanRate >= 80 ? 'text-emerald-400' : cleanRate >= 50 ? 'text-yellow-400' : 'text-red-400'}
              bgColor={cleanRate >= 80 ? 'bg-emerald-500/10' : cleanRate >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}
              borderColor={cleanRate >= 80 ? 'border-emerald-500/20' : cleanRate >= 50 ? 'border-yellow-500/20' : 'border-red-500/20'} />
          </div>
        </section>

        {/* ── Charts Row ── */}
        {scans.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Analytics</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Score trend */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Score Trend</p>
                </div>
                <ScoreTrend scans={scans} />
                <p className="text-xs text-zinc-600 mt-2">Last {Math.min(scans.length, 10)} scans</p>
              </div>

              {/* Findings distribution donut */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-4 h-4 text-orange-400" />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">All-Time Findings</p>
                </div>
                <DonutChart scans={scans} />
              </div>

              {/* Per-scan bar chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Findings per Scan</p>
                </div>
                <SeverityBarChart scans={scans} />
              </div>

            </div>
          </section>
        )}

        {/* ── Scan Results or Uploader ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              {activeReport ? 'Scan Results' : 'New Scan'}
            </h2>
          </div>
          {activeReport
            ? <ScanResults report={activeReport} onClear={() => setActiveReport(null)} />
            : <FileUploader onScanComplete={handleScanComplete} />
          }
        </section>

        {/* ── Historical Log ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Historical Scan Log</h2>
            </div>
            <span className="text-xs text-zinc-600">{scans.length} record{scans.length !== 1 ? 's' : ''}</span>
          </div>
          <HistoricalLog scans={scans} onRefresh={fetchScans} onViewReport={handleViewReport} />
        </section>

      </main>
    </div>
  )
}
