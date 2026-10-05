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
import type { ChatopsyReport } from "@/lib/chatopsy";

const sample = `You: you still wanna go tomorrow?
Her: idk
You: everything okay?
Her: fine.`;

export default function Home() {
  const [conversation, setConversation] = useState(sample);
  const [report, setReport] = useState<ChatopsyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lines = useMemo(
    () => conversation.split("\n").filter((line) => line.trim().length > 0).length,
    [conversation]
  );

  async function runAutopsy() {
    if (!conversation.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Autopsy failed.");
      }

      setReport(data);

      requestAnimationFrame(() => {
        document.getElementById("report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autopsy failed.");
    } finally {
      setLoading(false);
    }
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
              setReport(null);
              setError("");
            }}
            spellCheck={false}
            aria-label="Conversation evidence"
          />

          <div className="cardBottom">
            <span className="hint">
              Tip: include the boring messages too. Context is usually hiding there.
            </span>

            <button onClick={runAutopsy} disabled={!conversation.trim() || loading}>
              {loading ? "examining..." : "run the autopsy"}
              {!loading && <ArrowUpRight size={16} />}
            </button>
          </div>
        </div>

        {error && <div className="errorBox">{error}</div>}
      </section>

      {report && (
        <section id="report" className="report shell">
          <div className="caseHeader">
            <div>
              <p className="eyebrow">
                <Microscope size={14} /> autopsy report · case #{report.caseId}
              </p>
              <h2>{report.headline}</h2>
            </div>

            <div className="confidence">
              <span>CONFIDENCE</span>
              <strong>{report.confidence}</strong>
            </div>
          </div>

          <div className="verdict">
            <div className="verdictIcon"><ScanText /></div>
            <div>
              <span>PRIMARY FINDING</span>
              <h3>{report.finding}</h3>
              <p>{report.explanation}</p>
            </div>
          </div>

          <div className="grid">
            <article className="panel">
              <div className="panelTitle"><Activity size={16} /> suspicion board</div>

              <div className="bars">
                {report.hypotheses.map((item) => (
                  <div className="finding" key={item.label}>
                    <div className="findingRow">
                      <span>{item.label}</span>
                      <strong>{item.likelihood}%</strong>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${item.likelihood}%` }} />
                    </div>
                    <small>{item.note}</small>
                  </div>
                ))}
              </div>

              <p className="legalish">
                Relative likelihoods only. This is not calibrated psychology and
                definitely not mind-reading.
              </p>
            </article>

            <article className="panel">
              <div className="panelTitle"><Fingerprint size={16} /> evidence at the scene</div>

              <ul className="evidenceList">
                {report.evidence.length > 0 ? (
                  report.evidence.map((item, index) => (
                    <li key={item.title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <b>{item.title}</b>
                        <p>{item.detail}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="muted">
                    <span>?</span>
                    <div>
                      <b>No strong signal recovered</b>
                      <p>The conversation does not show enough change to support a dramatic story.</p>
                    </div>
                  </li>
                )}

                {report.missingContext.slice(0, 2).map((item) => (
                  <li className="muted" key={item}>
                    <span>?</span>
                    <div>
                      <b>Missing context</b>
                      <p>{item}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="hypothesisGrid">
            {report.hypotheses.slice(0, 3).map((hypothesis) => (
              <article className="miniPanel" key={hypothesis.label}>
                <div className="miniTop">
                  <span>{hypothesis.label}</span>
                  <strong>{hypothesis.likelihood}%</strong>
                </div>

                <div className="evidenceSplit">
                  <div>
                    <small>FOR</small>
                    {(hypothesis.for.length ? hypothesis.for : [{
                      title: "Nothing solid",
                      detail: "No direct evidence strongly supports this reading.",
                      weight: "weak" as const,
                    }]).slice(0, 2).map((item) => (
                      <p key={item.title}>+ {item.title}</p>
                    ))}
                  </div>

                  <div>
                    <small>AGAINST</small>
                    {(hypothesis.against.length ? hypothesis.against : [{
                      title: "Uncertainty remains",
                      detail: "The text alone cannot establish private intent.",
                      weight: "strong" as const,
                    }]).slice(0, 2).map((item) => (
                      <p key={item.title}>− {item.title}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="warning">
            <AlertTriangle size={18} />
            <div>
              <span>DON’T BE AN IDIOT</span>
              <p>{report.caution}</p>
            </div>
          </div>

          <div className="reply">
            <span>POSSIBLE REPLY</span>
            <p>“{report.suggestedReply}”</p>
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
