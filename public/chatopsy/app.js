const input = document.getElementById("chatInput");
const feed = document.getElementById("feed");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const messageCount = document.getElementById("messageCount");

const deflections = new Set(["fine","fine.","ok","okay","okay.","k","sure","sure.","idk","whatever","nothing","nothing."]);

function rows(){
  return input.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}
function parse(line){
  const i=line.indexOf(":");
  return i<0?{speaker:"Unknown",text:line}:{speaker:line.slice(0,i).trim(),text:line.slice(i+1).trim()};
}
function updateCount(){
  const n=rows().length;
  messageCount.textContent=`${n} message${n===1?"":"s"}`;
  analyzeBtn.disabled=!input.value.trim();
}
function normalize(nums){
  const sum=nums.reduce((a,b)=>a+b,0)||1;
  const r=nums.map(v=>Math.round(v/sum*100));
  r[0]+=100-r.reduce((a,b)=>a+b,0);
  return r;
}
function analyze(){
  const messages=rows().map(parse);
  if(!messages.length)return;
  const last=messages.at(-1)?.text||"";
  const prev=messages.at(-2)?.text||"";
  const words=last.split(/\s+/).filter(Boolean);
  const prevWords=prev.split(/\s+/).filter(Boolean);
  const signals=[];

  const collapsed=words.length<=3 && prevWords.length>=4 && words.length<=Math.max(1,prevWords.length/2);
  if(collapsed)signals.push(["Reply length collapsed","The latest response is much shorter than the line before it.","moderate"]);

  if(deflections.has(last.toLowerCase()))signals.push(["Possible deflection",`“${last}” can close a topic without actually answering it.`,"moderate"]);

  if(/[?？]\s*$/.test(prev) && !/^(yes|yeah|yep|no|nope|nah)\b/i.test(last)){
    signals.push(["Question sidestepped","The previous message asked something direct, but the reply did not answer it directly.","strong"]);
  }

  if(/\.$/.test(last)&&words.length<=3){
    signals.push(["Abrupt punctuation","A short period-ended reply can feel more final, but this is weak without a personal baseline.","weak"]);
  }

  let upset=28, fine=31, notice=21, unknown=20;
  for(const s of signals){
    const boost=s[2]==="strong"?12:s[2]==="moderate"?8:3;
    if(/deflection|sidestepped|collapsed/i.test(s[0])){
      upset+=boost;notice+=Math.round(boost*.55);fine-=Math.round(boost*.6);
    }
    if(/punctuation/i.test(s[0])){upset+=2;unknown+=3}
  }
  if(messages.length<3)unknown+=20;
  const vals=normalize([Math.max(5,upset),Math.max(5,fine),Math.max(5,notice),Math.max(5,unknown)]);
  const hypotheses=[
    ["mildly upset / withdrawing",vals[0],"Some withdrawal-like signals appear, but none prove emotion."],
    ["genuinely fine",vals[1],"The literal reading is still possible."],
    ["wants you to notice",vals[2],"A deflective answer can sometimes signal reluctance to explain."],
    ["unknowable",vals[3],"Some ambiguity should stay visible instead of being forced into a story."]
  ];

  const strong=signals.filter(s=>s[2]!=="weak").length;
  const confidence=strong>=3&&messages.length>=5?"HIGH":strong>=1?"MEDIUM":"LOW";
  const finding=signals.length
    ?"The last message matters less than the shift around it."
    :"Nothing here is strong enough to justify a dramatic conclusion.";
  const explanation=signals.length
    ?"A few conversational signals are worth noticing, but they do not reveal a private mental state."
    :"The safest read is still the literal one until more context appears.";

  render({hypotheses,signals,confidence,finding,explanation});
}
function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}
function render(r){
  const sigs=r.signals.length?r.signals:[["No strong signal","The conversation does not show enough change to support a confident story.","weak"]];
  feed.innerHTML=`
    <div class="report">
      <div class="caseRow"><span>autopsy report</span><span>confidence <b>${r.confidence}</b></span></div>
      <section class="verdict">
        <small>primary finding</small>
        <h2>${esc(r.finding)}</h2>
        <p>${esc(r.explanation)}</p>
      </section>

      <div class="grid">
        <section class="card">
          <span class="sectionTitle">suspicion board</span>
          ${r.hypotheses.map(h=>`
            <div class="hyp">
              <div class="hypTop"><span>${esc(h[0])}</span><b>${h[1]}%</b></div>
              <div class="bar"><i style="width:${h[1]}%"></i></div>
              <div class="note">${esc(h[2])}</div>
            </div>`).join("")}
        </section>

        <section class="card">
          <span class="sectionTitle">evidence at the scene</span>
          ${sigs.map((s,i)=>`
            <div class="signal">
              <span>${String(i+1).padStart(2,"0")}</span>
              <div><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div>
            </div>`).join("")}
        </section>
      </div>

      <section class="warning">
        <small>DON’T BE AN IDIOT</small>
        <p>Don’t diagnose their mood and don’t spam apologies. Treat these bars as relative readings, not mind-reading.</p>
      </section>

      <section class="reply">
        <small>POSSIBLE REPLY</small>
        <p>“${r.signals.length?"you seem a little off, but i don’t wanna push. i’m here if something happened.":"gotcha — if anything’s up, i’m around."}”</p>
      </section>
    </div>`;
  feed.scrollTop=0;
}
function reset(){
  input.value="";
  feed.innerHTML=`<div class="intro"><span class="kicker">drop the evidence</span><h1>Paste the chat.<br/>I’ll look for what changed.</h1><p>No mind-reading. Just signals, competing interpretations, and uncertainty.</p></div>`;
  updateCount();
  input.focus();
}
input.addEventListener("input",updateCount);
analyzeBtn.addEventListener("click",analyze);
clearBtn.addEventListener("click",reset);
input.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter")analyze();
});
updateCount();

