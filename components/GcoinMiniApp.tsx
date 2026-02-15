"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TWITTER   = "willycodexwar";
const FARCASTER = "willywarrior";

const CRYPTOS = [
  { id:"BTC-USD",  sym:"BTC",   name:"Bitcoin",   col:"#F7931A" },
  { id:"ETH-USD",  sym:"ETH",   name:"Ethereum",  col:"#627EEA" },
  { id:"SOL-USD",  sym:"SOL",   name:"Solana",    col:"#9945FF" },
  { id:"BNB-USD",  sym:"BNB",   name:"BNB",       col:"#F3BA2F" },
  { id:"XRP-USD",  sym:"XRP",   name:"XRP",       col:"#00AAE4" },
  { id:"ADA-USD",  sym:"ADA",   name:"Cardano",   col:"#0057FF" },
  { id:"AVAX-USD", sym:"AVAX",  name:"Avalanche", col:"#E84142" },
  { id:"DOGE-USD", sym:"DOGE",  name:"Dogecoin",  col:"#C2A633" },
  { id:"LINK-USD", sym:"LINK",  name:"Chainlink", col:"#2A5ADA" },
  { id:"MATIC-USD",sym:"MATIC", name:"Polygon",   col:"#8247E5" },
];

const SEED: Record<string,number> = {
  "BTC-USD":98500,"ETH-USD":3200,"SOL-USD":185,"BNB-USD":680,
  "XRP-USD":2.4,"ADA-USD":0.88,"AVAX-USD":38,"DOGE-USD":0.38,
  "LINK-USD":18.5,"MATIC-USD":0.92,
};

// Static candles for SSR (no Math.random during server render)
const STATIC_CANDLES: Record<string,{o:number,c:number,h:number,l:number}[]> = {};
CRYPTOS.forEach(c => {
  const base = SEED[c.id];
  STATIC_CANDLES[c.id] = Array.from({length:40},(_,i)=>({
    o: base*(1+i*0.0001), c: base*(1+i*0.0001+0.0002),
    h: base*(1+i*0.0001+0.0005), l: base*(1+i*0.0001-0.0005)
  }));
});

const STAKING = [
  { id:"ETH-USD",  apy:4.2, min:0.01, lock:30, risk:"LOW"    },
  { id:"SOL-USD",  apy:7.8, min:1,    lock:7,  risk:"LOW"    },
  { id:"ADA-USD",  apy:5.5, min:10,   lock:21, risk:"LOW"    },
  { id:"AVAX-USD", apy:9.1, min:0.5,  lock:14, risk:"MEDIUM" },
  { id:"BNB-USD",  apy:6.3, min:0.05, lock:30, risk:"MEDIUM" },
];

const FARMS = [
  { pair:"ETH/USDC", apy:18.4, tvl:24.5, risk:"MEDIUM", col:"#627EEA" },
  { pair:"BTC/ETH",  apy:12.1, tvl:58.2, risk:"LOW",    col:"#F7931A" },
  { pair:"SOL/AVAX", apy:31.7, tvl:8.9,  risk:"HIGH",   col:"#9945FF" },
  { pair:"BNB/USDT", apy:14.6, tvl:19.3, risk:"MEDIUM", col:"#F3BA2F" },
];

const PLANS = [
  { id:"free",    name:"Free",    priceUSDC:0,  perks:["3 signals/day","Top 5 cryptos","Basic RSI"], col:"#555" },
  { id:"pro",     name:"Pro",     priceUSDC:10, perks:["Unlimited signals","Top 10 cryptos","RSI+MACD+Bollinger","Push alerts"], col:"#6366F1" },
  { id:"premium", name:"Premium", priceUSDC:25, perks:["Everything in Pro","AI suggestions","CDP live prices","Direct alpha from @willywarrior"], col:"#F7931A" },
];

const fmtN   = (n: number) => n < 10 ? n.toFixed(4) : n.toLocaleString("en",{maximumFractionDigits:2});
const fmtUSD = (n: number) => "$"+Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,",");
const riskCol = (r: string) => r==="LOW"?"#00FF88":r==="MEDIUM"?"#FFD700":"#FF4466";
const sigCol  = (s: string) => s==="BUY"?"#00FF88":s==="SELL"?"#FF4466":"#FFD700";
const nudge   = (p: number) => p*(1+(Math.random()-0.5)*0.001);

function genCandles(base: number, n=40) {
  let p=base; const out=[];
  for(let i=0;i<n;i++){
    const o=p,c=o+(Math.random()-0.48)*o*0.018;
    out.push({o,c,h:Math.max(o,c)+Math.random()*o*0.004,l:Math.min(o,c)-Math.random()*o*0.004});
    p=c;
  }
  return out;
}

function calcRSI(cd: {o:number,c:number,h:number,l:number}[]) {
  let g=0,l=0; const n=Math.min(14,cd.length-1);
  for(let i=Math.max(1,cd.length-14);i<cd.length;i++){
    const d=cd[i].c-cd[i-1].c; if(d>0) g+=d; else l-=d;
  }
  g/=n; l/=n; return l===0?100:Math.round(100-100/(1+g/l));
}

function calcMACD(cd: {c:number}[]) {
  const c=cd.map(x=>x.c);
  const e12=c.slice(-12).reduce((a,b)=>a+b,0)/Math.min(12,c.length);
  const e26=c.slice(-26).reduce((a,b)=>a+b,0)/Math.min(26,c.length);
  return {val:e12-e26,sig:(e12-e26)*0.9};
}

function calcBoll(cd: {c:number}[]) {
  const c=cd.slice(-20).map(x=>x.c);
  const m=c.reduce((a,b)=>a+b,0)/c.length;
  const s=Math.sqrt(c.reduce((a,b)=>a+Math.pow(b-m,2),0)/c.length);
  return {up:m+2*s,mid:m,dn:m-2*s};
}

