import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export function basicAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header?.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [username, password] = decoded.split(":");
    if (username === env.dashboardUsername && password === env.dashboardPassword) {
      next();
      return;
    }
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Job Search Copilot"');
  res.status(401).json({ error: "Authentication required" });
}
