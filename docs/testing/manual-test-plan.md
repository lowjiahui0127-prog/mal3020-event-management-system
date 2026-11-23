# Manual test plan

| | |
| --- | --- |
| System | EventHub: Angular frontend, Node.js/Express backend, MongoDB, WebSockets. Run with Docker Compose |
| Build tested | commit `5e98df9` |
| Environment | Windows, Docker Desktop, Google Chrome. Stack started with `docker compose up -d --build --wait`, demo data loaded with `docker compose run --rm backend-blue npm run seed:demo` |
| Tester | `Low Jia Hui` |
| Date | `22/11/2026` |

## Purpose and scope

This plan checks the behaviour that a person has to judge, and the scenarios that involve several browsers, restarts or computers. It covers accounts and access control, browsing, registration, the organiser tools, real-time updates, deployment and distribution, and responsive and keyboard use.

## How this plan relates to the automated tests

Most behaviours are also protected by automated tests that run on every push in GitHub Actions: Jest and supertest for the API (unit and integration, with a real MongoDB), Vitest for the Angular code, and Playwright for end-to-end flows. The "Automated coverage" column lists the tests that also cover each case. Manual testing adds what automation does not judge well: appearance, readability, keyboard use, layout on small screens, and the real-time, rollover and multi-computer scenarios.

## A. Accounts and access

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-01 | Click Register in the header. Enter a new name, a new email and a password of 8 or more characters. Submit | The account is created, the user is signed in and taken to Events. The header shows the name and the ATTENDEE badge | API `auth.api` (creates an attendee); `auth.service.spec` | Redirected to `/events`. Header showed `"Test User"` and badge `"ATTENDEE"`. | Pass |
| MT-02 | In a private window, register again with the same email | An error says an account with this email already exists. | API `auth.api` (409 for a duplicate email) | Message shown: `"An account with this email already exists"`. | Pass |
| MT-03 | Register with a 5-character password | A message says the password needs at least 8 characters. Nothing is created | API `auth.api` (400 for a short password) | Message shown: `"Password must contain at least 8 characters."`. Account created? N | Pass |
| MT-04 | Log in with a correct email and a wrong password | The message "Invalid email or password" is shown and the user stays on the login page | API `auth.api` (401, same message for unknown email) | Message shown: `"Invalid email or password"`. Still on: `/login`. | Pass |
| MT-05 | Log in as `organiser@eventhub.test` | The organiser lands on the Dashboard. The header shows Dashboard, Manage Events and the ORGANISER badge | Playwright (organiser tests); `auth.service.spec` (redirect) | Landed on `/organiser/dashboard`. Header links: `Explore Events, Dashboard, Manage Events`. Badge: `ORGANISER`. | Pass |
| MT-06 | Log in as the attendee. Type `/organiser/dashboard` in the address bar | The user is sent back to Events and no organiser data is shown | `auth.guard.spec`; API `event.api` (403 for attendees) | Address bar after Enter: `http://localhost:8080/events`. Organiser data visible? N | Pass |
| MT-07 | As a visitor open an event, click "Log in to register", then log in | After login the user returns to the same event page | Playwright (visitor test: `returnUrl`); `auth.service.spec` | Login page URL: `http://localhost:8080/login?returnUrl=%2Fevents%2F6b030b96e81a3fac29c5eaa3`. After login landed on: `http://localhost:8080/events/6b030b96e81a3fac29c5eaa3`. | Pass |
| MT-08 | Click Log out, then press the browser's Back button | The header shows the visitor links. Protected pages are not shown and the user is sent to login | `auth.service.spec` (session cleared); `auth.guard.spec` | After Log out the header showed: `Explore Events, Log in, Register`. After Back the page was: `/login`. | Pass |

## B. Browsing

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-09 | On Events, search for "futsal", then clear the search | One event is listed, then all 9 are listed again | Playwright (visitor test) | Events for "futsal": `Inter-Faculty Friendly Futsal Cup` (count `1`). After clearing: `9` events. | Pass |
| MT-10 | Open an event that has a poster | The whole poster is visible without cropped text. The date badge is readable. Availability shows "x of y spots left" with a bar. Description paragraphs keep their line breaks | none (visual) | Poster fully visible? Y. Availability text: `"x of y spots left"`. Line breaks kept? Y | Pass |
| MT-11 | As a visitor look for the draft "Alumni Career Panel" in the list and by search | It is not shown anywhere. As the organiser it appears under Drafts | API `event.api` (only published events are returned) | In the list? N. By search? N. As organiser it appears under: `DRAFTS`. | Pass |

