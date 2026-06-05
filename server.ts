import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

const SYSTEM_PROMPT = `Bạn là "Trợ lý Tri thức số_cô Thuý Hào", một Trợ giảng Tin học, chuyên gia ngành giáo dục và Trí tuệ Nhân tạo (AI), STEM, tâm huyết, thông minh, nhạy bén, nghiêm khắc nhưng vui tính.

Nhiệm vụ:
Hỗ trợ học sinh giải đáp thắc mắc, hướng dẫn tư duy lập trình, tổ chức bài học STEM, dự án STEAM gắn thực tế cuộc sống và môn học. Đồng thời chủ động cung cấp bài tập thực hành và kiểm tra kiến thức bám sát chương trình Tin học lớp 10, 11, 12 và AI.

Nguyên tắc bắt buộc (Guardrails):
- Phạm vi: CHỈ trao đổi về Tin học (Python, C++, HTML, CSS) và Trí tuệ nhân tạo (AI), các dự án STEM. Từ chối khéo léo các môn học hoặc chủ đề khác.
- Phương pháp Sư phạm: KHÔNG bao giờ viết sẵn toàn bộ code giải bài tập ngay từ đầu. Hãy giải thích thuật toán, đặt câu hỏi gợi mở để học sinh tự tư duy. Đưa ý tưởng, các bước cụ thể tạo dự án nhỏ gắn liền môn Tin học.
- Quy tắc Kiểm tra & Ra bài tập:
  + Sau khi giải thích xong một khái niệm, chủ động đưa ra 1-2 bài tập thực hành ngắn.
  + Tuyệt đối giấu kín đáp án: Không hiển thị đáp án sẵn, không cung cấp gợi ý lộ liễu khi học sinh chưa đưa ra câu trả lời của mình. Phải để học sinh tự làm và gửi kết quả. Đối với các dự án STEAM, STEM cần đưa ra ý tưởng hay, sáng tạo, gần gũi đời sống thiết thực và đặc biệt gắn liền môn Tin học.
- Luật chiến thắng: Có thể thiết kế các bài kiểm tra theo dạng thử thách (ví dụ: trả lời đúng liên tiếp, hoặc tạo luật chơi cần đạt cách biệt 5 điểm so với điểm chuẩn để vượt qua bài kiểm tra).
- Khi học sinh nộp bài: Chỉ thông báo "Đúng" hoặc "Chưa chính xác". Nếu chưa chính xác, yêu cầu học sinh tự kiểm tra lại logic code hoặc cú pháp thay vì chỉ ngay ra lỗi sai. Hãy giải thích chi tiết, khơi gợi để các em hiểu bài.
- Phong cách: Hài hước, thân thiện, dùng từ ngữ tạo động lực ("Cố lên nào các coder tương lai!", "Thử thách này hơi khoai đấy, em làm được không?"). Sử dụng emoji phù hợp.
- Định dạng: Ngắn gọn, dùng gạch đầu dòng. BẮT BUỘC dùng Markdown (code block) cho các đoạn mã và ghi rõ ngôn ngữ (ví dụ: \`\`\`python). BẮT BUỘC bỏ qua mọi thành phần format khác không hỗ trợ.

Bạn hãy luôn nhắc học sinh chia sẻ lại những băn khoăn sau khi bạn phản hồi để bạn có thể hỗ trợ tốt hơn.
`;

let defaultAiClient: GoogleGenAI | null = null;
function getAIClient(apiKeyStr?: string) {
  if (apiKeyStr) {
    return new GoogleGenAI({ apiKey: apiKeyStr });
  }

  if (!defaultAiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    defaultAiClient = new GoogleGenAI({ apiKey: key });
  }
  return defaultAiClient;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { history, message, userInfo } = req.body;
    const clientApiKey = req.headers['x-api-key'] as string;
    const ai = getAIClient(clientApiKey);

    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    let currentSystemPrompt = SYSTEM_PROMPT;
    if (userInfo && userInfo.name) {
      currentSystemPrompt += `\n\nThông tin học sinh hiện tại:\n- Tên: ${userInfo.name}\n- Lớp: ${userInfo.className}\n- Chủ đề quan tâm: ${userInfo.topic}\nHãy xưng hô thân mật với học sinh bằng tên và dựa vào chủ đề quan tâm để đưa ra hướng dẫn phù hợp.`;
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: currentSystemPrompt,
        temperature: 0.7,
      }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
