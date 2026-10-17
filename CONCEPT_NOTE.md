# SecurCode — Concept Note

## Project Title
**SecurCode: An AI-Augmented Multi-Layer Source Code Security Analysis Platform**

---

## 1. Problem Statement

Modern software development teams commit sensitive material — API keys, access tokens, database passwords, and cryptographic private keys — directly into source code repositories at an alarming rate. A 2023 GitGuardian report found that **over 10 million secrets** were exposed in public GitHub commits in a single year, a 67% year-on-year increase. Simultaneously, insecure coding patterns such as SQL injection vulnerabilities, unsafe deserialization, and arbitrary code execution via `eval()` continue to be among the most exploited attack vectors (OWASP Top 10).

Existing solutions either require expensive enterprise licenses (e.g., Veracode, Snyk), operate only as CI/CD pipeline hooks (e.g., git-secrets, truffleHog), or lack actionable remediation guidance. There is no accessible, self-hosted, full-stack platform that combines secret detection, entropy analysis, and static application security testing (SAST) with an interactive dashboard designed for both developers and security evaluators.

---

## 2. Proposed Solution

**SecurCode** is a production-ready, self-hosted web application that enables authenticated users to upload entire project codebases — via files, folders, or ZIP archives — and receive instant, structured security analysis across three detection layers:

| Layer | Technique | Examples Detected |
|---|---|---|
| **Signature Matching** | Regex rule engine | AWS keys, GitHub PATs, Google API keys, Slack tokens, private keys |
| **Entropy Analysis** | Shannon entropy (H > 4.5) | Novel/unknown high-entropy secrets, encoded credentials |
| **SAST** | Pattern matching | SQL injection, `eval()`, `exec()`, `pickle.loads()`, `subprocess shell=True` |

Every finding is enriched with its exact file path, line number, a masked code snippet, severity classification (CRITICAL / HIGH / MEDIUM / LOW), and a concrete remediation recommendation.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                  │
│  AuthPage │ Dashboard │ FileUploader │ ScanResults       │
│  HistoricalLog │ SVG Charts (Donut, Bar, Sparkline)      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS / JSON (JWT Bearer)
┌─────────────────────▼───────────────────────────────────┐
│                  FastAPI Backend                          │
│  /api/auth/register  /api/auth/login  /api/auth/me       │
│  /api/scan   /api/scans   /api/scans/{id}  DELETE        │
└───────────┬──────────────────────────┬──────────────────┘
            │                          │
  ┌─────────▼──────────┐    ┌──────────▼─────────────────┐
  │   scanner.py        │    │   SQLite (SQLAlchemy ORM)   │
  │  Regex + Entropy    │    │   User  │  ScanReport       │
  │  + SAST engine      │    └────────────────────────────┘
  └─────────────────────┘
```

**Security Controls:**
- Passwords hashed with bcrypt (cost factor 12)
- JWT authentication (HS256, 24-hour expiry)
- Uploaded files isolated in `tempfile.mkdtemp()` and deleted post-scan
- ZIP Slip / path traversal protection via `os.path.realpath()` boundary checks
- All secrets loaded from `.env` — never hardcoded in source

---

## 4. Key Features

### Security Dashboard
- **Security Posture Score (0–100%)** — animated SVG dial; penalises CRITICAL (−25), HIGH (−15), MEDIUM (−5), LOW (−2)
- **4 Metric Cards** — total scans, posture score, active critical/high alerts, clean file rate
- **Analytics Charts** — score trend sparkline, all-time findings donut, per-scan stacked bar chart (all pure SVG, zero extra dependencies)

### Upload & Scanning
- Drag-and-drop support for files, recursive folders (HTML5 FileSystem API), and ZIP archives
- Automatic exclusion of `node_modules/`, `.git/`, `venv/`, `__pycache__/`
- Real-time progress bar with labelled stages (Preparing → Uploading → Analysing → Complete)
- Embedded **Evaluator Demo** button that pre-loads 3 vulnerable files covering all detection rules

### Results & Reporting
- Expandable **Code Context Drawer** per finding with masked secret snippets
- **Copy Fix Recommendation** button per finding
- **Export Report** — JSON or plain-text audit format
- Severity filter chips + real-time search by file path or rule name

### History & Audit
- Full per-user **Historical Scan Log** (scoped strictly to authenticated user ID)
- Drill-down summary panel per scan row
- View Report (reloads findings) and Delete actions

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, SQLite |
| Authentication | python-jose (JWT), passlib/bcrypt |
| Scanner Engine | Pure Python (re, math, os, zipfile) |
| Frontend | React 18, Vite, Tailwind CSS, Lucide React, Axios |
| Charts | Pure SVG (no Chart.js / D3 — zero extra bundle weight) |
| Environment | python-dotenv (.env), PowerShell start script |

---

## 6. Security & Privacy Design Principles

1. **Zero persistence of uploaded code** — files are deleted immediately after scanning; only metadata and finding descriptions are stored
2. **User isolation** — every scan record is tied to `user_id` via a foreign key; API enforces ownership on all read/delete operations
3. **Secret masking** — high-entropy tokens and matched secrets are partially masked (`AKIA1234********`) before storage or display
4. **Environment-driven configuration** — `SECRET_KEY`, `DATABASE_URL`, and `ALLOWED_ORIGINS` are loaded from `.env`, never from source code
5. **Input sanitisation** — all uploaded paths are validated against directory traversal patterns before writing to disk

---

## 7. Target Users

- **Development teams** auditing codebases before open-sourcing or deploying
- **Security engineers** conducting pre-commit or pre-release code reviews
- **Students & educators** learning about secret management and SAST
- **Hackathon evaluators** assessing code quality for submissions

---

## 8. Impact & Value Proposition

| Metric | Value |
|---|---|
| Detection layers | 3 (Signature + Entropy + SAST) |
| Rule coverage | 7 signature rules + 5 SAST rules + entropy |
| Supported file types | 14 (.py, .js, .ts, .env, .json, .yml, .xml, .sql, .sh, …) |
| Time to first scan | < 30 seconds from account creation |
| Dependencies added for charts | 0 (pure SVG) |
| External API calls | 0 (fully offline/self-hosted) |

SecurCode democratises source code security scanning — making enterprise-grade detection accessible to any developer or team without cloud subscriptions, API rate limits, or code privacy concerns.

---

## 9. Future Roadmap

- [ ] GitHub/GitLab repository URL scanning (clone + scan)
- [ ] Pre-commit hook integration (`securcode-cli`)
- [ ] Slack / email notifications for CRITICAL findings
- [ ] PDF export with company branding
- [ ] Role-based access control (Team / Admin)
- [ ] Additional SAST rules (XSS, SSRF, insecure random)
- [ ] CI/CD plugin (GitHub Actions, Jenkins)

---

*SecurCode — Secure your code before it ships.*
