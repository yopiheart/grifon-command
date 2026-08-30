# Unboxing S2 — the approved frame pair

**Approved by Neil, 2026-08-30:** *"Yan ganyan dapat. Para pag pinagalaw or na
animate, ay siguradong mukang iisang scene lang sila."*

These two stills are the TARGET for the unboxing reveal's frame pair, not output
from the pipeline. They were prototyped with the `codex-image` skill by
generating `s2-start` and then **editing that same image** into `s2-end`, which
is why the room, the camera and the person are identical.

| | start | end |
|---|---|---|
| box | closed, sealed, upright, label to camera | open, flaps lifted, same spot |
| pouch | not present | standing beside the box, label to camera |
| hands | resting on top of the box | flat on the table, either side |
| expression | calm, closed-lip | warm smile |
| room, camera, lighting | identical | identical |

Everything except those four rows is unchanged between them. That is the whole
point: animated, the pair has to read as one continuous take a couple of seconds
apart, not as a cut between two different shots.

## Why they are committed

The defect they answer: the two stills used to be generated from two independent
prompts with **no sight of each other**, so one landed as hands at a window and
the other as a man at a bookshelf. `CONTINUITY_LOCK` (`4bc850d`) fixes that by
passing the start frame itself as a reference.

An approved frame that lives only in a chat window is gone after the next
defreeze, and `workflows/locked_wins.md` exists because exactly that happened
before — a hook shape Neil approved on 2026-08-13 could not be found in any repo
doc, only in a Postgres row. Compressed to JPEG at 768px on purpose: the repo is
already 1.5 GB and grows ~400 MB/month, and these are a visual reference, not a
production asset.

**Not yet matched by a pipeline run.** They prove the model can hit this target,
not that our pipeline does. The run that checks it is the next unboxing run.
