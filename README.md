# Chatopsy

**Conversational forensics, without pretending we can read minds.**

Chatopsy examines a chat as a set of competing interpretations rather than forcing one confident answer.

## What V0 does

- paste a conversation
- detect simple conversational changes and deflections
- generate competing interpretations whose relative likelihoods sum to 100
- show evidence **for and against** each leading interpretation
- expose missing context and uncertainty
- suggest a deliberately low-risk next move
- keep the product voice human

No login. No database. No model key required.

## Why the first engine is deterministic

V0 intentionally starts with a transparent rules-based baseline in `lib/chatopsy.ts`.

That lets us test the product and reasoning contract before an LLM is allowed into the loop. Later model-backed analysis should have to beat this baseline on usefulness without becoming more confident or more invasive.

The percentages in V0 are **relative likelihood scores**, not calibrated psychological probabilities.

## Principle

> Detect the change. Explain the evidence. Keep the uncertainty.

Chatopsy should never claim to know another person's private mental state from a chat.

## Architecture

```text
conversation
    ↓
/api/analyze
    ↓
signal extraction
    ↓
competing hypotheses
    ↓
evidence for / against
    ↓
uncertainty + missing context
    ↓
low-risk response suggestion
```

## Run locally

```bash
npm install
npm run typecheck
npm run dev
```

Then open `http://localhost:3000`.

## Next experiments

1. Add a model-backed analyzer behind the same `ChatopsyReport` contract
2. Compare model output against the deterministic baseline
3. Add screenshot conversation reconstruction
4. Add opt-in personal communication baselines
5. Validate whether displayed likelihoods are actually useful before calling them probabilities
