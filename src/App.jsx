import { useState } from "react";

const STEPS = ["API Check","Filters","Select Calls","Transcripts","QA Analysis","Insights","Agent Feedback"];
const CALL_TYPES = ["All","Inbound","Outbound"];

function Badge({ color, children }) {
  const map = {
    green:["#EAF3DE","#3B6D11"], red:["#FCEBEB","#A32D2D"],
    amber:["#FAEEDA","#854F0B"], blue:["#E6F1FB","#185FA5"],
    purple:["#EEEDFE","#3C3489"], gray:["#F1EFE8","#5F5E5A"],
  };
  const [bg,fg] = map[color]||map.blue;
  return <span style={{background:bg,color:fg,fontSize:11,fontWeight:500,padding:"2px 8px",borderRadius:6,whiteSpace:"nowrap"}}>{children}</span>;
}

function StepBar({current}) {
  return (
    <div style={{display:"flex",alignItems:"center",marginBottom:28,overflowX:"auto",paddingBottom:4}}>
      {STEPS.map((s,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:0}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:58}}>
            <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,flexShrink:0,background:i<current?"#639922":i===current?"#185FA5":"#f0f0f0",color:i<=current?"#fff":"#999",border:i===current?"2px solid #185FA5":"1px solid #ddd"}}>
              {i<current?"✓":i+1}
            </div>
            <span style={{fontSize:9,color:i===current?"#111":"#999",textAlign:"center",lineHeight:1.2}}>{s}</span>
          </div>
          {i<STEPS.length-1&&<div style={{flex:1,height:1.5,background:i<current?"#639922":"#ddd",margin:"0 2px",marginBottom:18}}/>}
        </div>
      ))}
    </div>
  );
}

function Card({children,style}) {
  return <div style={{background:"#fff",border:"1px solid #e5e5e5",borderRadius:12,padding:"1rem 1.25rem",...style}}>{children}</div>;
}

function Btn({onClick,disabled,variant="primary",children,style}) {
  const s={
    primary:{background:"#185FA5",color:"#fff",border:"none"},
    secondary:{background:"transparent",color:"#333",border:"1px solid #ccc"},
    success:{background:"#3B6D11",color:"#fff",border:"none"}
  };
  return <button onClick={onClick} disabled={disabled} style={{padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,...s[variant],...style}}>{children}</button>;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
  });
  const d = await res.json();
  return d.content?.map(b=>b.text||"").join("")||"";
}

