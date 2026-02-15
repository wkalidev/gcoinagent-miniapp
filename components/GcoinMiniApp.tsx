import { useState, useEffect } from "react";

// ─── Farcaster Mini App SDK ────────────────────────────────────────────────
// In production: import sdk from '@farcaster/miniapp-sdk'
// For demo purposes we mock the SDK here
const sdk = {
  actions: {
    ready: () => console.log("🟣 Frame ready"),
    addMiniApp: async () => ({ added: true }),
    openUrl: (url: string) => window.open(url, "_blank"),
    sendTransaction: async (tx: any) => ({ hash: "0x" + Math.random().toString(16).slice(2, 10) as string }),
  },
  context: {
    user: { fid: 12345, username: "willywarrior", displayName: "Willy Warrior", pfpUrl: "" },
    client: { clientFid: 9152, added: false },
  },
  wallet: {
    ethProvider: null,
  },
};

const TWITTER   = "willycodexwar";
const FARCASTER = "willywarrior";

// ─── Signal data (simulated CDP prices) ───────────────────────────────────
const SIGNALS = [
  { sym:"BTC", price:98450, rsi:38, macd:"↑", signal:"BUY",  strength:"STRONG",  change:+2.4, col:"#F7931A" },
  { sym:"ETH", price:3185,  rsi:52, macd:"↑", signal:"BUY",  strength:"MODERATE",change:+1.1, col:"#627EEA" },
  { sym:"SOL", price:183,   rsi:71, macd:"↓", signal:"SELL", strength:"STRONG",  change:-1.8, col:"#9945FF" },
  { sym:"BNB", price:677,   rsi:55, macd:"↓", signal:"SELL", strength:"MODERATE",change:-0.5, col:"#F3BA2F" },
  { sym:"XRP", price:2.38,  rsi:44, macd:"↑", signal:"HOLD", strength:"NEUTRAL", change:+0.2, col:"#00AAE4" },
];

const PLANS = [
  { id:"free",    name:"Free",    price:0,    priceUSDC:0,    perks:["3 signals/day","Top 5 cryptos","Basic RSI"],                   col:"#555"    },
  { id:"pro",     name:"Pro",     price:9.99, priceUSDC:10,   perks:["Unlimited signals","Top 10 cryptos","RSI+MACD+Bollinger","Push notifications","Priority alerts"], col:"#6366F1" },
  { id:"premium", name:"Premium", price:24.99,priceUSDC:25,   perks:["Everything in Pro","AI trade suggestions","CDP live prices","Webhook to your bot","Direct @willywarrior alpha"], col:"#F7931A" },
];

// ─── Subscription payment via USDC on Base ────────────────────────────────
// Base network USDC contract
const USDC_BASE   = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const WALLET_ADDR = "0xDEAcDe6eC27Fd0cD972c1232C4f0d4171dda2357"; // ← paste your Base wallet here

