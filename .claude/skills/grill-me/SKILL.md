---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, mentions "grill me", or asks for a "blind spot pass".
disable-model-invocation: true
---

Opening move — blind-spot pass. Before the first question, judge whether this plan enters territory I haven't worked in (a new domain, an unmapped part of the codebase, an external system we haven't integrated). If it does, sweep that territory first — read the relevant code, docs, and constraints — and surface my likely *unknown unknowns*: the questions I didn't know to ask, assumptions the territory contradicts, and obstacles the plan doesn't mention. Present that list, let me react, then fold it into the interview queue. If the territory is familiar, say so in one line and go straight to the interview.

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

Once the interview is exhausted and we've reached shared understanding, run one final move (Gary Klein's premortem, adapted): tell me to imagine the plan has shipped and failed catastrophically in production, and ask me to narrate *why it failed* — every plausible cause, especially the ones I'd otherwise feel impolitic raising. Frame this as a separate step from the interview, not another question. After I respond, fold the failure modes back into the plan and surface anything that wasn't covered during the grill.
