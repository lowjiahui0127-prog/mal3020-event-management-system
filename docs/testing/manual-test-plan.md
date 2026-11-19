# Manual test plan

| | |
| --- | --- |
| System | EventHub: Angular frontend, Node.js/Express backend, MongoDB, WebSockets. Run with Docker Compose |
| Build tested | commit `5e98df9` |
| Environment | Windows, Docker Desktop, Google Chrome. Stack started with `docker compose up -d --build --wait`, demo data loaded with `npm run seed:demo` |
| Tester | `Low Jia Hui` |
| Date | `20/11/2026` |

## Purpose and scope

This plan checks the behaviour that a person has to judge, and the scenarios that involve several browsers, restarts or computers. It covers accounts and access control, browsing, registration, the organiser tools, real-time updates, deployment and distribution, and responsive and keyboard use.

## How this plan relates to the automated tests

Most behaviours are also protected by automated tests that run on every push in GitHub Actions: Jest and supertest for the API (unit and integration, with a real MongoDB), Vitest for the Angular code, and Playwright for end-to-end flows. The "Automated coverage" column lists the tests that also cover each case. Manual testing adds what automation does not judge well: appearance, readability, keyboard use, layout on small screens, and the real-time, rollover and multi-computer scenarios.

## A. Accounts and access

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-01 | Click Register in the header. Enter a new name, a new email and a password of 8 or more characters. Submit | The account is created, the user is signed in and taken to Events. The header shows the name and the ATTENDEE badge | API `auth.api` (creates an attendee); `auth.service.spec` | Redirected to `____`. Header showed `"____"` and badge `"____"`. | ☐ Pass ☐ Fail |
| MT-02 | In a private window, register again with the same email | An error says an account with this email already exists. No second account is created | API `auth.api` (409 for a duplicate email) | Message shown: `"____"`. | ☐ Pass ☐ Fail |
| MT-03 | Register with a 5-character password | A message says the password needs at least 8 characters. Nothing is created | API `auth.api` (400 for a short password) | Message shown: `"____"`. Account created? Y / N | ☐ Pass ☐ Fail |
| MT-04 | Log in with a correct email and a wrong password | The message "Invalid email or password" is shown and the user stays on the login page | API `auth.api` (401, same message for unknown email) | Message shown: `"____"`. Still on: `____`. | ☐ Pass ☐ Fail |
| MT-05 | Log in as `organiser@eventhub.test` | The organiser lands on the Dashboard. The header shows Dashboard, Manage Events and the ORGANISER badge | Playwright (organiser tests); `auth.service.spec` (redirect) | Landed on `____`. Header links: `____`. Badge: `____`. | ☐ Pass ☐ Fail |
| MT-06 | Log in as the attendee. Type `/organiser/dashboard` in the address bar | The user is sent back to Events and no organiser data is shown | `auth.guard.spec`; API `event.api` (403 for attendees) | Address bar after Enter: `____`. Organiser data visible? Y / N | ☐ Pass ☐ Fail |
| MT-07 | As a visitor open an event, click "Log in to register", then log in | After login the user returns to the same event page | Playwright (visitor test: `returnUrl`); `auth.service.spec` | Login page URL: `____`. After login landed on: `____`. | ☐ Pass ☐ Fail |
| MT-08 | Click Log out, then press the browser's Back button | The header shows the visitor links. Protected pages are not shown and the user is sent to login | `auth.service.spec` (session cleared); `auth.guard.spec` | After Log out the header showed: `____`. After Back the page was: `____`. | ☐ Pass ☐ Fail |

## B. Browsing

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-09 | On Events, search for "futsal", then clear the search | One event is listed, then all 9 are listed again | Playwright (visitor test) | Events for "futsal": `____` (count `__`). After clearing: `__` events. | ☐ Pass ☐ Fail |
| MT-10 | Open an event that has a poster | The whole poster is visible without cropped text. The date badge is readable. Availability shows "x of y spots left" with a bar. Description paragraphs keep their line breaks | none (visual) | Poster fully visible? Y / N. Availability text: `"____"`. Line breaks kept? Y / N | ☐ Pass ☐ Fail |
| MT-11 | As a visitor look for the draft "Alumni Career Panel" in the list and by search | It is not shown anywhere. As the organiser it appears under Drafts | API `event.api` (only published events are returned) | In the list? Y / N. By search? Y / N. As organiser it appears under: `____`. | ☐ Pass ☐ Fail |

