import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { request } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const screenshot = resolve(root, "tmp", "browser-smoke.png");
const viteBin = resolve(root, "node_modules", ".bin", "vite");
const chromePaths = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
];

mkdirSync(dirname(screenshot), { recursive: true });

const server = spawn(viteBin, ["--host", "127.0.0.1", "--port", "5173"], {
  cwd: root,
  stdio: "pipe"
});

try {
  await waitForHttp("http://127.0.0.1:5173/", 8000);
  const chrome = chromePaths.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error("No supported Chrome/Chromium executable found for browser smoke check.");
  }

  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--virtual-time-budget=3000",
    `--screenshot=${screenshot}`,
    "--window-size=960,540",
    "http://127.0.0.1:5173/?seed=424242"
  ]);

  const size = statSync(screenshot).size;
  if (size < 10_000) {
    throw new Error(`Browser smoke screenshot is unexpectedly small: ${size} bytes.`);
  }

  console.log(`Browser smoke passed: ${screenshot}`);
} finally {
  server.kill("SIGTERM");
}

function waitForHttp(url, timeoutMs) {
  const started = Date.now();
  return new Promise((resolveWait, rejectWait) => {
    const attempt = () => {
      const req = request(url, { method: "HEAD" }, (res) => {
        res.resume();
        resolveWait();
      });

      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          rejectWait(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 150);
      });

      req.end();
    };

    attempt();
  });
}

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}