function getSignal(r: number, m: {val:number,sig:number}) {
  if(r<30&&m.val>m.sig) return {t:"BUY",  s:"STRONG"  };
  if(r<45&&m.val>m.sig) return {t:"BUY",  s:"MODERATE"};
  if(r>70&&m.val<m.sig) return {t:"SELL", s:"STRONG"  };
  if(r>55&&m.val<m.sig) return {t:"SELL", s:"MODERATE"};
  return {t:"HOLD",s:"NEUTRAL"};
}

function Chart({cd}: {cd:{o:number,c:number,h:number,l:number}[]}) {
  if(!cd||cd.length<2) return <div style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",color:"#333",fontSize:11}}>Loading...</div>;
  const W=280,H=72,cw=W/cd.length-0.5;
  const maxH=Math.max(...cd.map(c=>c.h)),minL=Math.min(...cd.map(c=>c.l)),rng=maxH-minL||1;
  const y=(v:number)=>H-((v-minL)/rng)*H;
  return (
    <svg width={W} height={H} style={{display:"block"}}>
      {cd.map((c,i)=>{
        const x=i*(cw+0.5),up=c.c>=c.o,col=up?"#00FF88":"#FF4466";
        return (
          <g key={i}>
            <line x1={x+cw/2} y1={y(c.h)} x2={x+cw/2} y2={y(c.l)} stroke={col} strokeWidth={0.8}/>
            <rect x={x} y={Math.min(y(c.o),y(c.c))} width={Math.max(cw,1.5)} height={Math.max(Math.abs(y(c.o)-y(c.c)),1)} fill={col} opacity={0.85}/>
          </g>
        );
      })}
    </svg>
  );
}

function RSIGauge({val}: {val:number}) {
  const cx=65,cy=60,r=48,angle=(val/100)*180-90,rad=(angle*Math.PI)/180;
  const col=val<30?"#00FF88":val>70?"#FF4466":"#FFD700";
  return (
    <svg width={130} height={76}>
      <path d={`M${cx-r},${cy} A${r},${r} 0 0,1 ${cx+r},${cy}`} fill="none" stroke="#111128" strokeWidth={9}/>
      <path d={`M${cx-r},${cy} A${r},${r} 0 0,1 ${cx+r},${cy}`} fill="none" stroke={col} strokeWidth={7}
        strokeDasharray={`${(val/100)*150.8} 150.8`} strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={cx+r*Math.sin(rad)} y2={cy-r*Math.cos(rad)} stroke="#fff" strokeWidth={1.5} strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r={3.5} fill="#fff"/>
      <text x={cx} y={cy+14} textAnchor="middle" fill={col} fontSize={12} fontWeight="bold">{val}</text>
    </svg>
  );
}

