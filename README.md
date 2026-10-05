# Chatopsy

**Conversational forensics, without pretending we can read minds.**

Chatopsy is an experimental interface for examining a conversation as a set of competing interpretations rather than forcing one confident answer.

## V0

The first version deliberately stays small:

- paste a conversation
- surface possible interpretations
- show evidence for the strongest reading
- expose uncertainty and missing context
- suggest a low-risk next move
- keep the product voice human

The current UI ships with a static demo analysis so the interaction and visual language can be tested before wiring in a model.

## Principle

> Something changed.

Chatopsy should detect changes and explain evidence. It should **not** claim to know another person's private mental state.

Percentages in V0 are displayed as relative likelihoods for the demo and are not calibrated psychological probabilities.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Next

1. Structured analysis schema
2. Server-side inference route
3. Evidence-for / evidence-against reasoning
4. Screenshot conversation reconstruction
5. Personal communication baselines (opt-in)
