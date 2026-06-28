# RICE Prioritization Tool

RICE is a product prioritization framework that helps teams compare initiatives using four inputs: Reach, Impact, Confidence, and Effort. The score is calculated as `(Reach x Impact x Confidence) / Effort`, which rewards ideas that affect more people, create more value, have stronger supporting evidence, and require less delivery time.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite in your browser.

## Scoring dimensions

**Reach** estimates how many users, customers, accounts, or transactions will be affected during a chosen time period. A higher reach means the initiative has a wider potential audience, so it increases the final RICE score.

**Impact** estimates how much the initiative will matter to each person reached. This app uses common RICE-style labels from Minimal to Massive and converts them into numeric multipliers for calculation.

**Confidence** reflects how certain the team is about the reach and impact estimates. High confidence uses 100%, medium uses 80%, and low uses 50%, so uncertain ideas are discounted without being removed entirely.

**Effort** estimates the amount of work required, measured here in person-months. Effort divides the value side of the formula, which means smaller initiatives can rank higher when they deliver strong value with less work.