## C. Registration

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-12 | As the attendee, open "Practical Cybersecurity & Ethical Hacking Talk" and click Register for this event | The page shows "You're registered". Spots left drops by one. The event appears in My Registrations | Playwright (attendee test); API `registration.api` | Message: `"____"`. Spots left before and after: `__` → `__`. In My Registrations? Y / N | ☐ Pass ☐ Fail |
| MT-13 | Reopen the same event | The registered state is shown and there is no second Register button | API `registration.api` (409 for a duplicate) | State shown: `"____"`. Register button present? Y / N | ☐ Pass ☐ Fail |
| MT-14 | Open "AI & LLM Engineering Hands-On Bootcamp" (full) | A disabled "Fully booked" button, a red availability bar, and "Fully booked" on its card in the list | API `registration.api` (409 when full, concurrency test) | Button text: `"____"`, disabled? Y / N. Bar colour: `____`. List card text: `"____"`. | ☐ Pass ☐ Fail |
| MT-15 | Click Cancel registration, then Keep my spot. Click Cancel registration again, then Yes, cancel registration | Keep changes nothing. Yes cancels the registration and spots left goes up by one | Playwright (attendee test); API `registration.api` (cancel) | After Keep: `____`. After Yes: status `____`, spots left `__` → `__`. | ☐ Pass ☐ Fail |
| MT-16 | Register again for the event you cancelled | Registration succeeds, the status is Confirmed, and My Registrations still has one record for the event | API `registration.api` (re-register reuses the record) | Result: `____`. Status shown: `____`. Records for this event: `__`. | ☐ Pass ☐ Fail |
| MT-17 | Reset the data, log in as the demo attendee, open My Registrations and switch between the three tabs | Upcoming 2, Past 1, Cancelled 1, and each tab lists the right events | `registration.model.spec` (status rules) | Counts (Upcoming / Past / Cancelled): `__` / `__` / `__`. Events listed: `____`. | ☐ Pass ☐ Fail |

## D. Organiser tools

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-18 | Create an event whose end time is before its start time | An error under Ends says the end must be after the start. Nothing is saved | `event-form.spec`; API `event.api` (400) | Message under Ends: `"____"`. Event saved? Y / N | ☐ Pass ☐ Fail |
| MT-19 | Create an event with the image `/posters/futsal-cup.jpg` and visibility Published | A notice says the event is published. A visitor sees it with the image | Playwright (organiser test, without image); API `event.api` (image path) | Notice: `"____"`. Visible to a visitor? Y / N. Image in list / details: `____` / `____`. | ☐ Pass ☐ Fail |
| MT-20 | Edit an event that has registrations and set a capacity below the registered count | An error explains the minimum capacity and Save is blocked | `event-form.spec`; API `registration.api` (400) | Message: `"____"`. Save blocked? Y / N | ☐ Pass ☐ Fail |
| MT-21 | Open Edit for an event and press Save changes without changing anything | Its date and time stay exactly the same | `event-form.spec` (unchanged start time); `datetime.spec` (round trip) | Date and time before: `____`. After: `____`. | ☐ Pass ☐ Fail |
| MT-22 | Cancel a published event that has registrations. Then check My Registrations as an attendee | The confirmation names the number of attendees. The event becomes Cancelled and the attendee sees "Event cancelled" | none | Confirmation text: `"____"`. Status after: `____`. Attendee sees: `"____"`. | ☐ Pass ☐ Fail |
| MT-23 | Open Registrations for an event. Search a name, then filter Cancelled | The list and the "Showing x of y registrations" line update | API `organiser.api` (attendee list) | Rows after searching `"____"`: `__`. Rows under Cancelled: `__`. Footer: `"____"`. | ☐ Pass ☐ Fail |
| MT-24 | Compare the Dashboard figures with Manage events | Upcoming events, registrations, seats filled and drafts all match what Manage events shows | none | Dashboard (events / registrations / seats / drafts): `__` / `__` / `__` / `__`. Matches? Y / N | ☐ Pass ☐ Fail |

