# SecurCode — Security Analysis Platform

A production-ready, full-stack security scanner that detects leaked API keys, hardcoded credentials, high-entropy secrets, and dangerous code patterns across uploaded files, folders, and ZIP archives.

---

## Architecture

```
SecurCode/
├── backend/              # Python FastAPI backend
│   ├── app.py            # API routes & scan orchestration
│   ├── auth.py           # JWT authentication helpers
│   ├── database.py       # SQLAlchemy models (User, ScanReport)
│   ├── scanner.py        # Multi-layer scan engine
│   └── requirements.txt
├── frontend/             # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js        # Axios instance with JWT interceptor
│   │   └── components/
│   │       ├── AuthPage.jsx       # Login / Register
│   │       ├── Dashboard.jsx      # Main dashboard + metrics
│   │       ├── FileUploader.jsx   # Drag-drop, folder, ZIP upload
│   │       ├── ScanResults.jsx    # Findings table + export
│   │       └── HistoricalLog.jsx  # Scan history + drill-down
│   ├── index.html
│   └── package.json
└── test_data/            # Sample vulnerable files for testing
    └── src/
        ├── config/secrets.env
        └── controllers/userController.py
```

---

## Quick Start

### 1. Backend

**Windows (PowerShell) — run each line separately:**
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**macOS / Linux:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`.

---

## Security Scan Engine

| Layer | Technique | Detects |
|---|---|---|
| **A — Signature Matching** | Regex rules | AWS keys, GitHub PATs, Google API keys, Slack tokens, private keys, generic credentials |
| **B — Entropy Analysis** | Shannon entropy > 4.5 | Unknown/novel high-entropy secrets and encoded tokens |
| **C — SAST** | Pattern matching | SQL injection, `eval()`, `exec()`, `pickle.loads()`, `subprocess shell=True` |

### Severity Scoring

| Severity | Penalty |
|---|---|
| CRITICAL | −25 pts |
| HIGH | −15 pts |
| MEDIUM | −5 pts |
| LOW | −2 pts |

Score = `max(0, 100 − Σ penalties)`. A score of **>80%** is green (Healthy), **50–80%** is yellow (At Risk), and **<50%** is red (Critical).

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/scan` | Yes | Upload files/folder/ZIP and scan |
| GET | `/api/scans` | Yes | List user's scan history |
| GET | `/api/scans/{id}` | Yes | Get full findings for a scan |
| DELETE | `/api/scans/{id}` | Yes | Delete a scan report |

---

## Testing with Sample Data

1. Start the backend and frontend.
2. Register a new account.
3. On the dashboard, click **Select Folder** and pick the `test_data/` directory.
4. Click **Scan All Files**.
5. The scanner will detect:
   - AWS Access Key ID (CRITICAL)
   - GitHub PAT (CRITICAL)
   - Google Cloud API Key (HIGH)
   - Generic hardcoded credentials (HIGH × 3)
   - SQL Injection risk (HIGH)
   - `eval()` usage (HIGH)
   - `exec()` usage (HIGH)
   - `pickle.loads()` usage (HIGH)
   - `subprocess shell=True` (MEDIUM)
   - High-entropy strings (MEDIUM)

---

## Dashboard Features

- **Security Posture Score** — Animated SVG dial showing 0–100% health rating
- **Metric Cards** — Total scans, active critical/high alerts, clean files rate
- **Unified Upload** — Drag-drop, multi-file, folder traversal (auto-skips `node_modules/`, `.git/`, `venv/`, etc.), ZIP archives
- **Interactive Findings** — Expandable code context drawer per finding with masked secret snippets
- **One-Click Export** — Download findings as JSON or plain-text audit report
- **Copy Fix Buttons** — Per-finding remediation copy button
- **Historical Log** — Full scan history table with drill-down summaries, View Report, and Delete actions
- **Filter & Search** — Real-time filter by severity and search by file path or rule name

---

## Security Notes

- All uploaded files are written to an isolated `tempfile.mkdtemp()` directory and deleted immediately after scanning.
- ZIP Slip / path traversal attacks are blocked via `os.path.realpath()` boundary checks.
- Passwords are hashed with bcrypt via `passlib`.
- JWT tokens expire after 24 hours.
- In production, replace `SECRET_KEY` in `auth.py` with an environment variable.
