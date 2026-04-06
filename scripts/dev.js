const net = require("net");
const { spawn } = require("child_process");

const DEFAULT_WEB_PORT = 3001;
const DEFAULT_API_PORT = 4000;
const MAX_PORT_SEARCH = 25;

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;

    const tryListen = () => {
      const server = net.createServer();

      server.once("error", (error) => {
        server.close();
        const isBusyPort = error.code === "EADDRINUSE" || error.code === "EACCES";
        if (isBusyPort && currentPort < startPort + MAX_PORT_SEARCH) {
          currentPort += 1;
          tryListen();
          return;
        }
        reject(error);
      });

      server.once("listening", () => {
        const { port } = server.address();
        server.close(() => resolve(port));
      });

      server.listen(currentPort, "0.0.0.0");
    };

    tryListen();
  });
}

function spawnProcess(command, extraEnv = {}) {
  return spawn(command, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
}

async function main() {
  const webPort = await findAvailablePort(DEFAULT_WEB_PORT);
  const apiPort = await findAvailablePort(DEFAULT_API_PORT);
  const apiUrl = `http://localhost:${apiPort}/api`;

  console.log(`[dev] Frontend: http://localhost:${webPort}`);
  console.log(`[dev] Backend:  http://localhost:${apiPort}`);
  console.log(`[dev] API_URL:  ${apiUrl}`);

  if (webPort !== DEFAULT_WEB_PORT) {
    console.log(`[dev] Puerto ${DEFAULT_WEB_PORT} ocupado. Usando ${webPort} para el frontend.`);
  }
  if (apiPort !== DEFAULT_API_PORT) {
    console.log(`[dev] Puerto ${DEFAULT_API_PORT} ocupado. Usando ${apiPort} para el backend.`);
  }

  const apiProcess = spawnProcess(
    "npx nodemon src/server.js",
    { API_PORT: String(apiPort) }
  );

  const webProcess = spawnProcess(
    "npx react-scripts start",
    {
      PORT: String(webPort),
      BROWSER: "none",
      REACT_APP_API_URL: apiUrl,
    }
  );

  let shuttingDown = false;

  const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    if (!apiProcess.killed) apiProcess.kill();
    if (!webProcess.killed) webProcess.kill();

    setTimeout(() => process.exit(code), 300);
  };

  apiProcess.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[dev] El backend terminó con código ${code ?? 0}.`);
      shutdown(code ?? 0);
    }
  });

  webProcess.on("exit", (code) => {
    if (!shuttingDown) {
      console.log(`[dev] El frontend terminó con código ${code ?? 0}.`);
      shutdown(code ?? 0);
    }
  });

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
}

main().catch((error) => {
  console.error("[dev] No se pudieron resolver los puertos de desarrollo.", error);
  process.exit(1);
});
