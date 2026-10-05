# Chatopsy

**Conversational forensics, without pretending we can read minds.**

Chatopsy examines a chat as a set of competing interpretations rather than forcing one confident answer.

## Current lab state

The production branch still contains the transparent deterministic baseline and the GitHub Pages demo.

The unreleased branch `lab/phase-4-5` adds the remaining research phases without deploying them.

### Phase 1 — deterministic conversational forensics

- paste a conversation
- detect simple conversational changes and deflections
- generate competing interpretations whose relative likelihoods sum to 100
- show evidence **for and against**
- expose missing context and uncertainty
- suggest a deliberately low-risk next move

### Phase 2 — screenshot reconstruction

Implemented in the static demo with in-browser OCR. The user can edit reconstructed text before analysis.

### Phase 3 — opt-in personal baseline

Implemented locally in the browser. Chatopsy can compare a new reply against that person's own stored message-length and punctuation habits instead of assuming one universal texting style.

### Phase 4 — model analyst + analyzer disagreement

The lab branch adds an optional model analyst behind the same `ChatopsyReport` contract.

Modes accepted by `POST /api/analyze`:

- `baseline` — transparent deterministic engine only
- `model` — model analyst, with safe baseline fallback
- `hybrid` — averages matching hypothesis weights and caps confidence at the more conservative analyzer

Model analysis uses Vercel AI Gateway's OpenAI-compatible Chat Completions endpoint through native `fetch`, so no provider SDK is required.

Required environment variables:

```bash
AI_GATEWAY_API_KEY=...
CHATOPSY_MODEL=creator/model-id
```

The model ID is intentionally environment-configured instead of hard-coded so the lab can change models without changing the reasoning contract.

`POST /api/compare` returns:

- deterministic report
- model report
- top-hypothesis agreement
- leading-weight delta
- confidence agreement
- evidence-title overlap
- disagreement flags

The point is not to decide which detective is "right." It is to make disagreement visible.

### Phase 5 — validation before calling scores probabilities

The lab branch includes:

- behavior-focused evaluation fixtures in `lib/evaluation-fixtures.ts`
- `lib/evaluation.ts` for uncertainty and observable-evidence checks
- `GET /api/evaluate` for the deterministic fixture suite
- `lib/calibration.ts` for expected calibration error and usefulness summaries once real outcome feedback exists

The fixtures intentionally do **not** label hidden emotions as ground truth. They test product behavior such as:

- isolated messages should remain low confidence
- direct answers should not be mistaken for withdrawal
- uncertainty must stay visible
- likelihood weights must sum to 100
- generated explanations must avoid overconfident language

## Principle

> Detect the change. Explain the evidence. Keep the uncertainty.

Chatopsy should never claim to know another person's private mental state from a chat.

## Architecture

```text
conversation
    ↓
deterministic signal extraction
    ↓
optional model analyst
    ↓
baseline ↔ model comparison
    ↓
conservative hybrid report
    ↓
evidence for / against
    ↓
uncertainty + missing context
    ↓
low-risk response suggestion
    ↓
evaluation + later calibration from real feedback
```

## Run locally

```bash
npm install
npm run typecheck
npm run dev
```

Then open `http://localhost:3000`.

## Important score semantics

Displayed percentages are **relative hypothesis weights**, not calibrated psychological probabilities.

Only after enough real, consented outcome labels exist should calibration metrics be interpreted. Until then, the interface should continue to describe them as weights or likelihoods rather than certainty.
