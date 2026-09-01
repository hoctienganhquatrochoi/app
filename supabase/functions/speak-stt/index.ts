// Supabase Edge Function: speak-stt
// Nhận { audioBase64, mimeType } (âm thanh tiếng Việt học sinh ghi âm) -> gửi cho Gemini nghe
// và chuyển thành chữ tiếng Việt. Thay cho SpeechRecognition trình duyệt vốn không ổn định trên
// Safari/iPad/iPhone (đã gặp lỗi này với phần đọc từ vựng trước đây).
// Deploy: Supabase Dashboard > Edge Functions > Deploy a new function > tên "speak-stt" > dán code này > Deploy
// Dùng chung secret GEMINI_API_KEY đã cấu hình cho các function speak-* khác.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_INSTRUCTION =
  "Bạn là bộ máy chuyển giọng nói tiếng Việt thành chữ (speech-to-text) cho ứng dụng học tiếng Anh của học sinh " +
  "tiểu học Việt Nam. Nghe đoạn audio và trả về CHÍNH XÁC nội dung nghe được, viết bằng chữ tiếng Việt có dấu đầy đủ, " +
  "không thêm bớt, không diễn giải, không dịch sang ngôn ngữ khác, không thêm dấu câu nếu học sinh không nói ngắt câu rõ. " +
  "Nếu audio im lặng, quá nhiễu để nghe rõ, hoặc không phải tiếng Việt thì trả về chuỗi rỗng cho transcript.";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transcript: { type: "string" },
  },
  required: ["transcript"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const audioBase64 = body.audioBase64;
    const mimeType = body.mimeType || "audio/webm";

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Thiếu audioBase64" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{
          role: "user",
          parts: [{ inlineData: { mimeType: mimeType, data: audioBase64 } }],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text().catch(function () { return ""; });
      return new Response(JSON.stringify({ error: "Gemini lỗi: " + geminiResp.status + " " + errText }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return new Response(JSON.stringify({ error: "Gemini không trả về nội dung" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(rawText);

    return new Response(JSON.stringify({ transcript: parsed.transcript || "" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