async function paySubscription(planId: string) {
  const plan = PLANS.find(p => p.id === planId);
  if (!plan || plan.priceUSDC === 0) return { success: true, free: true };
  try {
    // ERC-20 transfer calldata: transfer(address,uint256)
    const amount = BigInt(plan.priceUSDC * 1e6); // USDC has 6 decimals
    const hash = await sdk.actions.sendTransaction({
      chainId: "eip155:8453", // Base mainnet
      to: USDC_BASE,
      data: `0xa9059cbb${WALLET_ADDR.slice(2).padStart(64,"0")}${amount.toString(16).padStart(64,"0")}`,
    });
    return { success: true, hash };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────
async function addToFavorites() {
  try {
    const result = await sdk.actions.addMiniApp();
    return result.added;
  } catch { return false; }
}

const fmtN = (n: number) => n < 10 ? n.toFixed(4) : n.toLocaleString("en", {maximumFractionDigits:2});
const sigCol = (s: string) => s === "BUY" ? "#00FF88" : s === "SELL" ? "#FF4466" : "#FFD700";

interface Notification {
  msg: string;
  type: string;
}

export default function GcoinMiniApp() {
  const [view,        setView]        = useState("home");   // home | signals | subscribe | success
  const [userPlan,    setUserPlan]    = useState("free");
  const [loading,     setLoading]     = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [added,       setAdded]       = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [user,        setUser]        = useState(sdk.context.user);
  const [notification, setNotification] = useState<Notification | null>(null);


  // Tell Farcaster the Mini App is ready
  useEffect(() => {
    sdk.actions.ready();
    // Simulate loading user context
    setTimeout(() => setLoading(false), 500);
  }, []);

  const notify = (msg: string, type: string = "success") => {
    setNotification({ msg: msg, type: type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") { setUserPlan("free"); notify("Welcome to GcoinAgent Free!"); return; }
    setLoadingPlan(planId);
    const result = await paySubscription(planId);
    setLoadingPlan(null);
    if (result.success) {
      setUserPlan(planId);
      setTxHash(result.hash?.hash || null);
      setView("success");
      notify(`🎉 ${PLANS.find(p=>p.id===planId)?.name} activated!`);
    } else {
      notify(`Transaction failed: ${result.error}`, "error");
    }
  };

  const handleAddFrame = async () => {
    const ok = await addToFavorites();
    if (ok) { setAdded(true); notify("✅ GcoinAgent added! You'll get signal alerts."); }
  };

  // ── Shared style tokens ────────────────────────────────────────────────
  const BG       = "#050510";
  const CARD     = {padding:16, borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)"};
  const BTN      = (col: string, full?: boolean) => ({padding:full?"13px":"10px 18px", borderRadius:9, cursor:"pointer", border:`1px solid ${col}66`, background:`${col}22`, color:"#fff", fontSize:12, fontFamily:"monospace", letterSpacing:1, width:full?"100%":"auto", transition:"all .2s", display:"block"});
  const BTN_SOLID= (col: string) => ({padding:"13px", borderRadius:9, cursor:"pointer", border:"none", background:col, color:"#fff", fontSize:12, fontFamily:"monospace", letterSpacing:1, width:"100%", fontWeight:"bold", transition:"all .2s"});

  return (
    <div style={{minHeight:"100vh", background:BG, color:"#dde0ff", fontFamily:"monospace", fontSize:13, position:"relative"}}>

      {/* BG grid */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

      {/* Notification toast */}
      {notification && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:100,padding:"10px 20px",borderRadius:10,background:notification.type==="error"?"#FF4466":"#00FF88",color:"#000",fontWeight:"bold",fontSize:12,boxShadow:"0 4px 20px rgba(0,0,0,.5)",whiteSpace:"nowrap"}}>
          {notification.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:"1px solid rgba(99,102,241,.25)",background:"rgba(5,5,16,.97)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#F7931A,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 0 14px #F7931A44"}}>₿</div>
          <div>
            <div style={{fontSize:15,fontWeight:"bold",letterSpacing:3,color:"#fff"}}>GCOIN<span style={{color:"#6366F1"}}>AGENT</span></div>
            <div style={{fontSize:8,color:"#6366F1",letterSpacing:1}}>by @{FARCASTER} · Mini App</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{padding:"3px 10px",borderRadius:20,fontSize:9,letterSpacing:1,background:userPlan==="premium"?"rgba(247,147,26,.2)":userPlan==="pro"?"rgba(99,102,241,.2)":"rgba(255,255,255,.05)",border:`1px solid ${userPlan==="premium"?"#F7931A55":userPlan==="pro"?"#6366F155":"rgba(255,255,255,.1)"}`,color:userPlan==="premium"?"#F7931A":userPlan==="pro"?"#6366F1":"#555"}}>
            {userPlan.toUpperCase()}
          </div>
          {user.username && <div style={{fontSize:10,color:"#6366F1"}}>@{user.username}</div>}
        </div>
      </div>

      {/* ── NAV ── */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(99,102,241,.15)",background:"rgba(5,5,16,.95)"}}>
        {[["home","🏠 Home"],["signals","⚡ Signals"],["subscribe","💎 Subscribe"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{flex:1,padding:"10px",background:"none",border:"none",borderBottom:view===k?"2px solid #6366F1":"2px solid transparent",color:view===k?"#fff":"#444",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"18px 18px",maxHeight:"calc(100vh - 105px)",overflowY:"auto"}}>

        {/* ════ HOME ════ */}
        {view==="home"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Hero */}
            <div style={{padding:20,borderRadius:14,background:"linear-gradient(135deg,rgba(247,147,26,.12),rgba(99,102,241,.12))",border:"1px solid rgba(99,102,241,.3)",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:6}}>🤖</div>
              <div style={{fontSize:18,fontWeight:"bold",color:"#fff",letterSpacing:2,marginBottom:4}}>GCOIN<span style={{color:"#6366F1"}}>AGENT</span></div>
              <div style={{fontSize:11,color:"#888",marginBottom:14}}>Autonomous crypto AI trading signals<br/>powered by CDP Advanced Trade API</div>

              {/* Add to favorites / notifications */}
              {!added ? (
                <button onClick={handleAddFrame} style={BTN_SOLID("#6366F1")}>
                  🔔 ADD TO FAVORITES + GET ALERTS
                </button>
              ) : (
                <div style={{padding:"10px",borderRadius:8,background:"rgba(0,255,136,.08)",border:"1px solid rgba(0,255,136,.3)",color:"#00FF88",fontSize:12}}>
                  ✅ Added! You'll receive signal notifications
                </div>
              )}
            </div>

            {/* Live preview — top 3 signals */}
            <div>
              <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10}}>LATEST SIGNALS · LIVE</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {SIGNALS.slice(0,userPlan==="free"?3:5).map(s=>(
                  <div key={s.sym} style={{padding:"11px 14px",borderRadius:10,background:`${s.col}08`,border:`1px solid ${s.col}28`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:s.col,boxShadow:`0 0 6px ${s.col}`}}/>
                      <div>
                        <span style={{color:s.col,fontWeight:"bold",fontSize:13}}>{s.sym}</span>
                        <span style={{color:"#666",marginLeft:8,fontSize:12}}>${fmtN(s.price)}</span>
                        <span style={{marginLeft:8,fontSize:11,color:s.change>=0?"#00FF88":"#FF4466"}}>{s.change>=0?"+":""}{s.change}%</span>
                      </div>
                    </div>
                    <div style={{padding:"5px 10px",borderRadius:6,background:sigCol(s.signal)+"18",border:`1px solid ${sigCol(s.signal)}55`,color:sigCol(s.signal),fontSize:11,fontWeight:"bold",textAlign:"center"}}>
                      <div>{s.signal==="BUY"?"▲":s.signal==="SELL"?"▼":"◆"} {s.signal}</div>
                      <div style={{fontSize:9,letterSpacing:.5}}>{s.strength}</div>
                    </div>
                  </div>
                ))}
                {userPlan==="free"&&(
                  <button onClick={()=>setView("subscribe")} style={{padding:"11px",borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px dashed rgba(99,102,241,.3)",color:"#6366F1",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>
                    🔒 +{SIGNALS.length-3} more signals — Upgrade to Pro
                  </button>
                )}
              </div>
            </div>

            {/* Creator stats */}
            <div style={{padding:14,borderRadius:12,background:"rgba(255,215,0,.05)",border:"1px solid rgba(255,215,0,.18)"}}>
              <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:10}}>CREATOR · @{FARCASTER}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
                {[["847","Followers"],["2.4K","Signals sent"],["$12K","Creator rewards"]].map(([v,l])=>(
                  <div key={l}>
                    <div style={{fontSize:16,fontWeight:"bold",color:"#FFD700"}}>{v}</div>
                    <div style={{fontSize:9,color:"#555"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,display:"flex",gap:8}}>
                <a href={`https://x.com/${TWITTER}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px",borderRadius:7,background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.08)",textDecoration:"none",color:"#fff",textAlign:"center",fontSize:11}}>
                  🐦 @{TWITTER}
                </a>
                <a href={`https://farcaster.xyz/${FARCASTER}`} target="_blank" rel="noreferrer" style={{flex:1,padding:"8px",borderRadius:7,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",textDecoration:"none",color:"#fff",textAlign:"center",fontSize:11}}>
                  🟣 @{FARCASTER}
                </a>
              </div>
            </div>

            {/* Farcaster Creator Rewards info */}
            <div style={{padding:14,borderRadius:12,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.2)"}}>
              <div style={{fontSize:9,color:"#6366F1",letterSpacing:2,marginBottom:8}}>💎 FARCASTER CREATOR REWARDS</div>
              <div style={{fontSize:11,color:"#888",lineHeight:1.7}}>
                Farcaster distributes <span style={{color:"#FFD700",fontWeight:"bold"}}>+$25,000/week</span> to active creators.<br/>
                Like & recast GcoinAgent signals to help this Mini App earn more rewards — shared back with top supporters! 🚀
              </div>
              <button onClick={()=>sdk.actions.openUrl("https://warpcast.com")} style={{...BTN("#6366F1",true),marginTop:10}}>
                🟣 Open Warpcast to Support
              </button>
            </div>

          </div>
        )}

        {/* ════ SIGNALS ════ */}
        {view==="signals"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:9,color:"#555",letterSpacing:2}}>LIVE SIGNALS · CDP PRICES</div>
              <div style={{fontSize:9,color:"#00FF88",display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:"#00FF88",boxShadow:"0 0 4px #00FF88"}}/>
                LIVE
              </div>
            </div>

            {SIGNALS.map((s, i) => {
              const locked = userPlan==="free" && i >= 3;
              return (
                <div key={s.sym} style={{padding:14,borderRadius:11,background:locked?"rgba(255,255,255,.02)":`${s.col}08`,border:`1px solid ${locked?"rgba(255,255,255,.05)":s.col+"28"}`,position:"relative",overflow:"hidden"}}>
                  {locked && (
                    <div style={{position:"absolute",inset:0,background:"rgba(5,5,16,.85)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:11,zIndex:2}}>
                      <button onClick={()=>setView("subscribe")} style={BTN_SOLID("#6366F1")}>
                        🔒 Upgrade to Pro — {fmtN(9.99)} USDC/mo
                      </button>
                    </div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:s.col,boxShadow:`0 0 7px ${s.col}`}}/>
                        <span style={{color:s.col,fontWeight:"bold",fontSize:15}}>{s.sym}</span>
                        <span style={{fontSize:9,color:s.change>=0?"#00FF88":"#FF4466",padding:"1px 6px",borderRadius:3,background:s.change>=0?"rgba(0,255,136,.1)":"rgba(255,68,102,.1)"}}>{s.change>=0?"+":""}{s.change}%</span>
                      </div>
                      <div style={{fontSize:20,fontWeight:"bold",color:s.col}}>${fmtN(s.price)}</div>
                    </div>
                    <div style={{padding:"10px 14px",borderRadius:9,background:sigCol(s.signal)+"18",border:`1px solid ${sigCol(s.signal)}55`,color:sigCol(s.signal),textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:"bold"}}>{s.signal==="BUY"?"▲":s.signal==="SELL"?"▼":"◆"}</div>
                      <div style={{fontSize:9,letterSpacing:1}}>{s.strength}</div>
                      <div style={{fontSize:12,fontWeight:"bold"}}>{s.signal}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
                    <div style={{padding:"6px 8px",borderRadius:6,background:"rgba(255,255,255,.03)",textAlign:"center"}}>
                      <div style={{color:"#555",fontSize:9}}>RSI</div>
                      <div style={{color:s.rsi<30?"#00FF88":s.rsi>70?"#FF4466":"#FFD700",fontWeight:"bold"}}>{s.rsi}</div>
                    </div>
                    <div style={{padding:"6px 8px",borderRadius:6,background:"rgba(255,255,255,.03)",textAlign:"center"}}>
                      <div style={{color:"#555",fontSize:9}}>MACD</div>
                      <div style={{color:s.macd==="↑"?"#00FF88":"#FF4466",fontWeight:"bold",fontSize:16}}>{s.macd}</div>
                    </div>
                    <div style={{padding:"6px 8px",borderRadius:6,background:"rgba(255,255,255,.03)",textAlign:"center"}}>
                      <div style={{color:"#555",fontSize:9}}>SIGNAL</div>
                      <div style={{color:sigCol(s.signal),fontWeight:"bold",fontSize:11}}>{s.signal}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {userPlan!=="free"&&(
              <div style={{padding:12,borderRadius:10,background:"rgba(0,255,136,.05)",border:"1px solid rgba(0,255,136,.2)",textAlign:"center",fontSize:11,color:"#00FF88"}}>
                ✅ You have full access · {userPlan.toUpperCase()} plan active
              </div>
            )}
          </div>
        )}

        {/* ════ SUBSCRIBE ════ */}
        {view==="subscribe"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:2,marginBottom:4}}>CHOOSE YOUR PLAN · PAID IN USDC ON BASE</div>

            {PLANS.map(plan=>{
              const isActive = userPlan === plan.id;
              const isLoading = loadingPlan === plan.id;
              return (
                <div key={plan.id} style={{padding:16,borderRadius:12,background:isActive?`${plan.col}12`:"rgba(255,255,255,.03)",border:`${isActive?"2":"1"}px solid ${isActive?plan.col+"88":plan.col+"33"}`,transition:"all .2s",position:"relative"}}>
                  {isActive&&(
                    <div style={{position:"absolute",top:12,right:12,padding:"2px 8px",borderRadius:4,background:plan.col+"33",color:plan.col,fontSize:9,letterSpacing:1}}>ACTIVE</div>
                  )}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{color:plan.col,fontWeight:"bold",fontSize:15,marginBottom:2}}>{plan.name}</div>
                      <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>{plan.priceUSDC===0?"Free":`${plan.priceUSDC} USDC`}<span style={{fontSize:10,color:"#555",fontWeight:"normal"}}>{plan.priceUSDC>0?" / month":""}</span></div>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
                    {plan.perks.map(p=>(
                      <div key={p} style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"#aaa"}}>
                        <span style={{color:plan.col}}>✓</span> {p}
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isActive||isLoading}
                    onClick={()=>handleSubscribe(plan.id)}
                    style={isActive?{...BTN_SOLID("#333"),cursor:"default",opacity:.6}:BTN_SOLID(plan.col)}>
                    {isLoading?"⏳ Processing on Base...":isActive?"✅ Current plan":`${plan.priceUSDC===0?"Start Free":`Pay ${plan.priceUSDC} USDC on Base`}`}
                  </button>
                </div>
              );
            })}

            <div style={{padding:12,borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.2)",fontSize:10,color:"#666",lineHeight:1.7}}>
              💡 Payments processed on <span style={{color:"#6366F1"}}>Base network</span> via USDC.<br/>
              Transactions are instant and cost &lt;$0.01 in gas.<br/>
              Your Farcaster wallet is used automatically.
            </div>
          </div>
        )}

        {/* ════ SUCCESS ════ */}
        {view==="success"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"30px 0",textAlign:"center"}}>
            <div style={{fontSize:48}}>🎉</div>
            <div style={{fontSize:20,fontWeight:"bold",color:"#00FF88"}}>SUBSCRIPTION ACTIVE!</div>
            <div style={{fontSize:12,color:"#888"}}>Welcome to GcoinAgent {userPlan.toUpperCase()}</div>
            {txHash && (
              <div style={{padding:"8px 14px",borderRadius:8,background:"rgba(0,255,136,.06)",border:"1px solid rgba(0,255,136,.2)",fontSize:10,color:"#00FF88",wordBreak:"break-all"}}>
                TX: {txHash}
              </div>
            )}
            <button onClick={()=>{setView("signals");}} style={BTN_SOLID("#6366F1")}>
              ⚡ VIEW MY SIGNALS
            </button>
            <button onClick={handleAddFrame} style={{...BTN("#6366F1",true),marginTop:0}}>
              🔔 ENABLE SIGNAL NOTIFICATIONS
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