## C. Registration

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-12 | As the attendee, open "Practical Cybersecurity & Ethical Hacking Talk" and click Register for this event | The page shows "You're registered". Spots left drops by one. The event appears in My Registrations | Playwright (attendee test); API `registration.api` | Message: `"You're registered"`. Spots left before and after: `82` → `81`. In My Registrations? Y | Pass |
| MT-13 | Reopen the same event | The registered state is shown and there is no second Register button | API `registration.api` (409 for a duplicate) | State shown: `"You're registered"`. Register button present? N | Pass |
| MT-14 | Open "AI & LLM Engineering Hands-On Bootcamp" (full) | A disabled "Fully booked" button, a red availability bar, and "Fully booked" on its card in the list | API `registration.api` (409 when full, concurrency test) | Button text: `"Fully booked"`, disabled? Y. Bar colour: `red`. List card text: `"Fully booked"`. | Pass |
| MT-15 | Click Cancel registration, then Keep my spot. Click Cancel registration again, then Yes, cancel registration | Keep changes nothing. Yes cancels the registration and spots left goes up by one | Playwright (attendee test); API `registration.api` (cancel) | After Keep: `still registered`. After Yes: status `CANCELLED`, spots left `81` → `82`. | Pass |
| MT-16 | Register again for the event you cancelled | Registration succeeds, the status is Confirmed, and My Registrations still has one record for the event | API `registration.api` (re-register reuses the record) | Result: `registration succeeded`. Status shown: `CONFIRMED`. Records for this event: `1`. | Pass |
| MT-17 | Reset the data, log in as the demo attendee, open My Registrations and switch between the three tabs | Upcoming 2, Past 1, Cancelled 1, and each tab lists the right events | `registration.model.spec` (status rules) | Counts (Upcoming / Past / Cancelled): `2` / `1` / `1`. Events listed: `matched demo seed data`. | Pass |

## D. Organiser tools

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-18 | Create an event whose end time is before its start time | An error under Ends says the end must be after the start. Nothing is saved | `event-form.spec`; API `event.api` (400) | Message under Ends: `"The end time must be after the start time."`. Event saved? N | Pass |
| MT-19 | Create an event with the image `/posters/futsal-cup.jpg` and visibility Published | A notice says the event is published. A visitor sees it with the image | Playwright (organiser test, without image); API `event.api` (image path) | Notice: `"Futsal Demo Test" is published.`. Visible to a visitor? Y. Image in list / details: `visible` / `visible`. | Pass |
| MT-20 | Edit an event that has registrations and set a capacity below the registered count | An error explains the minimum capacity and Save is blocked | `event-form.spec`; API `registration.api` (400) | Message: `"Capacity can't be lower than the 40 people already registered."`. Save blocked? Y | Pass |
| MT-21 | Open Edit for an event and press Save changes without changing anything | Its date and time stay exactly the same | `event-form.spec` (unchanged start time); `datetime.spec` (round trip) | Date and time before: `23/01/2027 07:30PM`. After: `23/01/2027 07:30PM`. | Pass |
| MT-22 | Cancel a published event that has registrations. Then check My Registrations as an attendee | The confirmation names the number of attendees. The event becomes Cancelled and the attendee sees "Event cancelled" | none | Confirmation text: `"Cancel this event? 38 registered attendees will see it as cancelled."`. Status after: `CANCELLED`. Attendee sees: `"EVENT CANCELLED"`. | Pass |
| MT-23 | Open Registrations for an event. Search a name, then filter Cancelled | The list and the "Showing x of y registrations" line update | API `organiser.api` (attendee list) | Rows after searching `"Demo Attendee"`: `1`. Rows under Cancelled: `1`. Footer: `"Showing 1 of 18 registrations"`. | Pass |
| MT-24 | Compare the Dashboard figures with Manage events | Upcoming events, registrations, seats filled and drafts all match what Manage events shows | none | Dashboard (events / registrations / seats / drafts): `9` / `305` / `38%` / `1`. Matches? Y | Pass |

