# Use of Artificial Intelligence in the YIBS Course Allocation System

This section describes the Artificial Intelligence (AI) techniques applied in the system and
where they are used, in language suitable for the project report and defence.

## 1. What kind of AI is used

The system uses **symbolic (classical) Artificial Intelligence**, the branch of AI concerned
with **automated reasoning, constraint satisfaction and heuristic search**, rather than
machine learning. This is deliberate and appropriate: automatic timetabling is one of the
**classic AI search problems**, formally a **Constraint Satisfaction Problem (CSP)** and a
generalisation of the **graph-colouring problem**, which is **NP-complete**. Because no
efficient exact algorithm exists, real timetabling systems rely on **AI heuristics** that find
high-quality, valid solutions quickly. The system therefore applies three well-known AI ideas:

1. **Rule-based reasoning** (an expert-system-style knowledge base of scheduling rules),
2. **Constraint satisfaction** (hard constraints that a valid timetable must never violate),
3. **Informed heuristic search** (greedy best-first placement guided by domain heuristics).

> **Honesty note for the defence:** this is *deterministic, algorithmic AI*. It does not use
> neural networks, training data or an LLM, so it does not "learn" from experience. Its
> intelligence lies in **reasoning over constraints and searching a huge solution space
> efficiently**. This is the same family of AI used in real scheduling, planning and
> route-finding software. (Section 6 notes how it could be extended with learning-based AI.)

## 2. Where the AI is applied

### (a) The Conflict-Reasoning Engine (`AllocationConflictChecker`)
An **expert/rule-based reasoning component** encodes the institution's scheduling knowledge as
formal constraints and evaluates any proposed allocation against them in real time:

- **Hard constraints** (must never be violated): a student group (department + level) cannot be
  in two places at once; a lecturer cannot teach two classes at once; a venue cannot host two
  same-department classes at once; slots must respect the teaching-day window and slot length.
- **Soft constraints** (preferences, returned as warnings): venue capacity vs. class size,
  weekly-hour limits, lecturer availability, lunch breaks.

When a request violates a rule, the engine does more than reject it. It **reasons about the
remaining feasible space** and returns the **nearest conflict-free alternatives**, i.e. it
explains *why* and proposes *what to do instead*. This explanatory, suggestion-giving behaviour
is characteristic of an intelligent decision-support system.

### (b) The Smart Assistant (intelligent slot recommendation)
Presented to lecturers as an **"AI Smart Assistant"**, this component takes a course and
**automatically searches the entire week**, covering every working day, time slot and venue, and
returns the set of **conflict-free options** for that course, ranked and grouped by day. It is
an **intelligent recommender** built on the same constraint engine: instead of the lecturer
guessing a time and being rejected, the AI **proactively computes and presents only the valid
choices**. This turns a tedious trial-and-error task into a one-click decision.

### (c) The Automatic Timetable Generator (`TimetableGenerator`)
The headline AI feature. Given the courses, lecturers, venues and rules, it **automatically
constructs an entire conflict-free timetable** using **heuristic search**:

- **Most-constrained-first ordering** (a *fail-first* heuristic from constraint-satisfaction
  theory): the hardest-to-place courses (most weekly hours, largest classes, fewest suitable
  venues) are scheduled first, because leaving them late tends to make them unplaceable.
- **Greedy best-first placement with scoring**: for each course the AI evaluates every feasible
  (lecturer, day, slot, venue) combination, discards those breaking a hard constraint, **scores
  the rest against the soft constraints**, and commits to the best-scoring placement.
- **Self-audit**: after generation the AI re-checks the whole timetable against all constraints
  and reports "0 conflicts detected" or fails loudly. It verifies its own solution.
- **Deterministic (seeded) search**: an optional random seed makes a run **repeatable**, so the
  same inputs always yield the same timetable, which matters for reproducibility and demos.

The generator and the manual/live checks call the **exact same constraint code**, so the AI's
automatic decisions and the humans' manual decisions can never contradict each other.

## 3. Why this qualifies as Artificial Intelligence

- **Problem class:** timetabling is a canonical AI problem, a CSP equivalent to graph colouring,
  known to be **NP-complete**; it is studied in every AI textbook under *Constraint Satisfaction*
  and *Search*.
- **Techniques used:** heuristic (informed) search, the fail-first *minimum-remaining-values*
  heuristic, greedy best-first search, constraint propagation and rule-based inference: all core
  topics of classical AI.
- **Behaviour:** the system **makes decisions, explains them, recommends alternatives and
  verifies its own output**, all hallmarks of an intelligent, knowledge-based system, not a plain
  CRUD application.

## 4. Benefits of the AI to YIBS

- **Eliminates human error:** clashes are impossible, because the AI enforces every rule automatically.
- **Speed:** a full institutional timetable is produced in **seconds** instead of days of manual
  spreadsheet work.
- **Transparency:** every rejection is explained and every unplaced course is reported with a
  specific reason, so administrators trust and can act on the results.
- **Optimisation:** the soft-constraint scoring yields not just a *valid* timetable but a
  *good* one (spread classes, right-sized venues, respected preferences).

## 5. Time complexity (for completeness)

- Conflict reasoning for one request: **O(E)** in the number of occupying allocations.
- Full generation: worst case **O(C · L · D · S · V · E)** for C courses, L lecturers, D days,
  S slots and V venues, reduced sharply in practice by constraint-based pruning (see
  [METHODOLOGY.md](METHODOLOGY.md) for the full analysis and flowchart).

## 6. Possible future extension to learning-based AI

The current AI is heuristic/constraint-based. It could be extended with **learning-based AI**
as future work, and this makes a strong "further work" paragraph:

- a **Genetic Algorithm** or **Simulated Annealing** metaheuristic to optimise the soft-constraint
  score further (evolving whole timetables),
- **machine learning** to *predict* lecturer preferences or likely no-shows from historical data,
  feeding those predictions into the scheduler.

These would add *learning* on top of the existing *reasoning*, but the reliable, explainable
constraint engine described above remains the correct foundation.
