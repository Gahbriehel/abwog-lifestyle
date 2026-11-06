import { PORT } from "./ports";

/**
 * The dev server compiles a page the first time it is visited, and a compile in the
 * middle of a test can reload the page and wipe what the test just typed. Visiting every
 * route once up front means the tests only ever hit compiled pages.
 */
const ROUTES = [
  "/",
  "/login",
  "/account",
  "/events",
  "/events/event-youth",
  "/events/event-youth/register",
  "/give",
  "/confessions",
  "/confessions/confession-for-protection",
  "/profile",
  "/profile/member-sarah",
];

export default async function warmUp() {
  for (const route of ROUTES) {
    try {
      await fetch(`http://localhost:${PORT}${route}`, { redirect: "manual", signal: AbortSignal.timeout(90_000) });
    } catch {
      // A route that can't warm up will show its own failure in the tests.
    }
  }
}