## E. Real-time updates

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-25 | Browser 1: organiser on the Dashboard (LIVE). Browser 2 (private window): attendee registers for the Cybersecurity talk. Then the attendee cancels | The number goes up by one, the bar grows and flashes, and the feed shows the attendee, all without a refresh. After the cancel the number goes back | Playwright (live dashboard test); API `realtime.api` | Number before and after: `305` → `306` (about `1` s). Feed showed: `"Demo Attendee registered for Practical Cybersecurity & Ethical Hacking Talk"`. Page refreshed? N. After cancel: `number goes back`. | Pass |
| MT-26 | Browser 1: a visitor on the "3D Printing" event (2 spots left). Browsers 2 and 3: two attendees register | After the second registration the button changes to "Fully booked" without a refresh | API `realtime.api` (public counts) | Button before and after: `"Log in to register"` → `"Fully booked"`. Page refreshed? N | Pass |
| MT-27 | Dashboard open. Run `docker compose stop backend-blue`, wait 10 seconds, then `docker compose start backend-blue`. Register for an event | The indicator goes LIVE → OFFLINE or CONNECTING → LIVE, and the numbers are correct after reconnecting | `rollover-test.sh` (reconnect after code 1001) | Indicator sequence: `LIVE → OFFLINE → CONNECTING → LIVE`. Offline for `10` s. Numbers correct after reconnect? Y | Pass |

## F. Deployment and distribution

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-28 | Clone the repository into a new folder, copy `.env.example` to `.env`, set `JWT_SECRET`, run `docker compose up -d --build --wait` and `docker compose run --rm backend-blue npm run seed:demo` | The site works at http://localhost:8080 with 9 events, using only the README | CI `docker` job builds from a clean checkout | Time from clone to a working site: `~3` min. Events shown: `9`. Problems met: `none`. | Pass |
| MT-29 | With the Dashboard open and a request watcher running, run `bash scripts/deploy.sh eventhub-backend:v2 2.0.0` | The version changes with no failed requests. The Dashboard reconnects without a page refresh | CI `rollover-test.sh` (161 requests, 0 failed) | Versions seen before → after: `local` → `2.0.0`. Failed lines: `0`. Indicator: `reconnected to LIVE`. | Pass |
| MT-30 | Run `bash scripts/deploy.sh rollback` | The previous version is live again with no failed requests | CI `rollover-test.sh` (rollback step) | Version after rollback: `local`. Failed lines: `0`. | Pass |
| MT-31 | On computer 1 start the stack and note its IP address. On computers 2 and 3 run `ping <IP>`, then open `http://<IP>:8080`. Log in as the organiser on one and as an attendee on the other, and register for an event | Both computers load the site. The ping succeeds. The organiser's Dashboard updates live when the attendee registers | none | Computers used: `Host Laptop` / `Tablet` / `Mobile`. Ping result: `Reply from 172.19.71.231`. Site reachable at: `http://172.19.71.231:8080`. Live update across computers? Y | Pass |

## G. Responsive layout and keyboard use

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-32 | Set the browser width to 400 px. Open Events, an event page, the Dashboard and Create event | No horizontal scrolling. Content is readable and the header stays usable | none | Widths tested: `400 px`. Horizontal scroll per page: `none`. Problems: `none`. | Pass |
| MT-33 | Register for an event using only the keyboard (Tab, Shift+Tab, Enter) | Every control is reachable in a sensible order, the focus outline is visible, and the cancel confirmation works | none | Tab order logical? Y. Focus visible? Y. Steps that needed the mouse: `none`. | Pass |

## Summary

| Group | Cases | Pass | Fail |
| --- | --- | --- | --- |
| A. Accounts and access | 8 | 8 | 0 |
| B. Browsing | 3 | 3 | 0 |
| C. Registration | 6 | 6 | 0 |
| D. Organiser tools | 7 | 7 | 0 |
| E. Real-time updates | 3 | 3 | 0 |
| F. Deployment and distribution | 4 | 4 | 0 |
| G. Responsive and keyboard | 2 | 2 | 0 |
| **Total** | **33** | 33 | 0 |

## Defect log

No defects were found during manual execution (0 failures across 33 test cases).