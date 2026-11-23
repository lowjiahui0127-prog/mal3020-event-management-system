# Usability test plan

## Purpose
Find out whether a first-time user can complete the main tasks in EventHub without help, and what slows them down.

## Participants
4 students (P1 to P4) from different faculties, none of whom saw the system before. Participants are called P1, P2, P3... in all notes.

## Ethics and consent (read aloud before starting)
- Taking part is voluntary and you may stop at any time without giving a reason.
- We are testing the system, not you. There are no wrong answers.
- Only your anonymous participant number, your task results and your comments are recorded. No names, no photos, no recordings of your face.
- You will use test accounts and fictional data. Please do not enter any real personal details.
- The results are used only in this coursework report.
- Do you agree to take part?  [ ] Yes   (tick and write the date) ______

## Set-up
Docker stack running, `docker compose run --rm backend-blue npm run seed:demo` run before EACH participant (resets the data), Chrome, one laptop. The facilitator does not help. If the participant is stuck for 2 minutes, note "stuck" and move on.

Accounts: demo organiser `organiser@eventhub.test`, demo attendee `attendee@eventhub.test`. For task 2 the participant creates a new account (any made-up email such as `p1@example.test`).

## Tasks (read one at a time; ask the participant to think aloud)
| # | Role | Task | Success means |
| --- | --- | --- | --- |
| T1 | Visitor | "Find the futsal event. Tell me where and when it takes place." | Correct place and time given |
| T2 | New user | "Create an account and register for the Cybersecurity talk." | Registered, confirmation seen |
| T3 | Attendee | "Find your registration and cancel it." | Cancelled, status shows cancelled |
| T4 | Organiser (demo account, already logged in) | "Create an event called 'Study Skills Workshop' next week and publish it." | Event appears as Published |
| T5 | Organiser | "Find out who has registered for the Cybersecurity talk and how many seats are left." | Correct number and a name found |
| T6 | Organiser | Facilitator registers for the Cybersecurity talk in another window. "What do you notice on your screen?" | Notices the live update |

## Measures (record for each task)
Completed: Yes / With difficulty / No. Time in seconds. Number of wrong clicks or hesitations. Observations and quotes.

## After the tasks
1. SUS questionnaire (below).
2. "What was the easiest part?" "What was the most confusing part?" "What would you change first?"

### System Usability Scale (1 = strongly disagree ... 5 = strongly agree)
1. I think I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think I would need technical support to use this system.
5. I found the various functions well integrated.
6. I thought there was too much inconsistency in this system.
7. I imagine most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot before I could get going.

Score: for odd items subtract 1 from the answer, for even items subtract the answer from 5, add all ten, multiply by 2.5 (0 to 100). Above 68 is above average.