export default function App() {
  const [step,setStep] = useState(0);
  const [apiStatus,setApiStatus] = useState(null);
  const [apiChecking,setApiChecking] = useState(false);
  const [filters,setFilters] = useState({dateFrom:"",dateTo:"",callType:"All"});
  const [calls,setCalls] = useState([]);
  const [loadingCalls,setLoadingCalls] = useState(false);
  const [selectedCalls,setSelectedCalls] = useState({});
  const [transcripts,setTranscripts] = useState({});
  const [downloading,setDownloading] = useState(false);
  const [qaResults,setQaResults] = useState({});
  const [analysing,setAnalysing] = useState(false);
  const [insights,setInsights] = useState("");
  const [insightsLoading,setInsightsLoading] = useState(false);
  const [agentFeedback,setAgentFeedback] = useState({});
  const [feedbackLoading,setFeedbackLoading] = useState(false);
  const [copied,setCopied] = useState({});
  const [error,setError] = useState("");

  function showError(msg) { setError(msg); setTimeout(()=>setError(""),6000); }

  async function checkAPI() {
    setApiChecking(true); setApiStatus(null); setError("");
    try {
      const r = await fetch(`/api/check`);
      const d = await r.json();
      setApiStatus(r.ok && d.status==="ok" ? "ok" : "fail");
    } catch {
      setApiStatus("fail");
      showError("Cannot reach the server. Make sure your Vercel deployment is live.");
    }
    setApiChecking(false);
  }

  async function fetchCalls() {
    setLoadingCalls(true); setCalls([]); setError("");
    try {
      let url = `/api/calls?per_page=20`;
      if (filters.dateFrom) url+=`&from=${Math.floor(new Date(filters.dateFrom).getTime()/1000)}`;
      if (filters.dateTo) url+=`&to=${Math.floor(new Date(filters.dateTo+"T23:59:59").getTime()/1000)}`;
      if (filters.callType!=="All") url+=`&direction=${filters.callType.toLowerCase()}`;
      const r = await fetch(url);
      const d = await r.json();
      const fetched = d.calls||[];
      if (!fetched.length) showError("No calls found for these filters. Try a wider date range.");
      setCalls(fetched);
      const sel={}; fetched.forEach(c=>sel[c.id]=true);
      setSelectedCalls(sel);
    } catch { showError("Failed to fetch calls. Check your Vercel deployment."); }
    setLoadingCalls(false);
  }

  async function downloadTranscripts() {
    setDownloading(true); setError("");
    const selected = calls.filter(c=>selectedCalls[c.id]);
    const results = {};
    for (const c of selected) {
      try {
        const r = await fetch(`/api/transcription?id=${c.id}`);
        const d = await r.json();
        results[c.id] = d.transcription||"[No transcript available]";
      } catch { results[c.id]="[Error fetching transcript]"; }
    }
    setTranscripts(results);
    setDownloading(false);
  }

  async function runQA() {
    setAnalysing(true); setError("");
    const results = {};
    for (const [callId,transcript] of Object.entries(transcripts)) {
      const call = calls.find(c=>String(c.id)===String(callId));
      const agent = call?.user?.name||call?.user?.email||"Unknown Agent";
      const text = typeof transcript==="string"?transcript:JSON.stringify(transcript).slice(0,1500);
      const prompt = `You are a customer service QA analyst. Analyse this call transcript and return ONLY valid JSON (no markdown, no explanation):
{"agent":"${agent}","score":<0-100>,"sentiment":"Positive|Neutral|Negative","issues":["issue1"],"strengths":["strength1"],"risk_level":"Low|Medium|High","summary":"2 sentence summary"}
Transcript:\n${text.slice(0,1200)}`;
      try {
        const raw = await callClaude(prompt);
        results[callId] = JSON.parse(raw.replace(/```json|```/g,"").trim());
      } catch {
        results[callId]={agent,score:0,sentiment:"Neutral",issues:["Parse error"],strengths:[],risk_level:"Unknown",summary:"Could not analyse."};
      }
    }
    setQaResults(results); setAnalysing(false);
  }

  async function generateInsights() {
    setInsightsLoading(true);
    const summary = Object.entries(qaResults).map(([id,r])=>
      `Call ${id}: Agent=${r.agent}, Score=${r.score}, Risk=${r.risk_level}, Issues=${(r.issues||[]).join("; ")}`
    ).join("\n");
    const res = await callClaude(`You are a QA manager. Based on these audit results, give 5 bullet-point insights on team-wide trends, common issues, and actionable recommendations. Be specific.\n\n${summary}`);
    setInsights(res); setInsightsLoading(false);
  }

  async function generateFeedback() {
    setFeedbackLoading(true);
    const agentMap = {};
    Object.values(qaResults).forEach(r=>{ if(!agentMap[r.agent]) agentMap[r.agent]=[]; agentMap[r.agent].push(r); });
    const low = Object.entries(agentMap).filter(([,recs])=>recs.reduce((s,r)=>s+(r.score||0),0)/recs.length<75);
    const fb = {};
    if (!low.length) { setAgentFeedback({_none:true}); setFeedbackLoading(false); return; }
    for (const [agent,recs] of low) {
      const issues = recs.flatMap(r=>r.issues||[]).join("; ");
      fb[agent] = await callClaude(`Write a professional, empathetic, constructive feedback message (under 150 words) for a customer service agent named ${agent}. Issues observed: ${issues}. Focus on improvement. Don't mention a score.`);
    }
    setAgentFeedback(fb); setFeedbackLoading(false);
  }

  function copyText(key,text) {
    navigator.clipboard.writeText(text);
    setCopied(p=>({...p,[key]:true}));
    setTimeout(()=>setCopied(p=>({...p,[key]:false})),2000);
  }

  function reset() {
    setStep(0); setApiStatus(null); setCalls([]); setTranscripts({});
    setQaResults({}); setInsights(""); setAgentFeedback({}); setSelectedCalls({}); setError("");
  }

  const selCount = Object.values(selectedCalls).filter(Boolean).length;

  return (
    <div style={{padding:"1.5rem 1rem",maxWidth:720,margin:"0 auto",fontFamily:"system-ui,sans-serif",color:"#111"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:500,margin:0}}>Customer service QA audit</h2>
          <p style={{fontSize:13,color:"#666",margin:"4px 0 0"}}>Live · Aircall + Claude · 7-step wizard</p>
        </div>
        <Badge color="blue">Live</Badge>
      </div>

      {error&&(
        <div style={{background:"#FCEBEB",border:"1px solid #E24B4A",borderRadius:8,padding:"8px 14px",marginBottom:16,fontSize:12,color:"#A32D2D"}}>
          {error}
        </div>
      )}

      <StepBar current={step}/>

      {step===0&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:8}}>Step 1 — API connection check</h3>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Verifies your Aircall API credentials are working correctly.</p>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Btn onClick={checkAPI} disabled={apiChecking}>{apiChecking?"Checking…":"Test connection"}</Btn>
            {apiStatus==="ok"&&<Badge color="green">Connected ✓</Badge>}
            {apiStatus==="fail"&&<Badge color="red">Connection failed</Badge>}
          </div>
          {apiStatus==="ok"&&<div style={{marginTop:14}}><Btn onClick={()=>setStep(1)} variant="success">Continue →</Btn></div>}
        </Card>
      )}

      {step===1&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:16}}>Step 2 — Date range & call type</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>From date</label>
              <input type="date" value={filters.dateFrom} onChange={e=>setFilters(p=>({...p,dateFrom:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",borderRadius:7,border:"1px solid #ccc",fontSize:13}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>To date</label>
              <input type="date" value={filters.dateTo} onChange={e=>setFilters(p=>({...p,dateTo:e.target.value}))} style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",borderRadius:7,border:"1px solid #ccc",fontSize:13}}/>
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:12,color:"#666",display:"block",marginBottom:6}}>Call type</label>
            <div style={{display:"flex",gap:8}}>
              {CALL_TYPES.map(t=>(
                <button key={t} onClick={()=>setFilters(p=>({...p,callType:t}))} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",background:filters.callType===t?"#185FA5":"#f5f5f5",color:filters.callType===t?"#fff":"#333",border:"1px solid #ccc"}}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>setStep(0)} variant="secondary">← Back</Btn>
            <Btn onClick={async()=>{await fetchCalls();setStep(2);}} disabled={loadingCalls}>{loadingCalls?"Fetching…":"Fetch calls →"}</Btn>
          </div>
        </Card>
      )}

      {step===2&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:4}}>Step 3 — Select calls to audit</h3>
          <p style={{fontSize:12,color:"#666",marginBottom:10}}>{calls.length} calls found · {selCount} selected</p>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            <button onClick={()=>{const s={};calls.forEach(c=>s[c.id]=true);setSelectedCalls(s);}} style={{fontSize:11,color:"#185FA5",background:"none",border:"none",cursor:"pointer",padding:0}}>Select all</button>
            <button onClick={()=>setSelectedCalls({})} style={{fontSize:11,color:"#666",background:"none",border:"none",cursor:"pointer",padding:0}}>Deselect all</button>
          </div>
          <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
            {calls.length===0&&<p style={{fontSize:13,color:"#666"}}>No calls found. Try adjusting your filters.</p>}
            {calls.map(c=>{
              const agent=c.user?.name||c.user?.email||`Agent ${c.id}`;
              const dur=c.duration?`${Math.floor(c.duration/60)}m ${c.duration%60}s`:"—";
              const date=c.started_at?new Date(c.started_at*1000).toLocaleDateString("en-IN"):"—";
              return (
                <div key={c.id} onClick={()=>setSelectedCalls(p=>({...p,[c.id]:!p[c.id]}))} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,border:"1px solid #e5e5e5",cursor:"pointer",background:selectedCalls[c.id]?"#E6F1FB":"#fafafa"}}>
                  <input type="checkbox" checked={!!selectedCalls[c.id]} readOnly/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500}}>{agent}</div>
                    <div style={{fontSize:11,color:"#666"}}>ID: {c.id} · {date} · {dur}</div>
                  </div>
                  <Badge color={c.direction==="inbound"?"blue":"purple"}>{c.direction||"call"}</Badge>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={()=>setStep(1)} variant="secondary">← Back</Btn>
            <Btn onClick={()=>setStep(3)} disabled={selCount===0}>Download transcripts ({selCount}) →</Btn>
          </div>
        </Card>
      )}

      {step===3&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:8}}>Step 4 — Download transcripts</h3>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Fetching transcripts for {selCount} selected calls.</p>
          {Object.keys(transcripts).length===0&&!downloading&&<Btn onClick={downloadTranscripts}>Fetch transcripts</Btn>}
          {downloading&&<p style={{fontSize:13,color:"#666"}}>Downloading transcripts…</p>}
          {Object.keys(transcripts).length>0&&(
            <>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:260,overflowY:"auto",marginBottom:14}}>
                {Object.entries(transcripts).map(([id,t])=>{
                  const call=calls.find(c=>String(c.id)===String(id));
                  const agent=call?.user?.name||`Call ${id}`;
                  const text=typeof t==="string"?t:JSON.stringify(t);
                  const ok=!text.includes("[No transcript")&&!text.includes("[Error");
                  return (
                    <div key={id} style={{padding:"10px 12px",borderRadius:8,border:"1px solid #e5e5e5",background:"#fafafa"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:500}}>{agent}</span>
                        <Badge color={ok?"green":"amber"}>{ok?"Ready":"No transcript"}</Badge>
                      </div>
                      <div style={{fontSize:11,color:"#666",overflow:"hidden",maxHeight:40}}>{text.slice(0,200)}{text.length>200?"…":""}</div>
                    </div>
                  );
                })}
              </div>
              <Badge color="green">{Object.keys(transcripts).length} transcripts fetched</Badge>
            </>
          )}
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <Btn onClick={()=>setStep(2)} variant="secondary">← Back</Btn>
            {Object.keys(transcripts).length>0&&<Btn onClick={()=>setStep(4)} variant="success">Run QA analysis →</Btn>}
          </div>
        </Card>
      )}

      {step===4&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:8}}>Step 5 — QA analysis</h3>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Claude scores each call, detects issues, and assesses risk.</p>
          {Object.keys(qaResults).length===0&&!analysing&&<Btn onClick={runQA}>Analyse with AI</Btn>}
          {analysing&&<p style={{fontSize:13,color:"#666"}}>Analysing {Object.keys(transcripts).length} calls…</p>}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {Object.entries(qaResults).map(([id,r])=>(
              <div key={id} style={{padding:12,borderRadius:8,border:"1px solid #e5e5e5",background:"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:6}}>
                  <span style={{fontSize:13,fontWeight:500}}>{r.agent} · <span style={{fontWeight:400,color:"#666"}}>#{id}</span></span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <Badge color={r.score>=75?"green":r.score>=50?"amber":"red"}>{r.score}/100</Badge>
                    <Badge color={r.risk_level==="High"?"red":r.risk_level==="Medium"?"amber":"green"}>{r.risk_level} risk</Badge>
                    <Badge color={r.sentiment==="Positive"?"green":r.sentiment==="Negative"?"red":"gray"}>{r.sentiment}</Badge>
                  </div>
                </div>
                <p style={{fontSize:12,color:"#666",margin:"0 0 6px"}}>{r.summary}</p>
                {r.issues?.length>0&&<div style={{fontSize:11,color:"#A32D2D",marginBottom:2}}>Issues: {r.issues.join(" · ")}</div>}
                {r.strengths?.length>0&&<div style={{fontSize:11,color:"#3B6D11"}}>Strengths: {r.strengths.join(" · ")}</div>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={()=>setStep(3)} variant="secondary">← Back</Btn>
            {Object.keys(qaResults).length>0&&<Btn onClick={()=>setStep(5)} variant="success">Get insights →</Btn>}
          </div>
        </Card>
      )}

      {step===5&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:8}}>Step 6 — AI insights</h3>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Team-wide patterns and recommendations across all audited calls.</p>
          {!insights&&!insightsLoading&&<Btn onClick={generateInsights}>Generate insights</Btn>}
          {insightsLoading&&<p style={{fontSize:13,color:"#666"}}>Generating…</p>}
          {insights&&<div style={{background:"#fafafa",borderRadius:8,padding:"12px 16px",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{insights}</div>}
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={()=>setStep(4)} variant="secondary">← Back</Btn>
            {insights&&<Btn onClick={()=>setStep(6)} variant="success">Agent feedback →</Btn>}
          </div>
        </Card>
      )}

      {step===6&&(
        <Card>
          <h3 style={{fontSize:15,fontWeight:500,marginBottom:4}}>Step 7 — Agent feedback</h3>
          <p style={{fontSize:13,color:"#666",marginBottom:16}}>Personalised improvement messages for agents scoring below 75.</p>
          {Object.keys(agentFeedback).length===0&&!feedbackLoading&&<Btn onClick={generateFeedback}>Generate feedback</Btn>}
          {feedbackLoading&&<p style={{fontSize:13,color:"#666"}}>Writing feedback messages…</p>}
          {agentFeedback._none&&(
            <div style={{background:"#EAF3DE",border:"1px solid #639922",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#3B6D11"}}>
              All agents scored 75 or above — no improvement feedback needed!
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {Object.entries(agentFeedback).filter(([k])=>k!=="_none").map(([agent,fb])=>(
              <div key={agent} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"12px 16px",background:"#fafafa"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,color:"#3C3489"}}>
                      {agent.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span style={{fontSize:14,fontWeight:500}}>{agent}</span>
                  </div>
                  <Badge color="amber">Needs improvement</Badge>
                </div>
                <p style={{fontSize:13,lineHeight:1.6,margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{fb}</p>
                <button onClick={()=>copyText(agent,fb)} style={{fontSize:12,padding:"5px 12px",borderRadius:6,cursor:"pointer",background:copied[agent]?"#EAF3DE":"#fff",color:copied[agent]?"#3B6D11":"#333",border:"1px solid #ccc"}}>
                  {copied[agent]?"Copied!":"Copy feedback"}
                </button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <Btn onClick={()=>setStep(5)} variant="secondary">← Back</Btn>
            <Btn onClick={reset} variant="secondary">Start new audit</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}