## E. Real-time updates

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-25 | Browser 1: organiser on the Dashboard (LIVE). Browser 2 (private window): attendee registers for the Cybersecurity talk. Then the attendee cancels | The number goes up by one, the bar grows and flashes, and the feed shows the attendee, all without a refresh. After the cancel the number goes back | Playwright (live dashboard test); API `realtime.api` | Number before and after: `__` → `__` (about `__` s). Feed showed: `"____"`. Page refreshed? Y / N. After cancel: `____`. | ☐ Pass ☐ Fail |
| MT-26 | Browser 1: a visitor on the "3D Printing" event (2 spots left). Browsers 2 and 3: two attendees register | After the second registration the button changes to "Fully booked" without a refresh | API `realtime.api` (public counts) | Button before and after: `"____"` → `"____"`. Page refreshed? Y / N | ☐ Pass ☐ Fail |
| MT-27 | Dashboard open. Run `docker compose stop backend-blue`, wait 10 seconds, then `docker compose start backend-blue`. Register for an event | The indicator goes LIVE → OFFLINE or CONNECTING → LIVE, and the numbers are correct after reconnecting | `rollover-test.sh` (reconnect after code 1001) | Indicator sequence: `____`. Offline for `__` s. Numbers correct after reconnect? Y / N | ☐ Pass ☐ Fail |

## F. Deployment and distribution

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-28 | Clone the repository into a new folder, copy `.env.example` to `.env`, set `JWT_SECRET`, run `docker compose up -d --build --wait` and `docker compose run --rm backend-blue npm run seed:demo` | The site works at http://localhost:8080 with 9 events, using only the README | CI `docker` job builds from a clean checkout | Time from clone to a working site: `__` min. Events shown: `__`. Problems met: `____`. | ☐ Pass ☐ Fail |
| MT-29 | With the Dashboard open and a request watcher running, run `bash scripts/deploy.sh eventhub-backend:v2 2.0.0` | The version changes with no failed requests. The Dashboard reconnects without a page refresh | CI `rollover-test.sh` (161 requests, 0 failed) | Versions seen before → after: `____` → `____`. Failed lines: `__`. Indicator: `____`. | ☐ Pass ☐ Fail |
| MT-30 | Run `bash scripts/deploy.sh rollback` | The previous version is live again with no failed requests | CI `rollover-test.sh` (rollback step) | Version after rollback: `____`. Failed lines: `__`. | ☐ Pass ☐ Fail |
| MT-31 | Run the database, backend and frontend containers on three computers using `docker-compose.distributed.yml` | The app works from a browser on any computer, including live updates | none | Computers (db / api / web): `____` / `____` / `____`. Site reachable at: `____`. Live update across computers? Y / N | ☐ Pass ☐ Fail |

## G. Responsive layout and keyboard use

| ID | Steps | Expected | Automated coverage | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| MT-32 | Set the browser width to 400 px. Open Events, an event page, the Dashboard and Create event | No horizontal scrolling. Content is readable and the header stays usable | none | Widths tested: `____`. Horizontal scroll per page: `____`. Problems: `____`. | ☐ Pass ☐ Fail |
| MT-33 | Register for an event using only the keyboard (Tab, Shift+Tab, Enter) | Every control is reachable in a sensible order, the focus outline is visible, and the cancel confirmation works | none | Tab order logical? Y / N. Focus visible? Y / N. Steps that needed the mouse: `____`. | ☐ Pass ☐ Fail |

## Summary

| Group | Cases | Pass | Fail |
| --- | --- | --- | --- |
| A. Accounts and access | 8 | | |
| B. Browsing | 3 | | |
| C. Registration | 6 | | |
| D. Organiser tools | 7 | | |
| E. Real-time updates | 3 | | |
| F. Deployment and distribution | 4 | | |
| G. Responsive and keyboard | 2 | | |
| **Total** | **33** | | |

## Defect log

| ID | Found in | What happened | Severity | Fix (commit) | Re-test result |
| --- | --- | --- | --- | --- | --- |
| D-01 | | | | | |