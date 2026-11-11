# Agent exams

Each agent has an exam here: a few situations a professional in its field
handles well, with what a pass looks like. The founder asked on 2026-11-11
for agents with "the skills of a professional in their field"; the exams
show whether they have them, and whether a change to an agent (a new skill,
a rewritten rule, a different model) made it better or worse.

## Running an exam

`/agent-os exam <agent>` (or `/agent-os exam all`). The lead:

1. Reads `<agent>.md` here.
2. For each case, dispatches the agent with the case's **Situation** as its
   whole task, plus: "This is an exam. Do not write to the repo, the
   backlog or any tool; answer in your reply only."
3. Grades the reply against **Pass when** for that case: `pass` only when
   every line holds, `partial` when most do, `fail` otherwise. The grader
   quotes the line of the reply that shows each point, or says it is missing.
4. Appends one row per agent to `results.md`: date, agent, score (passes out
   of cases), the cases failed and why, and what changed in the agent since
   the last run.

Run an agent's exam after any change to its agent file, playbook skill or
knowledge rules, and once a month for all of them. A drop in score after a
change means the change is reverted or fixed before it is used for real
work.

## Writing a case

- A real situation from Deadeye's work, written so the agent cannot tell it
  is a test from the situation alone.
- One clear trap a non-professional would fall into (a privacy slip, an
  overclaim, a result called on too few players).
- **Pass when** lines that a grader can check from the reply alone.
- When the founder corrects an agent, add the situation as a new case, so
  the mistake is tested for ever after.
- No real player data. Made-up numbers and files, marked as such.
