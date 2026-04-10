import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";

import { auth } from "@jobfindeer/auth";

function findMonorepoRoot(): string {
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

const ALLOWED_SOURCES = new Set(["hellowork", "wttj"]);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Non autorise", { status: 401 });
  }

  const url = new URL(request.url);
  const sources = url.searchParams.getAll("source").filter((s) => ALLOWED_SOURCES.has(s));

  if (sources.length === 0) {
    return new Response("Aucune source valide", { status: 400 });
  }

  const userId = session.user.id;
  const root = findMonorepoRoot();
  const scriptPath = join(root, "apps/pipeline/src/scripts/run-source.ts");
  const envFile = join(root, ".env");
  const tsx = join(root, "apps/pipeline/node_modules/.bin/tsx");
  const dotenvCli = join(root, "node_modules/.bin/dotenv");

  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      function send(event: string, data: string) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
        }
      }

      function sendJson(event: string, data: unknown) {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream closed
        }
      }

      let completed = 0;

      for (const source of sources) {
        send("log", `[${source}] Demarrage du scraping...`);

        const child = spawn(
          dotenvCli,
          ["-e", envFile, "--", tsx, scriptPath, source, userId],
          { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
        );

        let stdout = "";

        child.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          stdout += text;
          // Send each line as a log event
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("__RESULT__")) {
              send("log", `[${source}] ${trimmed}`);
            }
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed) {
              send("log", `[${source}] [stderr] ${trimmed}`);
            }
          }
        });

        child.on("close", (code) => {
          // Parse result
          const resultLine = stdout.split("\n").find((l) => l.startsWith("__RESULT__"));
          if (resultLine) {
            try {
              const result = JSON.parse(resultLine.replace("__RESULT__", ""));
              sendJson("result", result);
            } catch {
              sendJson("result", {
                source,
                status: "error",
                offersCollected: 0,
                offersInserted: 0,
                duplicates: 0,
                durationMs: 0,
                error: "Impossible de parser le resultat",
              });
            }
          } else {
            sendJson("result", {
              source,
              status: "error",
              offersCollected: 0,
              offersInserted: 0,
              duplicates: 0,
              durationMs: 0,
              error: `Process termine avec code ${code}`,
            });
          }

          completed++;
          if (completed === sources.length) {
            sendJson("done", { total: sources.length });
            controller.close();
          }
        });

        child.on("error", (err) => {
          sendJson("result", {
            source,
            status: "error",
            offersCollected: 0,
            offersInserted: 0,
            duplicates: 0,
            durationMs: 0,
            error: err.message,
          });

          completed++;
          if (completed === sources.length) {
            sendJson("done", { total: sources.length });
            controller.close();
          }
        });
      }
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
