import { useState } from "react";

const STEPS = ["Filters", "Select Calls", "Transcripts"];
const CALL_TYPES = ["All", "Inbound", "Outbound"];

function today() {
  return new Date().toISOString().split("T")[0];
}

function Badge({ color, children }) {
  const map = {
    green: ["#EAF3DE", "#3B6D11"],
    red: ["#FCEBEB", "#A32D2D"],
    amber: ["#FAEEDA", "#854F0B"],
    blue: ["#E6F1FB", "#185FA5"],
    purple: ["#EEEDFE", "#3C3489"],
    gray: ["#F1EFE8", "#5F5E5A"],
  };
  const [bg, fg] = map[color] || map.blue;
  return (
    <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
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
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: "1rem 1.25rem", ...style }}>
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, variant = "primary", children, style }) {
  const s = {
    primary: { background: "#185FA5", color: "#fff", border: "none" },
    secondary: { background: "transparent", color: "#333", border: "1px solid #ccc" },
    success: { background: "#3B6D11", color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...s[variant], ...style }}>
      {children}
    </button>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({ dateFrom: today(), dateTo: today(), callType: "All" });
  const [calls, setCalls] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState("");

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  }

  async function fetchCalls() {
    setLoadingCalls(true);
    setCalls([]);
    setError("");
    try {
      let allCalls = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        let url = `/api/calls?per_page=50&page=${page}`;
        if (filters.dateFrom) url += `&from=${Math.floor(new Date(filters.dateFrom).getTime() / 1000)}`;
        if (filters.dateTo) url += `&to=${Math.floor(new Date(filters.dateTo + "T23:59:59").getTime() / 1000)}`;
        if (filters.callType !== "All") url += `&direction=${filters.callType.toLowerCase()}`;
        const r = await fetch(url);
        const d = await r.json();
        const fetched = d.calls || [];
        allCalls = [...allCalls, ...fetched];
        if (fetched.length < 50 || !d.meta?.next_page_link) {
          hasMore = false;
        } else {
          page++;
        }
      }
      if (!allCalls.length) showError("No calls found. Try a wider date range.");
      setCalls(allCalls);
      const sel = {};
      allCalls.forEach(c => sel[c.id] = true);
      setSelectedCalls(sel);
    } catch {
      showError("Failed to fetch calls. Check your Vercel deployment.");
    }
    setLoadingCalls(false);
  }

  async function downloadTranscripts() {
    setDownloading(true);
    setError("");
    setDownloadProgress(0);
    const selected = calls.filter(c => selectedCalls[c.id]);
    const results = {};
    for (let i = 0; i < selected.length; i++) {
      const c = selected[i];
      try {
        const r = await fetch(`/api/transcription?id=${c.id}`);
        const d = await r.json();
        results[c.id] = d.transcription || "[No transcript available]";
      } catch {
        results[c.id] = "[Error fetching transcript]";
      }
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
      return `==============================\nCall ID: ${c.id}\nAgent: ${agent}\nDate: ${date}\nDuration: ${dur}\nDirection: ${c.direction || "—"}\n------------------------------\n${text}\n`;
    }).join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcripts-${filters.dateFrom}-to-${filters.dateTo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep(0);
    setCalls([]);
    setTranscripts({});
    setSelectedCalls({});
    setError("");
    setDownloadProgress(0);
  }

  const selCount = Object.values(selectedCalls).filter(Boolean).length;
  const transcriptCount = Object.keys(transcripts).length;
  const noTranscriptCount = Object.values(transcripts).filter(t => t.includes("[No transcript")).length;

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: 720, margin: "0 auto", fontFamily: "system-ui,sans-serif", color: "#111" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Aircall Transcript Downloader</h2>
          <p style={{ fontSize: 13, color: "#666", margin: "4px 0 0" }}>Fetch & download call transcripts from Aircall</p>
        </div>
        <Badge color="blue">Live</Badge>
      </div>

      {error && (
        <div style={{ background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 12, color: "#A32D2D" }}>
          {error}
        </div>
      )}

      <StepBar current={step} />

      {step === 0 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 16 }}>Step 1 — Date range & call type</h3>
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
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Call type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {CALL_TYPES.map(t => (
                <button key={t} onClick={() => setFilters(p => ({ ...p, callType: t }))} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: filters.callType === t ? "#185FA5" : "#f5f5f5", color: filters.callType === t ? "#fff" : "#333", border: "1px solid #ccc" }}>{t}</button>
              ))}
            </div>
          </div>
          <Btn onClick={async () => { await fetchCalls(); setStep(1); }} disabled={loadingCalls}>
            {loadingCalls ? "Fetching all calls…" : "Fetch calls →"}
          </Btn>
          {loadingCalls && <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>Fetching all pages, please wait…</p>}
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
            {calls.length === 0 && <p style={{ fontSize: 13, color: "#666" }}>No calls found.</p>}
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
          <Btn onClick={downloadAllAsFile} variant="success" style={{ marginBottom: 16 }}>
            ⬇ Download all as .txt file
          </Btn>
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
    </div>
  );
}