import "dotenv/config";
import { app } from "./app";
import { env } from "./config/env";
import { startScheduler } from "./scheduler/cron";

app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
  startScheduler();
});
