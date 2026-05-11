import { useState } from "react";

const STEPS = ["Filters", "Select Calls", "Transcripts"];
const CALL_TYPES = ["All", "Inbound", "Outbound"];
const TABS = ["All Calls for Specific Duration", "All Calls for Specific Number"];
const USERNAME = "ajay";
const PASSWORD = "Amazing@Vadodara390007";

function today() {
  return new Date().toISOString().split("T")[0];
}

function Badge({ color, children }) {
  const map = {
    green: ["#EAF3DE", "#3B6D11"], red: ["#FCEBEB", "#A32D2D"],
    amber: ["#FAEEDA", "#854F0B"], blue: ["#E6F1FB", "#185FA5"],
    purple: ["#EEEDFE", "#3C3489"], gray: ["#F1EFE8", "#5F5E5A"],
  };
  const [bg, fg] = map[color] || map.blue;
  return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>;
}

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 58 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0, background: i < current ? "#639922" : i === current ? "#185FA5" : "#f0f0f0", color: i <= current ? "#fff" : "#999", border: i === current ? "2px solid #185FA5" : "1px solid #ddd" }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 9, color: i === current ? "#111" : "#999", textAlign: "center", lineHeight: 1.2 }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: i < current ? "#639922" : "#ddd", margin: "0 2px", marginBottom: 18 }} />}
        </div>
      ))}
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "1rem 1.25rem", ...style }}>{children}</div>;
}

function Btn({ onClick, disabled, variant = "primary", children, style }) {
  const s = {
    primary: { background: "#185FA5", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "#333", border: "1px solid #ccc" },
    success: { background: "#3B6D11", color: "#fff", border: "none" },
    danger: { background: "#A32D2D", color: "#fff", border: "none" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...s[variant], ...style }}>{children}</button>;
}

