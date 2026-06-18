# How I Build Apps Without Breaking Them

A shareable, plain-English guide to the 6 "loops" that keep an app safe to build —
written for Filipinos (and anyone) starting out. Generalized from Grifon Command's
loop registry ([`workflows/loops.md`](../../workflows/loops.md)).

The carousel images for posting live in [`slides/`](slides/) (1080×1080, FB/LinkedIn-ready).
A single overview diagram is [`grifon-loops.png`](grifon-loops.png).

---

## The big idea

When you build an app, the scariest part isn't writing code — it's **not knowing if
you just broke something.** The fix is simple:

> **Stop babysitting every step. Build "loops" instead.**

A loop is three things: an **action**, a **checker** that runs by itself, and a
**stop rule**. Set it up once, and it guards your code automatically.

---

## The 6 loops

### 🚪 1. The Build Gate (your #1 safety net)
You're not allowed to "finish" a coding session if the app won't even build. Every
time you change important code, the build runs automatically. Fails = you're stuck
until you fix it. **If you do nothing else, set up an automatic build check.**

### ☁️ 2. The Cloud Check (a second pair of eyes)
When you're ready to merge, a free robot on GitHub (called "CI") re-runs the build
and tests in the cloud — even when your computer is off. Redundancy on purpose.

### 🎯 3. The Goal Loop (let it run, don't hand-hold)
For bigger tasks, give a clear finish line: *"Make this work, here's how you'll prove
it's done, stop after 20 tries."* Then let it loop. The **"how you'll prove it"** part
is the secret — a goal with no checker is just wishful thinking.

### ⏰ 4. The Session Reset (don't trust your memory)
Every fresh start, the setup re-reminds you of your rules and loops. Don't rely on
remembering — write it down so the setup reminds *you*.

### 🌙 5. The Nightly Test (for later)
A full test of every feature, every night, posted where you'll see it. Overkill until
you have real users. **Don't over-engineer early.**

### 🧠 6. The Lesson Loop (get smarter over time)
The most important habit: something broke → fix it → **write down the lesson** → next
time it can't happen again. Same mistake twice? Build a guardrail so it's *impossible*
to repeat. Your app gets more reliable while you sleep.

---

## The foundation: let AI think, let code do

**🧠 AI is great at deciding *what* to do. ⚙️ Plain code is great at *doing* it
reliably.** Write your process as simple recipes, let AI read them and decide, and let
boring predictable scripts do the actual work. Split the jobs and accuracy goes up.

---

## When something actually breaks — 7 steps

1. **Reproduce** — see the bug with your own eyes first
2. **Locate** — find which file it's in
3. **Plan** — say what you'll change and why
4. **Edit** — the *smallest* fix possible (don't "improve" random stuff)
5. **Verify** — build it, test it, click around
6. **Update** — cross it off the list
7. **Report** — one sentence: what changed and what to test

---

## 3 takeaways for anyone starting out

- **Set up checks that block you, not just warn you.** A warning gets ignored. A gate doesn't.
- **Make small changes.** The smaller the edit, the easier to find what broke.
- **Write down every lesson.** Your notes are what turn a beginner into someone who ships.

> You don't need to be a genius to build something solid. You just need loops that
> catch your mistakes before your users do. 🚀

---

## Ready-to-paste caption

> **Most people think building an app is about writing code. It's not.**
>
> It's about knowing — instantly — when you've broken something. 😅
>
> After building my own app, here are the 6 simple "loops" that keep me (and my code)
> safe. A "loop" is just: an action + a checker that runs by itself + a stop rule. Set
> it up once, and it guards your work automatically.
>
> The biggest one? 🚪 **The Build Gate** — you're not allowed to call it "done" if the
> app won't even build. That single rule prevents most disasters.
>
> And the habit that compounds the most: 🧠 **Write down every lesson.** Broke
> something? Fix it, then make a guardrail so it can *never* happen again. Your app
> gets safer while you sleep.
>
> Full breakdown in the slides 👉
>
> Sharing this for every Pinoy who wants to build their own app — you don't need to be
> a genius, you just need loops that catch your mistakes before your users do. 🇵🇭🚀
>
> *Save this & tag a friend who's building something.*
>
> #BuildInPublic #Pinoy #Coding #AppDevelopment #TechPH
