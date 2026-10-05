"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Fingerprint,
  Microscope,
  ScanText,
  Sparkles,
} from "lucide-react";

const sample = `You: you still wanna go tomorrow?
Her: idk
You: everything okay?
Her: fine.`;

type Finding = {
  label: string;
  value: number;
  note: string;
};

const findings: Finding[] = [
  { label: "mildly upset", value: 48, note: "tone shifted after the check-in" },
  { label: "genuinely fine", value: 24, note: "possible, but weakly supported" },
  { label: "wants you to notice", value: 17, note: "indirect signal is plausible" },
  { label: "unknowable", value: 11, note: "not enough context to rule this out" },
];

export default function Home() {
  const [conversation, setConversation] = useState(sample);
  const [hasRun, setHasRun] = useState(true);
  const lines = useMemo(
    () => conversation.split("\n").filter((line) => line.trim().length > 0).length,
    [conversation]
  );

  function runAutopsy() {
    setHasRun(true);
    requestAnimationFrame(() => {
      document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <main>
      <div className="grain" />
      <nav className="nav shell">
        <div className="brand">
          <span className="brandMark">C</span>
          <span>CHATOPSY</span>
        </div>
        <div className="status"><span className="dot" /> lab online</div>
      </nav>

      <section className="hero shell">
        <p className="eyebrow"><Fingerprint size={14} /> conversational forensics</p>
        <h1>drop the <em>evidence.</em></h1>
        <p className="sub">
          Paste the chat. We’ll look for what changed, what probably happened,
          and what we absolutely cannot know.
        </p>

        <div className="evidenceCard">
          <div className="cardTop">
            <span>CASE MATERIAL</span>
            <span>{lines} messages recovered</span>
          </div>
          <textarea
            value={conversation}
            onChange={(e) => {
              setConversation(e.target.value);
              setHasRun(false);
            }}
            spellCheck={false}
            aria-label="Conversation evidence"
          />
          <div className="cardBottom">
            <span className="hint">Tip: include the boring messages too. Context is usually hiding there.</span>
            <button onClick={runAutopsy} disabled={!conversation.trim()}>
              run the autopsy <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {hasRun && (
        <section id="report" className="report shell">
          <div className="caseHeader">
            <div>
              <p className="eyebrow"><Microscope size={14} /> autopsy report · case #0001</p>
              <h2>something changed.</h2>
            </div>
            <div className="confidence">
              <span>CONFIDENCE</span>
              <strong>MEDIUM</strong>
            </div>
          </div>

          <div className="verdict">
            <div className="verdictIcon"><ScanText /></div>
            <div>
              <span>PRIMARY FINDING</span>
              <h3>“fine.” probably wasn’t the problem.</h3>
              <p>What happened a few messages earlier is more suspicious than the word itself.</p>
            </div>
          </div>

          <div className="grid">
            <article className="panel">
              <div className="panelTitle"><Activity size={16} /> suspicion board</div>
              <div className="bars">
                {findings.map((item) => (
                  <div className="finding" key={item.label}>
                    <div className="findingRow">
                      <span>{item.label}</span>
                      <strong>{item.value}%</strong>
                    </div>
                    <div className="bar"><span style={{ width: `${item.value}%` }} /></div>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>
              <p className="legalish">
                These are relative likelihoods, not mind-reading and not calibrated psychological probabilities.
              </p>
            </article>

            <article className="panel">
              <div className="panelTitle"><Fingerprint size={16} /> evidence at the scene</div>
              <ul className="evidenceList">
                <li><span>01</span><div><b>Reply length collapsed</b><p>Responses became much shorter after the emotional check-in.</p></div></li>
                <li><span>02</span><div><b>Punctuation changed</b><p>The final period adds a tonal shift, but only weakly without a personal baseline.</p></div></li>
                <li><span>03</span><div><b>Direct question was deflected</b><p>“Everything okay?” did not receive a direct yes/no answer.</p></div></li>
                <li className="muted"><span>?</span><div><b>Baseline unavailable</b><p>We do not know how this person normally texts. Treat certainty with suspicion.</p></div></li>
              </ul>
            </article>
          </div>

          <div className="warning">
            <AlertTriangle size={18} />
            <div>
              <span>DON’T BE AN IDIOT</span>
              <p>Don’t send five apologies and don’t diagnose their mood. Ask once, gently, then give them room.</p>
            </div>
          </div>

          <div className="reply">
            <span>POSSIBLE REPLY</span>
            <p>“you seem a little off, but i don’t wanna push. i’m here if something happened.”</p>
          </div>

          <div className="footerLine">
            <Sparkles size={15} />
            <span>Autopsy inconclusive? Congratulations. Humans remain confusing.</span>
          </div>
        </section>
      )}
    </main>
  );
}