const phaseImageInput=document.getElementById("imageInput");
const phaseProfileInput=document.getElementById("profileInput");
const phaseOcrStatus=document.getElementById("ocrStatus");
const PHASE_STORE="chatopsy.person-baselines.v1";

function phaseStore(){
  try{return JSON.parse(localStorage.getItem(PHASE_STORE)||"{}")}catch{return {}}
}
function phaseKey(){return (phaseProfileInput?.value||"").trim().toLowerCase()}
function phaseFeat(text){
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  return {words,short:words<=3,period:/\.$/.test(text.trim())};
}
function phaseOtherMessages(){
  const parsed=rows().map(parse);
  const tagged=parsed.filter(m=>m.speaker.toLowerCase()!=="you"&&m.speaker!=="Unknown");
  return tagged.length?tagged:parsed.filter((_,i)=>i%2===1);
}
function phaseBaseline(){
  const key=phaseKey();
  if(!key)return null;
  const arr=phaseStore()[key]||[];
  if(!arr.length)return null;
  return {
    count:arr.length,
    avgWords:arr.reduce((a,b)=>a+b.words,0)/arr.length,
    shortRate:arr.filter(x=>x.short).length/arr.length,
    periodRate:arr.filter(x=>x.period).length/arr.length
  };
}
function phaseLearn(){
  const key=phaseKey();
  if(!key)return;
  const fresh=phaseOtherMessages().map(m=>phaseFeat(m.text));
  if(!fresh.length)return;
  const store=phaseStore();
  store[key]=[...(store[key]||[]),...fresh].slice(-300);
  localStorage.setItem(PHASE_STORE,JSON.stringify(store));
}
function phaseBaselineCard(){
  const key=phaseKey();
  if(!key)return "";
  const b=phaseBaseline();
  if(!b)return '<section class="baselineExtra"><div class="baselineTop"><span>personal baseline</span><b>learning</b></div><div class="baselineMuted">First sample for this person. Run a few chats and Chatopsy will compare new replies against their own normal style.</div></section>';

  const last=parse(rows().at(-1)||"").text;
  const f=phaseFeat(last);
  const findings=[];
  if(b.avgWords>=4&&f.words<=Math.max(2,b.avgWords*.45))findings.push('<strong>shorter than usual</strong> · '+f.words+' words now vs '+b.avgWords.toFixed(1)+' average');
  if(f.period&&b.periodRate<.2)findings.push('<strong>unusual period</strong> · only '+Math.round(b.periodRate*100)+'% of stored messages end with one');
  if(f.short&&b.shortRate<.25)findings.push('<strong>rare short reply</strong> · short replies are only '+Math.round(b.shortRate*100)+'% of their baseline');
  if(!findings.length)findings.push('<strong>nothing unusual</strong> · this reply sits fairly close to the stored baseline');

  return '<section class="baselineExtra"><div class="baselineTop"><span>personal baseline</span><b>'+b.count+' msgs</b></div>'+findings.map(x=>'<div class="baselineSignal">'+x+'</div>').join("")+'<div class="baselineMuted">Stored only in this browser. Deviation is not proof of mood or intent.</div></section>';
}
function phaseInjectBaseline(){
  const report=feed.querySelector(".report");
  if(!report)return;
  report.querySelector(".baselineExtra")?.remove();
  const warning=report.querySelector(".warning");
  if(warning)warning.insertAdjacentHTML("beforebegin",phaseBaselineCard());
  phaseLearn();
}

