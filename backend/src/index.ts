import cors from "cors";
import express from "express";
import { HOST, PORT, runtimeMode } from "./config.js";
import { registerRoutes } from "./routes.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

registerRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err && typeof err === "object" && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Server error.";
  if (status >= 500) console.error(err);
  res.status(Number.isFinite(status) && status >= 400 ? status : 500).json({ error: message });
});

app.listen(PORT, HOST, () => {
  const mode = runtimeMode();
  console.log(`DietRe API listening on http://${HOST}:${PORT}`);
  console.log(`store=${mode.mongo} parser=${mode.parser} auth=${mode.auth}`);
});
