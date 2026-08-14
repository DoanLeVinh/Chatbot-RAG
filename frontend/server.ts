import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());



  // Proxy ALL /api/* routes to Python FastAPI Backend (RAG + Gemini)
  // This ensures /api/chat goes through the full RAG pipeline (not a Node.js hardcode)
  app.use(["/api/admin", "/api/auth", "/api/sessions", "/api/export", "/api/query", "/api/chat", "/api/upload", "/api/settings", "/api/citations"], async (req: any, res: any) => {
    try {
      const url = `http://127.0.0.1:8000${req.originalUrl}`;
      const isMultipart = req.headers['content-type']?.includes('multipart/form-data');
      
      const headers: any = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (!['host', 'content-length', 'connection'].includes(key.toLowerCase()) && value) {
          headers[key] = value;
        }
      }
      if (!headers['content-type'] && !isMultipart) {
        headers['content-type'] = 'application/json';
      }

      let fetchOptions: any = {
        method: req.method,
        headers,
      };

      if (!['GET', 'HEAD'].includes(req.method)) {
        if (isMultipart) {
          fetchOptions.duplex = 'half';
          fetchOptions.body = req;
        } else {
          fetchOptions.body = JSON.stringify(req.body);
        }
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json();
        res.status(response.status).json(data);
      } else {
        const buffer = await response.arrayBuffer();
        res.status(response.status)
          .set('Content-Type', contentType)
          .send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("Proxy error to backend:", error);
      res.status(502).json({ error: "Backend không phản hồi. Vui lòng kiểm tra server Python." });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server LogiChat running on http://localhost:${PORT}`);
  });
}

startServer();
