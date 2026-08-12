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

  // Initialize Gemini AI Client
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route: AI Legal Consultation
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history } = req.body;
      const ai = getAiClient();

      if (!ai) {
        // Fallback response when GEMINI_API_KEY is not set
        return res.json({
          reply: `Cảm ơn bạn đã hỏi về: "${prompt}".\n\nTheo quy định pháp luật Hải quan Việt Nam hiện hành:\n- Vui lòng cung cấp thêm mã HS (Harmonized System 6-8 chữ số) hoặc tên thương mại chi tiết của mặt hàng.\n- Các văn bản pháp lý chính bao gồm: Luật Hải quan 2014, Nghị định 08/2015/NĐ-CP, Nghị định 59/2018/NĐ-CP, và Thông tư 38/2015/TT-BTC.`,
          hsCode: "8542.31",
          taxes: [
            { label: "Thuế nhập khẩu ưu đãi (MFN / VJEPA)", rate: "0%", citationCode: "NĐ 119/2022/NĐ-CP" },
            { label: "Thuế Giá trị gia tăng (VAT)", rate: "10%" }
          ],
          citations: [
            {
              id: "nd-119-2022",
              code: "NĐ 119/2022/NĐ-CP",
              title: "Nghị định 119/2022/NĐ-CP",
              status: "active",
              statusLabel: "Đang có hiệu lực",
              enactmentDate: "30/12/2022",
              summary: "Biểu thuế nhập khẩu ưu đãi đặc biệt của Việt Nam thực hiện Hiệp định AJCEP."
            }
          ]
        });
      }

      const systemInstruction = `Bạn là Trợ lý Pháp lý Hải quan LogiChat chuyên nghiệp, chính xác về luật Xuất Nhập Khẩu và Hải quan Việt Nam.
Hãy trả lời câu hỏi bằng tiếng Việt chuyên môn, lịch sự, rõ ràng.
Cung cấp phân tích thuế suất (Nhập khẩu, VAT, C/O), danh mục kiểm tra chuyên ngành, và trích dẫn các Nghị định/Thông tư chính xác của Bộ Tài chính, Bộ Công Thương, Bộ Y tế, Bộ TT&TT nếu có.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const replyText = response.text || "Không có phản hồi từ mô hình AI.";
      
      return res.json({
        reply: replyText,
      });
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: error.message || "Lỗi xử lý hệ thống AI" });
    }
  });

  // Proxy /api/admin to Python Backend
  app.use("/api/admin", async (req, res) => {
    try {
      const url = `http://127.0.0.1:8000/api/admin${req.url}`;
      const response = await fetch(url, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Proxy error to backend:", error);
      res.status(502).json({ error: "Backend không phản hồi" });
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
