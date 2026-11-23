# Usability test results

## 1. Summary

4 participants (P1–P4) completed 24 tasks in total (6 tasks each). 22 tasks were completed without difficulty (91.7%). The mean SUS score was 83.8. 2 problems were found and 2 were fixed.

## 2. Method

| | |
| --- | --- |
| Build tested | commit `cc06264` |
| Setting | Campus study area, one laptop, Google Chrome, Docker Compose stack reset with `docker compose run --rm backend-blue npm run seed:demo` before every participant |
| Method | Moderated, one participant at a time, think-aloud protocol, 6 tasks (T1 to T6, see `usability-test-plan.md`), followed by the SUS questionnaire and three open questions |
| Facilitator behaviour | Did not assist during tasks. A participant stuck for 2 minutes was recorded as "No (stuck)" and the task ended |
| Recruitment | 4 undergraduate students from Logistics and Computer Science programmes, none had seen the system before |
| Dates | `23/11/2026` |

## 3. Ethics

Before each session, the consent statement in `usability-test-plan.md` was read aloud and agreement was noted. Taking part was voluntary and could be stopped at any time. Participants are identified only as P1 to P4; no names, photos, or recordings were collected, and fictional demo accounts were used throughout.

## 4. Participants

| ID | Year and programme | Books events or tickets online often? | Date |
| --- | --- | --- | --- |
| P1 | Year 3, Computer Science | often | `23/11/2026` |
| P2 | Year 3, Logistics | sometimes | `23/11/2026` |
| P3 | Year 3, Logistics | rarely | `23/11/2026` |
| P4 | Year 3, Computer Science | often | `23/11/2026` |

## 5. Task results

Each cell: `Yes` (done without help) / `Difficulty` (done, but hesitated or clicked wrongly) / `No` (stuck), followed by the time in seconds (`n/r` = not recorded).

| Participant | T1 Find the futsal event | T2 Create account and register | T3 Cancel the registration | T4 Create and publish an event | T5 See who registered | T6 Notice the live update |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Yes, n/r | Yes, n/r | Yes, n/r | Yes, n/r | Yes, n/r | Yes, n/r |
| P2 | Yes, 14s | Difficulty, 48s | Yes, 19s | Yes, 55s | Yes, 21s | Yes, 4s |
| P3 | Yes, 18s | Yes, 39s | Difficulty, 28s | Yes, 62s | Yes, 25s | Yes, 5s |
| P4 | Yes, 11s | Yes, 32s | Yes, 15s | Yes, 46s | Yes, 16s | Yes, 3s |
| **Done without difficulty** | `4/4` | `3/4` | `3/4` | `4/4` | `4/4` | `4/4` |
| **Mean time (s)** | `14.3` | `39.7` | `20.7` | `54.3` | `20.7` | `4.0` |

## 6. System Usability Scale (SUS)

Raw answers, 1 (strongly disagree) to 5 (strongly agree). Scoring (Brooke, 1996): for odd items subtract 1 from the answer, for even items subtract the answer from 5, sum all ten values and multiply by 2.5 (0 to 100 scale; above 68 is regarded as above average).

| Participant | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | SUS score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | 4 | 2 | 5 | 1 | 4 | 2 | 5 | 1 | 4 | 2 | 85.0 |
| P2 | 4 | 2 | 4 | 2 | 4 | 2 | 5 | 2 | 4 | 2 | 77.5 |
| P3 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 75.0 |
| P4 | 5 | 1 | 5 | 1 | 5 | 1 | 5 | 1 | 4 | 1 | 97.5 |
| **Mean** | **4.25** | **1.75** | **4.50** | **1.50** | **4.25** | **1.75** | **4.75** | **1.50** | **4.00** | **1.75** | **83.8** |

## 7. Observations and comments

| Participant | Task | What was observed or said (quote if possible) |
| --- | --- | --- |
| P1 | General | Completed all tasks smoothly without help; noted the layout was straightforward. |
| P2 | T2 | Completed registration successfully, but paused on the detail sidebar and remarked: *"The green badge says 'You're registered', yet the box heading above it still says 'Join this event'."* |
| P3 | T3 | Returned to the event detail page to cancel and noted the heading `"Join this event"` felt slightly contradictory once already enrolled. |
| P4 | T6 | Immediately noticed the dashboard count increment and feed entry without refreshing; commented *"The live update on the dashboard is very clear."* |

Answers to the open questions:

| Participant | Easiest part | Most confusing part | First thing they would change |
| --- | --- | --- | --- |
| P1 | Searching for events and viewing details | Nothing major | Nothing specific |
| P2 | Finding the futsal event using search | Seeing "Join this event" at the top of the card after I already registered | Change the sidebar heading to "Your registration" once joined |
| P3 | Creating and publishing an event | The "Join this event" heading remaining visible after registering | Update the detail card heading to match the registered status |
| P4 | Watching the organiser dashboard update live | None | Keep the interface as clean as it is |

## 8. Problems found and changes made

`Source` must be one of: `Observed` (a participant hesitated or failed), `Comment` (a participant said it), or `Heuristic review` (found by checking the interface against Nielsen's heuristics; no participant mentioned it).

| # | Problem | Source | Participants affected | Severity | Change made | Commit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Developer-oriented error messages (e.g. "Is the backend running?") exposed internal details | Heuristic review | — | Low | Replaced with user-friendly messages in `event-list.ts` and detail views | `<commit>` |
| 2 | Event detail sidebar heading remained `"Join this event"` even after the attendee had registered | Comment | P2, P3 | Low | Updated sidebar heading to dynamically display `"Your registration"` when registered (`event-detail.html`) | `<commit>` |

## 9. Re-test

After implementing the 2 UX improvements, P2 repeated the event registration and detail inspection flow (T2/T3). P2 confirmed that the sidebar heading cleanly switched from `"Join this event"` to `"Your registration"` immediately upon enrolment, aligning the card title with the `"You're registered"` status badge in under 2 seconds.

## 10. Conclusions and limitations

- **Result:** EventHub achieved a 91.7% task completion rate without difficulty and a mean SUS score of 83.8, demonstrating strong learnability and clear real-time feedback for first-time users.
- **Limitations:** The sample size is small (`n = 4`, though Nielsen's usability research notes that 4–5 participants typically uncover most core usability issues) and participants were students known to the author, which can introduce positive response bias. Tasks used seeded demo data in short sessions on a desktop browser.
- **Not covered:** Users with disabilities (screen-reader accessibility), long-term real-world usage, mobile touchscreens, and high-concurrency stress testing.