export default function GcoinAgent() {
  const [prices,setPrices]   = useState<Record<string,number>>(SEED);
  const [changes,setChanges] = useState<Record<string,number>>(()=>{const p:Record<string,number>={};CRYPTOS.forEach(c=>{p[c.id]=0;});return p;});
  const [candles,setCandles] = useState<Record<string,{o:number,c:number,h:number,l:number}[]>>(STATIC_CANDLES);
  const [cdpLive,setCdpLive] = useState(false);
  const [lastUpd,setLastUpd] = useState("");
  const [sel,setSel]         = useState("BTC-USD");
  const [tab,setTab]         = useState("dashboard");
  const [agentOn,setAgentOn] = useState(false);
  const [log,setLog]         = useState<{t:string,m:string}[]>([]);
  const [posts,setPosts]     = useState<{id:number,text:string,time:string,sig:string,sym:string}[]>([]);
  const [posting,setPosting] = useState(false);
  const [portfolio,setPortfolio] = useState<Record<string,number>>({"BTC-USD":0.05,"ETH-USD":1.2,"SOL-USD":8,"ADA-USD":500});
  const [cash,setCash]       = useState(10000);
  const [buyTab,setBuyTab]   = useState("buy");
  const [buyTo,setBuyTo]     = useState("BTC-USD");
  const [buyAmt,setBuyAmt]   = useState("");
  const [sfrom,setSfrom]     = useState("ETH-USD");
  const [sto,setSto]         = useState("SOL-USD");
  const [swapAmt,setSwapAmt] = useState("");
  const [txHist,setTxHist]   = useState<{id:number,type:string,from?:string,to:string,usd:number,coins?:number,price?:number,amtF?:number,amtT?:number,time:string}[]>([]);
  const [earnTab,setEarnTab] = useState("stake");
  const [stakes,setStakes]   = useState<Record<string,{amount:number,since:number}>>({});
  const [farms,setFarms]     = useState<Record<string,{amount:number,since:number}>>({});
  const [stakeIn,setStakeIn] = useState<Record<string,string>>({});
  const [farmIn,setFarmIn]   = useState<Record<string,string>>({});
  const [claimed,setClaimed] = useState(false);
  const [earned,setEarned]   = useState(0);
  const [userPlan,setUserPlan] = useState("free");
  const agentRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const addLog = (msg:string) => setLog(p=>[{t:new Date().toLocaleTimeString(),m:msg},...p.slice(0,24)]);

  const fetchPrices = useCallback(async()=>{
    try{
      const ids=CRYPTOS.map(c=>c.id).join(",");
      const res=await fetch(`https://api.coinbase.com/api/v3/brokerage/market/products?product_ids=${ids}`);
      if(!res.ok) throw new Error("CDP error");
      const data=await res.json();
      if(data.products?.length>0){
        const np:Record<string,number>={},nc:Record<string,number>={};
        data.products.forEach((p:{product_id:string,price:string,price_percentage_change_24h:string})=>{
          if(p.product_id&&parseFloat(p.price)>0){
            np[p.product_id]=parseFloat(p.price);
            nc[p.product_id]=parseFloat(p.price_percentage_change_24h)||0;
          }
        });
        setPrices(prev=>({...prev,...np}));
        setChanges(prev=>({...prev,...nc}));
        setCdpLive(true);
        setLastUpd(new Date().toLocaleTimeString());
      }
    }catch{
      setPrices(p=>{const n={...p};CRYPTOS.forEach(c=>{n[c.id]=nudge(p[c.id]);});return n;});
      setCdpLive(false);
    }
  },[]);

  useEffect(()=>{
    // Generate random candles client-side only (avoids SSR hydration mismatch)
    const d:Record<string,{o:number,c:number,h:number,l:number}[]>={};
    CRYPTOS.forEach(c=>{d[c.id]=genCandles(SEED[c.id]);});
    setCandles(d);
    fetchPrices();
    const t=setInterval(fetchPrices,10000);
    return()=>clearInterval(t);
  },[fetchPrices]);

  useEffect(()=>{
    if(agentOn){
      agentRef.current=setInterval(()=>{
        CRYPTOS.slice(0,5).forEach(c=>{
          const cd=candles[c.id];if(!cd||cd.length<14)return;
          const r=calcRSI(cd),m=calcMACD(cd),s=getSignal(r,m);
          if(s.t!=="HOLD") addLog(`🤖 ${c.sym} → ${s.s} ${s.t} (RSI:${r}) @ $${fmtN(prices[c.id])}`);
        });
      },10000);
    } else if(agentRef.current) clearInterval(agentRef.current);
    return()=>{if(agentRef.current)clearInterval(agentRef.current);};
  },[agentOn,candles,prices]);

  useEffect(()=>{
    const t=setInterval(()=>{
      let total=0;
      Object.entries(stakes).forEach(([pid,pos])=>{
        if(!pos?.amount)return;
        const pool=STAKING.find(p=>p.id===pid);
        if(!pool)return;
        const hrs=(Date.now()-pos.since)/3600000;
        total+=pos.amount*(prices[pid]||0)*(pool.apy/100)*(hrs/8760);
      });
      setEarned(total);
    },5000);
    return()=>clearInterval(t);
  },[stakes,prices]);

  const selC    = CRYPTOS.find(c=>c.id===sel)!;
  const selCD   = candles[sel]||[];
  const selRSI  = selCD.length>1?calcRSI(selCD):50;
  const selMACD = selCD.length>1?calcMACD(selCD):{val:0,sig:0};
  const selBoll = selCD.length>1?calcBoll(selCD):{up:0,mid:0,dn:0};
  const selSig  = getSignal(selRSI,selMACD);
  const sc      = sigCol(selSig.t);
  const portVal = Object.entries(portfolio).reduce((s,[id,q])=>s+(prices[id]||0)*q,0);

  const doBuy=()=>{
    const amt=parseFloat(buyAmt);if(!amt||amt<=0||amt>cash)return;
    const coins=amt/prices[buyTo],sym=CRYPTOS.find(c=>c.id===buyTo)?.sym||"";
    setCash(p=>p-amt);setPortfolio(p=>({...p,[buyTo]:(p[buyTo]||0)+coins}));
    setTxHist(h=>[{id:Date.now(),type:"BUY",to:sym,usd:amt,coins,price:prices[buyTo],time:new Date().toLocaleTimeString()},...h]);
    addLog(`💰 Bought ${coins.toFixed(6)} ${sym} for ${fmtUSD(amt)}`);setBuyAmt("");
  };

  const doSwap=()=>{
    const amt=parseFloat(swapAmt);if(!amt||amt<=0)return;
    const fc=CRYPTOS.find(c=>c.id===sfrom),tc=CRYPTOS.find(c=>c.id===sto);
    if(!fc||!tc||amt>(portfolio[sfrom]||0))return;
    const recv=(amt*prices[sfrom])/prices[sto];
    setPortfolio(p=>({...p,[sfrom]:p[sfrom]-amt,[sto]:(p[sto]||0)+recv}));
    setTxHist(h=>[{id:Date.now(),type:"SWAP",from:fc.sym,to:tc.sym,amtF:amt,amtT:recv,usd:amt*prices[sfrom],time:new Date().toLocaleTimeString()},...h]);
    addLog(`🔄 ${amt} ${fc.sym} → ${recv.toFixed(6)} ${tc.sym}`);setSwapAmt("");
  };

  const doStake=(pid:string)=>{
    const pool=STAKING.find(p=>p.id===pid),amt=parseFloat(stakeIn[pid]||"0");
    if(!pool||!amt||amt<pool.min||amt>(portfolio[pid]||0))return;
    setPortfolio(p=>({...p,[pid]:p[pid]-amt}));
    setStakes(s=>({...s,[pid]:{amount:(s[pid]?.amount||0)+amt,since:Date.now()}}));
    addLog(`🥩 Staked ${amt} ${CRYPTOS.find(c=>c.id===pid)?.sym} @ ${pool.apy}% APY`);
    setStakeIn(s=>({...s,[pid]:""}));
  };

  const doUnstake=(pid:string)=>{
    const pos=stakes[pid];if(!pos?.amount)return;
    const pool=STAKING.find(p=>p.id===pid);if(!pool)return;
    const reward=pos.amount*(pool.apy/100)*((Date.now()-pos.since)/3600000/8760);
    setPortfolio(p=>({...p,[pid]:(p[pid]||0)+pos.amount+reward}));
    setStakes(s=>({...s,[pid]:{amount:0,since:0}}));
    addLog(`✅ Unstaked + ${reward.toFixed(8)} ${CRYPTOS.find(c=>c.id===pid)?.sym} reward`);
  };

  const doFarm=(pair:string)=>{
    const amt=parseFloat(farmIn[pair]||"0");if(!amt||amt>cash)return;
    setCash(p=>p-amt);
    setFarms(f=>({...f,[pair]:{amount:(f[pair]?.amount||0)+amt,since:Date.now()}}));
    addLog(`🌾 Added ${fmtUSD(amt)} to ${pair} pool`);setFarmIn(f=>({...f,[pair]:""}));
  };

  const doWithdraw=(pair:string)=>{
    const pos=farms[pair];if(!pos?.amount)return;
    const farm=FARMS.find(f=>f.pair===pair);if(!farm)return;
    const yld=pos.amount*(farm.apy/100)*((Date.now()-pos.since)/3600000/8760);
    setCash(p=>p+pos.amount+yld);
    setFarms(f=>({...f,[pair]:{amount:0,since:0}}));
    addLog(`🌾 Withdrew ${fmtUSD(pos.amount)} + ${fmtUSD(yld)} yield`);
  };

  const doDaily=()=>{
    if(claimed)return;const r=2.5+Math.random()*5;
    setCash(p=>p+r);setClaimed(true);addLog(`🎁 Daily reward: ${fmtUSD(r)}`);
  };

  const doPost=async()=>{
    setPosting(true);await new Promise(r=>setTimeout(r,1500));
    const msg=`🤖 GcoinAgent by @${FARCASTER}\n\n${selC.sym} @ $${fmtN(prices[sel])}\n24h: ${changes[sel]>=0?"+":""}${(changes[sel]||0).toFixed(2)}%\nRSI: ${selRSI} | MACD: ${selMACD.val>selMACD.sig?"↑":"↓"}\n\nSignal: ${selSig.s} ${selSig.t} 🎯\n📡 CDP Trade API\n\nFollow @${TWITTER} on X 🐦\n#crypto #${selC.sym} #GcoinAgent #Base`;
    setPosts(p=>[{id:Date.now(),text:msg,time:new Date().toLocaleTimeString(),sig:selSig.t,sym:selC.sym},...p]);
    addLog(`📡 @${FARCASTER} posted: ${selC.sym} ${selSig.t}`);setPosting(false);
  };

  const CARD:React.CSSProperties={padding:14,borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"};
  const LBL:React.CSSProperties={fontSize:9,color:"#555",letterSpacing:2,marginBottom:6,textTransform:"uppercase"};
  const INP:React.CSSProperties={width:"100%",padding:"9px 11px",borderRadius:7,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff",fontSize:11,fontFamily:"monospace",outline:"none",boxSizing:"border-box"};
  const BTN=(col:string):React.CSSProperties=>({padding:"9px 16px",borderRadius:7,cursor:"pointer",border:`1px solid ${col}55`,background:`${col}18`,color:"#fff",fontSize:11,letterSpacing:1,fontFamily:"monospace",transition:"all 0.2s"});
  const BTNSOLID=(col:string):React.CSSProperties=>({padding:"11px",borderRadius:8,cursor:"pointer",border:"none",background:col,color:"#fff",fontSize:12,fontFamily:"monospace",letterSpacing:1,width:"100%",fontWeight:"bold"});
  const BADGE=(r:string):React.CSSProperties=>({padding:"2px 7px",borderRadius:4,fontSize:9,letterSpacing:1,color:riskCol(r),background:riskCol(r)+"22",border:`1px solid ${riskCol(r)}55`});

  const statusDot=cdpLive?"#00FF88":"#FFD700";
  const TABS=[["dashboard","📊 Dashboard"],["signals","⚡ Signals"],["buy","🛒 Buy/Swap"],["earn","💎 Earn"],["portfolio","💼 Portfolio"],["farcaster","📡 Farcaster"]];

  return (
    <div style={{minHeight:"100vh",background:"#050510",color:"#dde0ff",fontFamily:"monospace",fontSize:13}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:"1px solid rgba(99,102,241,.25)",background:"rgba(5,5,16,.97)",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${selC.col},#6366F1)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:`0 0 14px ${selC.col}44`}}>₿</div>
          <div>
            <div style={{fontSize:16,fontWeight:"bold",letterSpacing:3,color:"#fff"}}>GCOIN<span style={{color:"#6366F1"}}>AGENT</span></div>
            <div style={{fontSize:9,color:"#6366F1",letterSpacing:1}}>@{TWITTER} · @{FARCASTER}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:20,background:`${statusDot}11`,border:`1px solid ${statusDot}44`}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:statusDot,boxShadow:`0 0 6px ${statusDot}`}}/>
          <span style={{fontSize:9,letterSpacing:1,color:statusDot}}>{cdpLive?"CDP LIVE":"SIMULATED"}</span>
          {lastUpd&&<span style={{fontSize:8,color:"#444"}}>· {lastUpd}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"#555"}}>CASH</div><div style={{color:"#00FF88",fontWeight:"bold",fontSize:12}}>{fmtUSD(cash)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"#555"}}>PORTFOLIO</div><div style={{color:"#fff",fontWeight:"bold",fontSize:12}}>{fmtUSD(portVal)}</div></div>
          <button onClick={()=>{setAgentOn(!agentOn);addLog(agentOn?"🛑 Agent stopped":"🚀 Agent started");}} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",border:`1px solid ${agentOn?"#00FF88":"#FF4466"}`,background:agentOn?"rgba(0,255,136,.12)":"rgba(255,68,102,.12)",color:agentOn?"#00FF88":"#FF4466",fontSize:10,fontFamily:"monospace",letterSpacing:1}}>
            {agentOn?"● LIVE":"○ START"}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(99,102,241,.15)",background:"rgba(5,5,16,.95)",overflowX:"auto"}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"9px 14px",background:"none",border:"none",borderBottom:tab===k?"2px solid #6366F1":"2px solid transparent",color:tab===k?"#fff":"#444",cursor:"pointer",fontSize:11,fontFamily:"monospace",whiteSpace:"nowrap"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"16px 20px",maxHeight:"calc(100vh - 108px)",overflowY:"auto"}}>

        {/* DASHBOARD */}
        {tab==="dashboard"&&(
          <div style={{display:"grid",gridTemplateColumns:"185px 1fr",gap:14}}>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {CRYPTOS.map(c=>{
                const p=prices[c.id],chg=changes[c.id]||0,up=chg>=0;
                return(
                  <div key={c.id} onClick={()=>setSel(c.id)} style={{padding:"8px 10px",borderRadius:7,cursor:"pointer",background:sel===c.id?`${c.col}15`:"rgba(255,255,255,.025)",border:sel===c.id?`1px solid ${c.col}55`:"1px solid rgba(255,255,255,.05)"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:sel===c.id?c.col:"#ccc",fontWeight:"bold",fontSize:12}}>{c.sym}</span>
                      <span style={{fontSize:10,color:up?"#00FF88":"#FF4466"}}>{up?"+":""}{chg.toFixed(2)}%</span>
                    </div>
                    <div style={{fontSize:10,color:"#666",marginTop:1}}>${fmtN(p)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:16,borderRadius:11,background:`linear-gradient(135deg,${selC.col}10,rgba(99,102,241,.08))`,border:`1px solid ${selC.col}30`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:10,color:"#555",letterSpacing:2,marginBottom:2}}>{selC.name.toUpperCase()} <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:"rgba(99,102,241,.2)",color:"#6366F1"}}>CDP</span></div>
                    <div style={{fontSize:30,fontWeight:"bold",color:selC.col}}>${fmtN(prices[sel])}</div>
                    <div style={{fontSize:11,color:changes[sel]>=0?"#00FF88":"#FF4466",marginTop:2}}>{changes[sel]>=0?"+":""}{(changes[sel]||0).toFixed(2)}% (24h)</div>
                  </div>
                  <div style={{padding:"8px 14px",borderRadius:8,background:sc+"20",border:`1px solid ${sc}55`,color:sc,fontWeight:"bold",fontSize:12,textAlign:"center"}}>
                    <div>{selSig.s}</div><div>{selSig.t}</div>
                  </div>
                </div>
                <Chart cd={selCD.slice(-30)}/>
                <div style={{fontSize:9,color:"#333",marginTop:4,textAlign:"right"}}>Simulated candles · CDP prices live</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div style={CARD}><div style={LBL}>RSI (14)</div><RSIGauge val={selRSI}/><div style={{fontSize:10,color:"#666"}}>{selRSI<30?"⚡ Oversold":selRSI>70?"🔥 Overbought":"⚖️ Neutral"}</div></div>
                <div style={CARD}>
                  <div style={LBL}>MACD</div>
                  <div style={{fontSize:20,fontWeight:"bold",color:selMACD.val>selMACD.sig?"#00FF88":"#FF4466",marginBottom:4}}>{selMACD.val>0?"+":""}{selMACD.val.toFixed(2)}</div>
                  <div style={{fontSize:10,color:"#666",marginBottom:6}}>Signal: {selMACD.sig.toFixed(2)}</div>
                  <div style={{height:3,borderRadius:2,background:"#111128"}}><div style={{height:"100%",borderRadius:2,width:`${Math.min(Math.abs(selMACD.val/(selMACD.sig||1))*50,100)}%`,background:selMACD.val>selMACD.sig?"#00FF88":"#FF4466"}}/></div>
                  <div style={{fontSize:10,color:"#666",marginTop:5}}>{selMACD.val>selMACD.sig?"↑ Bullish":"↓ Bearish"}</div>
                </div>
                <div style={CARD}>
                  <div style={LBL}>Bollinger Bands</div>
                  {([["Upper",selBoll.up,"#FF4466"],["Middle",selBoll.mid,"#FFD700"],["Lower",selBoll.dn,"#00FF88"]] as [string,number,string][]).map(([l,v,c])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                      <span style={{color:"#555"}}>{l}</span><span style={{color:c}}>${fmtN(v)}</span>
                    </div>
                  ))}
                  {selBoll.up>0&&<div style={{marginTop:8,position:"relative",height:5,borderRadius:3,background:"linear-gradient(to right,#00FF88,#FFD700,#FF4466)"}}><div style={{position:"absolute",top:-3,left:`${Math.min(100,Math.max(0,(prices[sel]-selBoll.dn)/(selBoll.up-selBoll.dn)*100))}%`,transform:"translateX(-50%)",width:11,height:11,borderRadius:"50%",background:"#fff",border:"2px solid #6366F1"}}/></div>}
                </div>
              </div>
              <button onClick={doPost} disabled={posting} style={{...BTN("#6366F1"),padding:"11px",width:"100%",fontSize:11}}>
                {posting?"📡 POSTING...":` 📡 POST ${selC.sym} SIGNAL AS @${FARCASTER}`}
              </button>
            </div>
          </div>
        )}

        {/* SIGNALS */}
        {tab==="signals"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {CRYPTOS.map(c=>{
              const cd=candles[c.id]||[],r=cd.length>1?calcRSI(cd):50,m=cd.length>1?calcMACD(cd):{val:0,sig:0};
              const s=getSignal(r,m),scc=sigCol(s.t),chg=changes[c.id]||0;
              return(
                <div key={c.id} style={{padding:14,borderRadius:10,background:`${c.col}08`,border:`1px solid ${c.col}30`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:c.col,boxShadow:`0 0 6px ${c.col}`}}/>
                      <span style={{color:c.col,fontWeight:"bold",fontSize:13}}>{c.sym}</span>
                      <span style={{fontSize:9,color:chg>=0?"#00FF88":"#FF4466"}}>{chg>=0?"+":""}{chg.toFixed(2)}%</span>
                    </div>
                    <div style={{fontSize:11,color:"#666"}}>Price: <span style={{color:"#fff"}}>${fmtN(prices[c.id])}</span></div>
                    <div style={{fontSize:11,color:"#666"}}>RSI: <span style={{color:"#ccc"}}>{r}</span></div>
                    <div style={{fontSize:11,color:"#666"}}>MACD: <span style={{color:m.val>m.sig?"#00FF88":"#FF4466"}}>{m.val>m.sig?"↑ Bull":"↓ Bear"}</span></div>
                  </div>
                  <div style={{padding:"9px 12px",borderRadius:7,textAlign:"center",background:scc+"18",border:`1px solid ${scc}55`,color:scc}}>
                    <div style={{fontSize:16,fontWeight:"bold"}}>{s.t==="BUY"?"▲":s.t==="SELL"?"▼":"◆"}</div>
                    <div style={{fontSize:9,letterSpacing:1}}>{s.s}</div>
                    <div style={{fontSize:11,fontWeight:"bold",marginTop:1}}>{s.t}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BUY / SWAP */}
        {tab==="buy"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"8px 12px",borderRadius:7,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",fontSize:11,color:"#aaa"}}>
                📡 Prices from <span style={{color:"#6366F1"}}>CDP Advanced Trade API</span>
              </div>
              <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)"}}>
                {[["buy","🛒 Buy"],["swap","🔄 Swap"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setBuyTab(k)} style={{flex:1,padding:"9px",background:buyTab===k?"rgba(99,102,241,.25)":"transparent",border:"none",color:buyTab===k?"#fff":"#555",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>{l}</button>
                ))}
              </div>
              {buyTab==="buy"&&(
                <div style={CARD}>
                  <div style={LBL}>Buy Crypto (Simulation)</div>
                  <div style={{fontSize:11,color:"#00FF88",marginBottom:10}}>💵 Available: {fmtUSD(cash)}</div>
                  <div style={{marginBottom:8}}><div style={{fontSize:9,color:"#555",marginBottom:3}}>SELECT CRYPTO</div>
                    <select value={buyTo} onChange={e=>setBuyTo(e.target.value)} style={{...INP,cursor:"pointer"}}>
                      {CRYPTOS.map(c=>(<option key={c.id} value={c.id} style={{background:"#0a0a1e"}}>{c.sym} — ${fmtN(prices[c.id])}</option>))}
                    </select>
                  </div>
                  <div style={{marginBottom:8}}><div style={{fontSize:9,color:"#555",marginBottom:3}}>AMOUNT (USD)</div><input type="number" value={buyAmt} onChange={e=>setBuyAmt(e.target.value)} placeholder="e.g. 500" style={INP}/></div>
                  {parseFloat(buyAmt)>0&&<div style={{padding:"7px 10px",borderRadius:6,background:"rgba(0,255,136,.05)",border:"1px solid rgba(0,255,136,.2)",marginBottom:8,fontSize:11}}>≈ <span style={{color:"#00FF88",fontWeight:"bold"}}>{(parseFloat(buyAmt)/prices[buyTo]).toFixed(6)} {CRYPTOS.find(c=>c.id===buyTo)?.sym}</span></div>}
                  <button onClick={doBuy} style={{...BTNSOLID("#00FF88"),marginTop:4}}>▲ BUY NOW</button>
                </div>
              )}
              {buyTab==="swap"&&(
                <div style={CARD}>
                  <div style={LBL}>Swap Crypto</div>
                  <div style={{marginBottom:6}}><div style={{fontSize:9,color:"#555",marginBottom:3}}>FROM</div><select value={sfrom} onChange={e=>setSfrom(e.target.value)} style={{...INP,cursor:"pointer"}}>{CRYPTOS.map(c=>(<option key={c.id} value={c.id} style={{background:"#0a0a1e"}}>{c.sym} ({(portfolio[c.id]||0).toFixed(4)})</option>))}</select></div>
                  <div style={{textAlign:"center",fontSize:18,color:"#6366F1",margin:"3px 0"}}>⇅</div>
                  <div style={{marginBottom:6}}><div style={{fontSize:9,color:"#555",marginBottom:3}}>TO</div><select value={sto} onChange={e=>setSto(e.target.value)} style={{...INP,cursor:"pointer"}}>{CRYPTOS.filter(c=>c.id!==sfrom).map(c=>(<option key={c.id} value={c.id} style={{background:"#0a0a1e"}}>{c.sym}</option>))}</select></div>
                  <div style={{marginBottom:8}}><div style={{fontSize:9,color:"#555",marginBottom:3}}>AMOUNT</div><input type="number" value={swapAmt} onChange={e=>setSwapAmt(e.target.value)} placeholder="Amount" style={INP}/></div>
                  {parseFloat(swapAmt)>0&&<div style={{padding:"7px 10px",borderRadius:6,background:"rgba(99,102,241,.05)",border:"1px solid rgba(99,102,241,.25)",marginBottom:8,fontSize:11}}>≈ <span style={{color:"#6366F1",fontWeight:"bold"}}>{((parseFloat(swapAmt)*prices[sfrom])/prices[sto]).toFixed(6)} {CRYPTOS.find(c=>c.id===sto)?.sym}</span></div>}
                  <button onClick={doSwap} style={BTNSOLID("#6366F1")}>🔄 SWAP NOW</button>
                </div>
              )}
            </div>
            <div>
              <div style={{...LBL,marginBottom:10}}>Transaction History</div>
              {txHist.length===0&&<div style={{color:"#333",fontSize:12,fontStyle:"italic"}}>No transactions yet...</div>}
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {txHist.map(tx=>(
                  <div key={tx.id} style={{padding:"9px 12px",borderRadius:7,background:tx.type==="BUY"?"rgba(0,255,136,.04)":"rgba(99,102,241,.04)",border:`1px solid ${tx.type==="BUY"?"rgba(0,255,136,.18)":"rgba(99,102,241,.18)"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:tx.type==="BUY"?"#00FF88":"#6366F1",fontWeight:"bold",fontSize:11}}>{tx.type==="BUY"?"▲ BUY":"🔄 SWAP"}</span><span style={{color:"#333",fontSize:9}}>{tx.time}</span></div>
                    {tx.type==="BUY"?<div style={{fontSize:11,color:"#aaa"}}>{fmtUSD(tx.usd)} → <span style={{color:"#fff"}}>{tx.coins?.toFixed(6)} {tx.to}</span></div>:<div style={{fontSize:11,color:"#aaa"}}>{tx.amtF?.toFixed(4)} {tx.from} → <span style={{color:"#fff"}}>{tx.amtT?.toFixed(6)} {tx.to}</span></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EARN */}
        {tab==="earn"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div style={{padding:14,borderRadius:10,background:"rgba(255,215,0,.06)",border:"1px solid rgba(255,215,0,.2)",textAlign:"center"}}><div style={{...LBL,textAlign:"center"}}>Staking Rewards</div><div style={{fontSize:20,fontWeight:"bold",color:"#FFD700"}}>{fmtUSD(earned)}</div><div style={{fontSize:9,color:"#555",marginTop:3}}>Live ✨</div></div>
              <div style={{padding:14,borderRadius:10,background:"rgba(99,102,241,.06)",border:"1px solid rgba(99,102,241,.2)",textAlign:"center"}}><div style={{...LBL,textAlign:"center"}}>Farming Locked</div><div style={{fontSize:20,fontWeight:"bold",color:"#6366F1"}}>{fmtUSD(Object.values(farms).reduce((s,p)=>s+(p?.amount||0),0))}</div></div>
              <div onClick={doDaily} style={{padding:14,borderRadius:10,textAlign:"center",cursor:claimed?"default":"pointer",background:claimed?"rgba(255,255,255,.02)":"rgba(0,255,136,.08)",border:`1px solid ${claimed?"rgba(255,255,255,.05)":"rgba(0,255,136,.3)"}`}}>
                <div style={{fontSize:22,marginBottom:3}}>🎁</div>
                <div style={{fontSize:11,fontWeight:"bold",color:claimed?"#333":"#00FF88"}}>{claimed?"CLAIMED ✓":"CLAIM DAILY"}</div>
                <div style={{fontSize:9,color:"#444",marginTop:2}}>$2.5–$7.5</div>
              </div>
            </div>
            <div style={{display:"flex",borderRadius:7,overflow:"hidden",border:"1px solid rgba(255,255,255,.08)",width:"fit-content"}}>
              {[["stake","🥩 Staking"],["farm","🌾 Yield Farming"]].map(([k,l])=>(
                <button key={k} onClick={()=>setEarnTab(k)} style={{padding:"9px 18px",background:earnTab===k?"rgba(99,102,241,.25)":"transparent",border:"none",color:earnTab===k?"#fff":"#555",cursor:"pointer",fontSize:11,fontFamily:"monospace"}}>{l}</button>
              ))}
            </div>
            {earnTab==="stake"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {STAKING.map(pool=>{
                  const c=CRYPTOS.find(x=>x.id===pool.id)!,pos=stakes[pool.id],has=pos?.amount>0;
                  const acc=has?pos.amount*(pool.apy/100)*((Date.now()-pos.since)/3600000/8760):0;
                  return(
                    <div key={pool.id} style={{padding:14,borderRadius:10,background:`${c.col}07`,border:`1px solid ${c.col}28`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:7,height:7,borderRadius:"50%",background:c.col,boxShadow:`0 0 6px ${c.col}`}}/><span style={{color:c.col,fontWeight:"bold",fontSize:14}}>{c.sym}</span></div>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={BADGE(pool.risk)}>{pool.risk}</span><span style={{color:"#FFD700",fontWeight:"bold"}}>{pool.apy}% APY</span></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:11,marginBottom:10}}>
                        <div style={{color:"#555"}}>Price: <span style={{color:"#ccc"}}>${fmtN(prices[pool.id])}</span></div>
                        <div style={{color:"#555"}}>Lock: <span style={{color:"#ccc"}}>{pool.lock}d</span></div>
                        <div style={{color:"#555"}}>Held: <span style={{color:"#ccc"}}>{(portfolio[pool.id]||0).toFixed(4)}</span></div>
                        <div style={{color:"#555"}}>Staked: <span style={{color:has?"#00FF88":"#333"}}>{has?pos.amount.toFixed(4):"—"}</span></div>
                      </div>
                      {has&&<div style={{padding:"5px 9px",borderRadius:5,background:"rgba(255,215,0,.05)",border:"1px solid rgba(255,215,0,.18)",marginBottom:8,fontSize:11}}>Accrued: <span style={{color:"#FFD700"}}>{acc.toFixed(8)} {c.sym}</span></div>}
                      {!has?(<div style={{display:"flex",gap:6}}><input type="number" value={stakeIn[pool.id]||""} onChange={e=>setStakeIn(s=>({...s,[pool.id]:e.target.value}))} placeholder={`Min ${pool.min}`} style={{...INP,flex:1}}/><button onClick={()=>doStake(pool.id)} style={BTN(c.col)}>STAKE</button></div>):(<button onClick={()=>doUnstake(pool.id)} style={{...BTN("#FF4466"),width:"100%"}}>⬆ UNSTAKE + CLAIM</button>)}
                    </div>
                  );
                })}
              </div>
            )}
            {earnTab==="farm"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {FARMS.map(farm=>{
                  const pos=farms[farm.pair],has=pos?.amount>0;
                  const yld=has?pos.amount*(farm.apy/100)*((Date.now()-pos.since)/3600000/8760):0;
                  return(
                    <div key={farm.pair} style={{padding:14,borderRadius:10,background:`${farm.col}07`,border:`1px solid ${farm.col}28`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <span style={{color:farm.col,fontWeight:"bold",fontSize:14}}>{farm.pair}</span>
                        <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={BADGE(farm.risk)}>{farm.risk}</span><span style={{color:"#FFD700",fontWeight:"bold"}}>{farm.apy}% APY</span></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:11,marginBottom:10}}>
                        <div style={{color:"#555"}}>TVL: <span style={{color:"#ccc"}}>${farm.tvl}M</span></div>
                        <div style={{color:"#555"}}>Position: <span style={{color:has?"#00FF88":"#333"}}>{has?fmtUSD(pos.amount):"—"}</span></div>
                      </div>
                      {has&&<div style={{padding:"5px 9px",borderRadius:5,background:"rgba(255,215,0,.05)",border:"1px solid rgba(255,215,0,.18)",marginBottom:8,fontSize:11}}>Yield: <span style={{color:"#FFD700"}}>{fmtUSD(yld)}</span></div>}
                      {!has?(<div style={{display:"flex",gap:6}}><input type="number" value={farmIn[farm.pair]||""} onChange={e=>setFarmIn(f=>({...f,[farm.pair]:e.target.value}))} placeholder="USD amount" style={{...INP,flex:1}}/><button onClick={()=>doFarm(farm.pair)} style={BTN(farm.col)}>ADD LP</button></div>):(<button onClick={()=>doWithdraw(farm.pair)} style={{...BTN("#FF4466"),width:"100%"}}>⬆ WITHDRAW + YIELD</button>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PORTFOLIO */}
        {tab==="portfolio"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{padding:18,borderRadius:11,textAlign:"center",background:"linear-gradient(135deg,rgba(99,102,241,.14),rgba(0,255,136,.04))",border:"1px solid rgba(99,102,241,.25)"}}><div style={LBL}>Portfolio Value · CDP Prices</div><div style={{fontSize:32,fontWeight:"bold",color:"#00FF88"}}>{fmtUSD(portVal)}</div></div>
              <div style={{padding:18,borderRadius:11,textAlign:"center",background:"linear-gradient(135deg,rgba(255,215,0,.07),rgba(99,102,241,.04))",border:"1px solid rgba(255,215,0,.18)"}}><div style={LBL}>Total (Cash + Portfolio)</div><div style={{fontSize:32,fontWeight:"bold",color:"#FFD700"}}>{fmtUSD(portVal+cash)}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {Object.entries(portfolio).filter(([,q])=>q>0.000001).map(([id,qty])=>{
                const c=CRYPTOS.find(x=>x.id===id);if(!c)return null;
                const val=prices[id]*qty,pct=(val/portVal*100).toFixed(1);
                return(
                  <div key={id} style={{padding:12,borderRadius:9,background:`${c.col}09`,border:`1px solid ${c.col}28`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{color:c.col,fontWeight:"bold"}}>{c.sym}</span><span style={{color:"#555",fontSize:10}}>{pct}%</span></div>
                    <div style={{fontSize:11,color:"#666"}}>Qty: <span style={{color:"#ccc"}}>{qty.toFixed(4)}</span></div>
                    <div style={{fontSize:14,fontWeight:"bold",color:"#fff",marginTop:3}}>{fmtUSD(val)}</div>
                    <div style={{marginTop:7,height:2,borderRadius:1,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:1,width:`${pct}%`,background:c.col}}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FARCASTER */}
        {tab==="farcaster"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Subscribe */}
            <div>
              <div style={{...LBL,marginBottom:10}}>Plans & Subscriptions · USDC on Base</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {PLANS.map(plan=>{
                  const isActive=userPlan===plan.id;
                  return(
                    <div key={plan.id} style={{padding:14,borderRadius:11,background:isActive?`${plan.col}12`:"rgba(255,255,255,.03)",border:`${isActive?2:1}px solid ${isActive?plan.col+"88":plan.col+"33"}`}}>
                      <div style={{color:plan.col,fontWeight:"bold",fontSize:14,marginBottom:4}}>{plan.name}</div>
                      <div style={{fontSize:18,fontWeight:"bold",color:"#fff",marginBottom:10}}>{plan.priceUSDC===0?"Free":`${plan.priceUSDC} USDC`}<span style={{fontSize:9,color:"#555",fontWeight:"normal"}}>{plan.priceUSDC>0?"/mo":""}</span></div>
                      <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>
                        {plan.perks.map(p=>(<div key={p} style={{fontSize:10,color:"#aaa",display:"flex",gap:6}}><span style={{color:plan.col}}>✓</span>{p}</div>))}
                      </div>
                      <button onClick={()=>setUserPlan(plan.id)} style={{...BTNSOLID(isActive?"#333":plan.col),cursor:isActive?"default":"pointer",opacity:isActive?.7:1}}>
                        {isActive?"✅ Active":`${plan.priceUSDC===0?"Start Free":"Subscribe"}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <div style={{padding:14,borderRadius:10,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.22)",marginBottom:14}}>
                  <div style={{...LBL,marginBottom:10}}>Your Profiles</div>
                  <div style={{display:"flex",gap:10}}>
                    <a href={`https://x.com/${TWITTER}`} target="_blank" rel="noreferrer" style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:7,background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.08)",textDecoration:"none",color:"#fff"}}>
                      <span style={{fontSize:18}}>🐦</span><div><div style={{fontSize:8,color:"#555"}}>X / TWITTER</div><div style={{fontWeight:"bold",fontSize:11}}>@{TWITTER}</div></div>
                    </a>
                    <a href={`https://farcaster.xyz/${FARCASTER}`} target="_blank" rel="noreferrer" style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:7,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.35)",textDecoration:"none",color:"#fff"}}>
                      <span style={{fontSize:18}}>🟣</span><div><div style={{fontSize:8,color:"#555"}}>FARCASTER</div><div style={{fontWeight:"bold",fontSize:11}}>@{FARCASTER}</div></div>
                    </a>
                  </div>
                </div>
                <div style={LBL}>Agent Log</div>
                {log.length===0&&<div style={{color:"#333",fontSize:11,fontStyle:"italic"}}>Start the agent to see activity...</div>}
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {log.map((e,i)=><div key={i} style={{padding:"7px 10px",borderRadius:6,fontSize:11,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.04)"}}><span style={{color:"#6366F1"}}>[{e.t}]</span> {e.m}</div>)}
                </div>
              </div>
              <div>
                <div style={LBL}>Farcaster Posts</div>
                {posts.length===0&&<div style={{color:"#333",fontSize:11,fontStyle:"italic"}}>Post a signal from Dashboard!</div>}
                <div style={{display:"flex",flexDirection:"column",gap:9}}>
                  {posts.map(post=>{
                    const psc=sigCol(post.sig);
                    return(<div key={post.id} style={{padding:13,borderRadius:9,background:"rgba(255,255,255,.025)",border:`1px solid ${psc}30`}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{color:"#6366F1",fontSize:11}}>🟣 @{FARCASTER}</span><span style={{color:"#333",fontSize:9}}>{post.time}</span></div>
                      <pre style={{margin:0,fontSize:11,color:"#ccc",whiteSpace:"pre-wrap",fontFamily:"monospace",lineHeight:1.5}}>{post.text}</pre>
                    </div>);
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}