function ProgressBar({ value, label }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 4 }}>
        <span>{label}</span><span>{value}%</span>
      </div>
      <div style={{ height: 6, background: "#e5e5e5", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: "#185FA5", borderRadius: 99, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export default function App() {
  // — Auth —
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [apiStatus, setApiStatus] = useState(null);
  const [apiChecking, setApiChecking] = useState(false);

  // — Tab —
  const [activeTab, setActiveTab] = useState(TABS[0]);

  // — Duration tab state —
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({ dateFrom: today(), dateTo: today(), callType: "All" });
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersProgress, setUsersProgress] = useState(0);
  const [calls, setCalls] = useState([]);
  const [callsProgress, setCallsProgress] = useState(0);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState("");

  // — Number tab state —
  const [customerPhone, setCustomerPhone] = useState("+61");
  const [customerCalls, setCustomerCalls] = useState([]);
  const [customerTranscripts, setCustomerTranscripts] = useState({});
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerProgress, setCustomerProgress] = useState(0);
  const [customerDownloading, setCustomerDownloading] = useState(false);
  const [customerDownloadProgress, setCustomerDownloadProgress] = useState(0);
  const [customerError, setCustomerError] = useState("");

  function showError(msg) { setError(msg); setTimeout(() => setError(""), 6000); }

  async function handleLogin() {
    setLoginError("");
    if (loginUser.trim() !== USERNAME || loginPass !== PASSWORD) {
      setLoginError("Incorrect username or password.");
      return;
    }
    setLoggedIn(true);
    // Auto check API
    setApiChecking(true);
    setApiStatus(null);
    try {
      const r = await fetch("/api/check");
      const d = await r.json();
      setApiStatus(r.ok && d.status === "ok" ? "ok" : "fail");
    } catch { setApiStatus("fail"); }
    setApiChecking(false);
    // Load users in background
    loadUsers();
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUsersProgress(30);
    try {
      const r = await fetch("/api/users");
      setUsersProgress(70);
      const d = await r.json();
      setUsers(d.users || []);
      setUsersProgress(100);
    } catch { }
    setUsersLoading(false);
  }

  async function fetchCalls() {
    setLoadingCalls(true); setCalls([]); setError(""); setCallsProgress(0);
    try {
      let allCalls = [];
      let fetchedCount = 0;
      let totalKnown = 0;

      let url = `/api/calls?per_page=50`;
      if (filters.dateFrom) url += `&from=${Math.floor(new Date(filters.dateFrom).getTime() / 1000)}`;
      if (filters.dateTo) url += `&to=${Math.floor(new Date(filters.dateTo + "T23:59:59").getTime() / 1000)}`;
      if (filters.callType !== "All") url += `&direction=${filters.callType.toLowerCase()}`;

      while (url) {
        const r = await fetch(url);
        const d = await r.json();
        const fetched = d.calls || [];
        if (!fetched.length) break;
        allCalls = [...allCalls, ...fetched];
        fetchedCount += fetched.length;

        // Use total from meta if available, otherwise keep growing
        if (d.meta?.total) totalKnown = d.meta.total;
        const total = totalKnown || fetchedCount + (fetched.length === 50 ? 50 : 0);
        setCallsProgress(Math.min(95, Math.round((fetchedCount / Math.max(total, 1)) * 100)));
        setCalls([...allCalls]);

        // Only stop when Aircall says there's no next page OR we get less than 50
        const nextLink = d.meta?.next_page_link;
        if (nextLink && fetched.length === 50) {
          const nextUrl = new URL(nextLink);
          url = `/api/calls?${nextUrl.searchParams.toString()}`;
        } else {
          url = null;
        }
      }

      // Filter by user client-side since Aircall ignores user_id param
      if (selectedUser) {
        allCalls = allCalls.filter(c => String(c.user?.id) === String(selectedUser));
      }

      setCallsProgress(100);
      if (!allCalls.length) showError("No calls found. Try a wider date range or different agent.");
      setCalls(allCalls);
      const sel = {}; allCalls.forEach(c => sel[c.id] = true);
      setSelectedCalls(sel);
    } catch (e) { showError("Failed to fetch calls: " + e.message); }
    setLoadingCalls(false);
  }

  async function downloadTranscripts() {
    setDownloading(true); setError(""); setDownloadProgress(0);
    const selected = calls.filter(c => selectedCalls[c.id]);
    const results = {};
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      try {
        const r = await fetch(`/api/transcription?id=${c.id}`);
        const d = await r.json();
        results[c.id] = d.transcription || "[No transcript available]";
      } catch { results[c.id] = "[Error fetching transcript]"; }
      setDownloadProgress(Math.round(((i + 1) / selected.length) * 100));
    }
    setTranscripts(results);
    setDownloading(false);
  }

  function downloadAllAsFile() {
    const selected = calls.filter(c => selectedCalls[c.id]);
    const lines = selected.map(c => {
      const agent = c.user?.name || c.user?.email || `Agent ${c.id}`;
      const date = c.started_at ? new Date(c.started_at * 1000).toLocaleDateString("en-IN") : "—";
      const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "—";
      const text = transcripts[c.id] || "[No transcript]";
      const customerNum = c.raw_digits || "—";
      return `==============================\nCall ID: ${c.id}\nAgent: ${agent}\nCustomer Number: ${customerNum}\nDate: ${date}\nDuration: ${dur}\nDirection: ${c.direction || "—"}\n------------------------------\n${text}\n`;
    }).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transcripts-${filters.dateFrom}-to-${filters.dateTo}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  function reset() {
    setStep(0); setCalls([]); setTranscripts({}); setSelectedCalls({});
    setError(""); setDownloadProgress(0); setCallsProgress(0);
  }

  async function fetchCustomerCalls() {
    if (!customerPhone.trim() || customerPhone === "+61") return;
    setCustomerLoading(true); setCustomerCalls([]); setCustomerTranscripts({});
    setCustomerError(""); setCustomerProgress(0);

    const cleanSearch = customerPhone.replace(/\D/g, "");
    const last9 = cleanSearch.slice(-9);
    const from = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 60 * 60;

    try {
      let allMatched = [];
      let url = `/api/customer?per_page=50&from=${from}`;
      let totalScanned = 0;
      let totalKnown = 0;

      while (url) {
        const r = await fetch(url);
        const d = await r.json();
        const calls = d.calls || [];
        if (!calls.length) break;
        totalScanned += calls.length;

        for (const c of calls) {
          const rawDigits = (c.raw_digits || "").replace(/\D/g, "");
          if (
            rawDigits === cleanSearch ||
            rawDigits.endsWith(last9) ||
            cleanSearch.endsWith(rawDigits.slice(-9))
          ) {
            allMatched.push(c);
          }
        }

        // Progress: use meta total if available, otherwise estimate from time range
        if (d.meta?.total) totalKnown = d.meta.total;
        if (totalKnown) {
          setCustomerProgress(Math.min(95, Math.round((totalScanned / totalKnown) * 100)));
        } else {
          // fallback: estimate by oldest timestamp
          const oldest = calls[calls.length - 1]?.started_at;
          if (oldest) {
            const totalRange = Math.floor(Date.now() / 1000) - from;
            const scanned = Math.floor(Date.now() / 1000) - oldest;
            setCustomerProgress(p => Math.max(p, Math.min(95, Math.round((scanned / totalRange) * 100))));
          }
        }
        setCustomerCalls([...allMatched]);

        const nextLink = d.meta?.next_page_link;
        if (nextLink && calls.length === 50) {
          const nextUrl = new URL(nextLink);
          url = `/api/customer?${nextUrl.searchParams.toString()}`;
        } else {
          url = null;
        }
      }

      setCustomerProgress(100);
      if (!allMatched.length) setCustomerError("No calls found for this number in the last 6 months.");
    } catch (e) {
      setCustomerError("Failed to fetch: " + e.message);
    }
    setCustomerLoading(false);
  }

  async function downloadCustomerTranscripts() {
    setCustomerDownloading(true); setCustomerDownloadProgress(0);
    const results = {};
    for (let i = 0; i < customerCalls.length; i++) {
      const c = customerCalls[i];
      try {
        const r = await fetch(`/api/transcription?id=${c.id}`);
        const d = await r.json();
        results[c.id] = d.transcription || "[No transcript available]";
      } catch { results[c.id] = "[Error fetching transcript]"; }
      setCustomerDownloadProgress(Math.round(((i + 1) / customerCalls.length) * 100));
    }
    setCustomerTranscripts(results);
    setCustomerDownloading(false);
  }

  function downloadCustomerAsFile() {
    const lines = customerCalls.map(c => {
      const date = c.started_at ? new Date(c.started_at * 1000).toLocaleString("en-IN") : "—";
      const agent = c.user?.name || "Unknown";
      const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "—";
      const transcript = customerTranscripts[c.id] || "No transcript";
      return `==============================\nDate: ${date}\nCustomer: ${customerPhone}\nAgent: ${agent}\nDuration: ${dur}\nDirection: ${c.direction || "—"}\n------------------------------\n${transcript}\n`;
    }).join("\n");
    const blob = new Blob([`Customer Phone: ${customerPhone}\nTotal Calls: ${customerCalls.length}\nExported: ${new Date().toLocaleString("en-IN")}\n${"═".repeat(60)}\n\n${lines}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customer-${customerPhone.replace(/\D/g, "")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }

  const selCount = Object.values(selectedCalls).filter(Boolean).length;
  const transcriptCount = Object.keys(transcripts).length;
  const noTranscriptCount = Object.values(transcripts).filter(t => t.includes("[No transcript")).length;

  // ── LOGIN SCREEN ──
  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", fontFamily: "system-ui,sans-serif" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 16, padding: "2rem 2.5rem", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, background: "#185FA5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22 }}>📞</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Aircall Transcripts</h2>
            <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>Sign in to continue</p>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Username</label>
            <input
              value={loginUser}
              onChange={e => setLoginUser(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Username"
              autoComplete="username"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Password</label>
            <input
              type="password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              autoComplete="current-password"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 13 }}
            />
          </div>
          {loginError && <div style={{ background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#A32D2D", marginBottom: 14 }}>{loginError}</div>}
          <button onClick={handleLogin} style={{ width: "100%", padding: "10px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN APP ──
  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui,sans-serif", color: "#111" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Aircall Transcripts</h2>
          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>Welcome, {USERNAME}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {apiChecking && <Badge color="amber">Checking API…</Badge>}
          {!apiChecking && apiStatus === "ok" && <Badge color="green">API Connected ✓</Badge>}
          {!apiChecking && apiStatus === "fail" && <Badge color="red">API Failed</Badge>}
          <Btn onClick={() => setLoggedIn(false)} variant="secondary" style={{ fontSize: 12, padding: "5px 12px" }}>Sign out</Btn>
        </div>
      </div>

      {/* User loading progress */}
      {usersLoading && <ProgressBar value={usersProgress} label="Loading agent list…" />}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, margin: "16px 0 20px", borderBottom: "1px solid #e5e5e5" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", background: "none", border: "none", borderBottom: activeTab === t ? "2px solid #185FA5" : "2px solid transparent", color: activeTab === t ? "#185FA5" : "#666", marginBottom: -1 }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB 1: All Calls for Specific Duration ── */}
      {activeTab === TABS[0] && (
        <>
          {error && <div style={{ background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 12, color: "#A32D2D" }}>{error}</div>}
          <StepBar current={step} />

          {step === 0 && (
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Step 1 — Date range, call type & agent</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>From date</label>
                  <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 7, border: "1px solid #ccc", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>To date</label>
                  <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 7, border: "1px solid #ccc", fontSize: 13 }} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Call type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {CALL_TYPES.map(t => (
                    <button key={t} onClick={() => setFilters(p => ({ ...p, callType: t }))} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: filters.callType === t ? "#185FA5" : "#f5f5f5", color: filters.callType === t ? "#fff" : "#333", border: "1px solid #ccc" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Filter by agent <span style={{ color: "#aaa" }}>(optional)</span></label>
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #ccc", fontSize: 13, background: "#fff" }}>
                  <option value="">All agents</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ""}</option>)}
                </select>
                {usersLoading && <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>Loading agents…</p>}
              </div>
              <Btn onClick={async () => { await fetchCalls(); setStep(1); }} disabled={loadingCalls}>
                {loadingCalls ? "Fetching all calls…" : "Fetch calls →"}
              </Btn>
              {loadingCalls && <ProgressBar value={callsProgress} label={`Fetching all calls… (${calls.length} fetched, filtering by agent after)`} />}
            </Card>
          )}

          {step === 1 && (
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Step 2 — Select calls</h3>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>{calls.length} calls found · {selCount} selected</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <button onClick={() => { const s = {}; calls.forEach(c => s[c.id] = true); setSelectedCalls(s); }} style={{ fontSize: 11, color: "#185FA5", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Select all</button>
                <button onClick={() => setSelectedCalls({})} style={{ fontSize: 11, color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Deselect all</button>
              </div>
              <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {calls.map(c => {
                  const agent = c.user?.name || c.user?.email || `Agent ${c.id}`;
                  const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "—";
                  const date = c.started_at ? new Date(c.started_at * 1000).toLocaleDateString("en-IN") : "—";
                  return (
                    <div key={c.id} onClick={() => setSelectedCalls(p => ({ ...p, [c.id]: !p[c.id] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e5e5", cursor: "pointer", background: selectedCalls[c.id] ? "#E6F1FB" : "#fafafa" }}>
                      <input type="checkbox" checked={!!selectedCalls[c.id]} readOnly />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{agent}</div>
                        <div style={{ fontSize: 11, color: "#666" }}>ID: {c.id} · {date} · {dur}</div>
                      </div>
                      <Badge color={c.direction === "inbound" ? "blue" : "purple"}>{c.direction || "call"}</Badge>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn onClick={() => setStep(0)} variant="secondary">← Back</Btn>
                <Btn onClick={async () => { await downloadTranscripts(); setStep(2); }} disabled={selCount === 0 || downloading}>
                  {downloading ? `Downloading… ${downloadProgress}%` : `Download transcripts (${selCount}) →`}
                </Btn>
              </div>
              {downloading && <ProgressBar value={downloadProgress} label="Fetching transcripts…" />}
            </Card>
          )}

          {step === 2 && (
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Step 3 — Transcripts</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <Badge color="green">{transcriptCount - noTranscriptCount} with transcript</Badge>
                {noTranscriptCount > 0 && <Badge color="amber">{noTranscriptCount} no transcript</Badge>}
                <Badge color="blue">{transcriptCount} total</Badge>
              </div>
              <Btn onClick={downloadAllAsFile} variant="success" style={{ marginBottom: 16 }}>⬇ Download all as .txt</Btn>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
                {calls.filter(c => selectedCalls[c.id]).map(c => {
                  const agent = c.user?.name || c.user?.email || `Agent ${c.id}`;
                  const text = transcripts[c.id] || "";
                  const hasTranscript = text && !text.includes("[No transcript") && !text.includes("[Error");
                  return (
                    <div key={c.id} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fafafa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{agent}</span>
                        <Badge color={hasTranscript ? "green" : "amber"}>{hasTranscript ? "Ready" : "No transcript"}</Badge>
                      </div>
                      {hasTranscript && <div style={{ fontSize: 11, color: "#666", maxHeight: 50, overflow: "hidden", lineHeight: 1.5 }}>{text.slice(0, 200)}…</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Btn onClick={() => setStep(1)} variant="secondary">← Back</Btn>
                <Btn onClick={reset} variant="secondary">Start over</Btn>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── TAB 2: All Calls for Specific Number ── */}
      {activeTab === TABS[1] && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Search by customer number</h3>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>Enter a customer's phone number to fetch all call transcripts from the last 6 months.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={customerPhone}
                onChange={e => {
                  const val = e.target.value;
                  if (!val.startsWith("+61")) setCustomerPhone("+61");
                  else setCustomerPhone(val);
                }}
                onKeyDown={e => e.key === "Enter" && fetchCustomerCalls()}
                placeholder="+61 4XX XXX XXX"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 13 }}
              />
              <Btn onClick={fetchCustomerCalls} disabled={customerLoading || customerPhone === "+61" || customerPhone.trim().length < 5}>
                {customerLoading ? "Searching…" : "Search"}
              </Btn>
            </div>
            {customerLoading && <ProgressBar value={customerProgress} label={`Scanning calls… (${customerCalls.length} matches found, still scanning)`} />}
            {customerError && <div style={{ fontSize: 12, color: "#A32D2D", marginTop: 8 }}>{customerError}</div>}
          </Card>

          {customerCalls.length > 0 && (
            <Card style={{ overflow: "visible" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{customerCalls.length} calls found</span>
                  <span style={{ fontSize: 12, color: "#666", marginLeft: 8 }}>for {customerPhone}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {Object.keys(customerTranscripts).length === 0 && !customerDownloading && (
                    <Btn onClick={downloadCustomerTranscripts} variant="secondary">Fetch transcripts</Btn>
                  )}
                  {customerDownloading && <span style={{ fontSize: 12, color: "#666" }}>Downloading…</span>}
                  {Object.keys(customerTranscripts).length > 0 && (
                    <Btn onClick={downloadCustomerAsFile} variant="success">⬇ Download all as .txt</Btn>
                  )}
                </div>
              </div>
              {customerDownloading && <ProgressBar value={customerDownloadProgress} label="Fetching transcripts…" />}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {customerCalls.length === 0 && customerLoading && (
                  <p style={{ fontSize: 13, color: "#666" }}>Scanning… results will appear here as they're found.</p>
                )}
                {customerCalls.map(c => {
                  const agent = c.user?.name || "Unknown";
                  const date = c.started_at ? new Date(c.started_at * 1000).toLocaleString("en-IN") : "—";
                  const dur = c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : "—";
                  const transcript = customerTranscripts[c.id];
                  const hasT = transcript && !transcript.includes("[No transcript") && !transcript.includes("[Error");
                  return (
                    <div key={c.id} style={{ borderRadius: 8, border: "1px solid #e5e5e5", overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#fafafa" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{agent}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{date} · {dur}</div>
                        </div>
                        <Badge color={c.direction === "inbound" ? "blue" : "purple"}>{c.direction || "call"}</Badge>
                        {transcript && <Badge color={hasT ? "green" : "amber"}>{hasT ? "Ready" : "No transcript"}</Badge>}
                      </div>
                      {hasT && (
                        <div style={{ padding: "10px 12px", fontSize: 12, color: "#444", lineHeight: 1.6, background: "#fff", borderTop: "1px solid #f0f0f0", whiteSpace: "pre-wrap" }}>
                          {transcript.slice(0, 300)}…
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
