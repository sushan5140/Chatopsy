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
