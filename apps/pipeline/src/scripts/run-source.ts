/**
 * CLI script to run a single source with optional user filters.
 * Usage: tsx run-source.ts <sourceName> [userId]
 * Outputs JSON result to stdout.
 */
import { runSingleSource } from "../orchestrator";

const [sourceName, userId] = process.argv.slice(2);

if (!sourceName) {
  console.error(JSON.stringify({ error: "Usage: run-source.ts <sourceName> [userId]" }));
  process.exit(1);
}

runSingleSource(sourceName, userId || undefined)
  .then((result) => {
    // Output result as JSON on a marked line for easy parsing
    console.log(`__RESULT__${JSON.stringify(result)}`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(
      `__RESULT__${JSON.stringify({
        source: sourceName,
        status: "error",
        offersCollected: 0,
        offersInserted: 0,
        duplicates: 0,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      })}`,
    );
    process.exit(1);
  });
