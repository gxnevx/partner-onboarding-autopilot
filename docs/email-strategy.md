# Email strategy

The sequence is designed around one behavioral objective per email. Each message answers three questions:

1. What does the partner need to understand now?
2. What should they do immediately after reading?
3. What program context must be present for that action to feel credible?

## Day 0 — remove uncertainty

**Key message:** You are approved and have everything you need to begin.

**Desired outcome:** The partner opens the portal and saves the tracking link.

This message confirms the relationship and supplies the operational essentials: approval, tier, commission, tracking link, portal, and support contact. It avoids asking for a referral before the partner knows how tracking works.

## Day 3 — create the first activation

**Key message:** Your fastest path to activation is one well-matched registered opportunity.

**Desired outcome:** The partner identifies and registers a first potential deal.

The second message turns passive approval into a concrete behavior. It gives a short order of operations: review enablement, register the opportunity, then use the tracked referral path. That protects attribution and makes support possible from the beginning.

## Day 7 — improve confidence and message quality

**Key message:** Position Ledgerly as accounting automation for mid-market finance teams in a practical, peer-to-peer way.

**Desired outcome:** The partner feels supported and can use one clear Ledgerly positioning tip with a finance leader.

The final message follows the exercise literally: a friendly check-in, an offer of help, and one positioning tip. The tip uses only the supplied overview and brand voice; it does not invent finance pain points, workflows, metrics, or product capabilities.

## Why the sequence works

The messages deliberately progress through:

```text
Access → Action → Confidence
```

## Context boundaries

| Day | Context the AI may use | Context kept out |
| --- | --- | --- |
| Day 0 | Approval, tier, commission, tracking link, portal login | Enablement deck and messaging guidance |
| Day 3 | Enablement deck, portal for deal registration, support | Tracking link, tier, commission, bonus, and messaging guidance |
| Day 7 | Approved Ledgerly positioning and support | Tracking link, portal, deal registration, tier, commission, bonus, and activation steps |

The portal appears on Day 0 for initial access and on Day 3 because the supplied program details explicitly say it is where a partner registers a deal. Its role changes; the context does not bleed.

They are short, operational, and personalized with only the context relevant to that day. Tier, commission, tracking link, and portal belong to Day 0; enablement and deal registration belong to Day 3; approved product positioning and support belong to Day 7.

The operator owns the strategy: goal, key message, and desired outcome. OpenAI is the writing layer that turns those constraints into subject lines and bodies. Structured Outputs keeps the Day 0 / Day 3 / Day 7 shape predictable, and the deterministic generator remains as an explicit fallback.

The writing prompt also enforces a content contract and a presentation contract. Each day receives an allowlist of approved facts, required content, and prohibited content. The server validates the result before saving it. Formatting rules keep content in short blocks, make Day 3 actions numbered, preserve exact URLs, and use the exact program-coordinator signature.

Human review stays visible because brand-sensitive partner communication should not be silently sent by a prototype. The operator can edit, regenerate only the selected day, delete that draft, or approve it into a simulated `SENT` state.