analyzeBtn.addEventListener("click",()=>setTimeout(phaseInjectBaseline,0));

if(phaseImageInput){
  phaseImageInput.addEventListener("change",async e=>{
    const files=[...e.target.files];
    if(!files.length)return;
    phaseOcrStatus.hidden=false;
    if(!window.Tesseract){
      phaseOcrStatus.textContent="OCR failed to load — paste the chat instead.";
      return;
    }
    const chunks=[];
    try{
      for(let i=0;i<files.length;i++){
        phaseOcrStatus.textContent="reading screenshot "+(i+1)+"/"+files.length+" · starting…";
        const result=await Tesseract.recognize(files[i],"eng",{logger:m=>{
          if(m.status==="recognizing text")phaseOcrStatus.textContent="reading screenshot "+(i+1)+"/"+files.length+" · "+Math.round((m.progress||0)*100)+"%";
        }});
        const raw=(result?.data?.text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join("\n");
        if(raw)chunks.push(raw);
      }
      if(chunks.length){
        input.value=[input.value.trim(),chunks.join("\n")].filter(Boolean).join("\n");
        phaseOcrStatus.textContent="text recovered — fix You:/Them: labels if needed, then run autopsy.";
        updateCount();
      }else phaseOcrStatus.textContent="couldn't recover readable text from that screenshot.";
    }catch{
      phaseOcrStatus.textContent="OCR stumbled — try a clearer crop or paste the chat.";
    }finally{
      phaseImageInput.value="";
    }
  });
}

/* 2026 interaction layer */
(function(){
  const coarse=window.matchMedia("(pointer: coarse)").matches;
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if(!coarse&&!reduced){
    let tx=50,ty=25,cx=50,cy=25,raf=0;

    const animate=()=>{
      cx+=(tx-cx)*.12;
      cy+=(ty-cy)*.12;
      document.documentElement.style.setProperty("--mx",cx+"%");
      document.documentElement.style.setProperty("--my",cy+"%");
      if(Math.abs(tx-cx)>.05||Math.abs(ty-cy)>.05)raf=requestAnimationFrame(animate);
      else raf=0;
    };

    window.addEventListener("pointermove",e=>{
      tx=e.clientX/window.innerWidth*100;
      ty=e.clientY/window.innerHeight*100;
      if(!raf)raf=requestAnimationFrame(animate);
    },{passive:true});

    document.addEventListener("pointermove",e=>{
      const card=e.target.closest(".card,.verdict,.reply");
      if(!card)return;
      const r=card.getBoundingClientRect();
      card.style.setProperty("--hx",((e.clientX-r.left)/r.width*100)+"%");
      card.style.setProperty("--hy",((e.clientY-r.top)/r.height*100)+"%");
    },{passive:true});
  }

  const composer=document.querySelector(".composer");
  if(composer){
    composer.addEventListener("dragenter",()=>composer.classList.add("drag-active"));
    ["dragleave","drop"].forEach(ev=>composer.addEventListener(ev,()=>composer.classList.remove("drag-active")));
  }
})();

/* Interaction-rich forensic controls */
(function(){
  const liveSignals=document.getElementById("liveSignals");
  const caseButtons=[...document.querySelectorAll(".caseChip")];

  const examples={
    fine:"You: you still wanna go tomorrow?\nThem: idk\nYou: everything okay?\nThem: fine.",
    sure:"You: should I just go without you?\nThem: sure.",
    okayyy:"You: I got the tickets btw\nThem: okayyy\nYou: wait are you actually excited?\nThem: yeahhh"
  };

  function liveScan(){
    if(!liveSignals)return;
    const lines=rows().map(parse);
    const chips=[];
    const last=lines.at(-1)?.text||"";
    const prev=lines.at(-2)?.text||"";

    if(lines.length>=2)chips.push(["context "+lines.length+" msgs","hot"]);
    if(last&&last.split(/\s+/).filter(Boolean).length<=3)chips.push(["short reply","warn"]);
    if(last&&/\.$/.test(last))chips.push(["terminal period","hot"]);
    if(last&&deflections.has(last.toLowerCase()))chips.push(["possible deflection","warn"]);
    if(prev&&/[?？]\s*$/.test(prev)&&last)chips.push(["question → response","hot"]);

    liveSignals.innerHTML='<span class="liveLabel">live scan</span>'+
      (chips.length
        ? chips.map(x=>'<span class="signalChip '+x[1]+'">'+x[0]+'</span>').join("")
        : '<span class="signalChip dormant">waiting for evidence</span>');
  }

  input.addEventListener("input",liveScan);
  liveScan();

  caseButtons.forEach(btn=>{
    btn.addEventListener("click",()=>{
      input.value=examples[btn.dataset.case]||"";
      updateCount();
      liveScan();
      input.focus();
      input.setSelectionRange(input.value.length,input.value.length);
    });
  });

  analyzeBtn.addEventListener("click",()=>{
    if(!input.value.trim())return;
    document.body.classList.add("is-analyzing");
    const old=analyzeBtn.textContent;
    analyzeBtn.textContent="scanning…";
    setTimeout(()=>{
      document.body.classList.remove("is-analyzing");
      analyzeBtn.textContent=old;
      const report=feed.querySelector(".report");
      if(report){
        report.classList.add("staggered");
        [...report.querySelectorAll(".hyp")].forEach((el,i)=>{
          el.setAttribute("tabindex","0");
          el.setAttribute("role","button");
          el.dataset.index=String(i);
        });
      }
    },620);
  });

  function openProbe(hyp){
    const report=hyp.closest(".report");
    if(!report)return;
    report.querySelectorAll(".hyp").forEach(x=>x.classList.remove("active"));
    hyp.classList.add("active");

    let probe=report.querySelector(".interactiveProbe");
    if(!probe){
      probe=document.createElement("section");
      probe.className="interactiveProbe";
      const grid=report.querySelector(".grid");
      grid?.insertAdjacentElement("afterend",probe);
    }

    const label=hyp.querySelector(".hypTop span")?.textContent?.trim()||"selected reading";
    const likelihood=hyp.querySelector(".hypTop b")?.textContent?.trim()||"";
    const note=hyp.querySelector(".note")?.textContent?.trim()||"";
    const signals=[...report.querySelectorAll(".signal b")].map(x=>x.textContent.trim());
    const supporting=signals.length?signals.slice(0,2).join(" + "):"No strong behavioral evidence recovered.";
    const weakening=label.includes("genuinely")
      ?"Abruptness and deflection can weaken the literal reading."
      :label.includes("unknowable")
        ?"Multiple observable shifts reduce the pure-unknown explanation."
        :"Short replies can also come from fatigue, distraction, or ordinary texting habits.";

    probe.innerHTML=
      '<div class="probeTop"><span>interrogate hypothesis</span><b>'+label+' · '+likelihood+'</b></div>'+
      '<div class="probeGrid">'+
        '<div class="probeBox for"><small>why this reading?</small><p>'+supporting+'. '+note+'</p></div>'+
        '<div class="probeBox against"><small>what weakens it?</small><p>'+weakening+'</p></div>'+
      '</div>';
  }

  feed.addEventListener("click",e=>{
    const hyp=e.target.closest(".hyp");
    if(hyp)openProbe(hyp);
  });

  feed.addEventListener("keydown",e=>{
    if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("hyp")){
      e.preventDefault();
      openProbe(e.target);
    }
  });
})();
