// Supabase Edge Function: speak-grade
// Nhận { targetText, kind, audioBase64, mimeType } -> gửi audio cho Gemini nghe và chấm phát âm/độ đúng
// so với targetText, trả JSON có cấu trúc: điểm số + nhận xét ngắn theo tiếng Việt, giọng khích lệ.
// kind: "sentence" (câu) hoặc "word" (1 từ) -> chấm khác nhau (câu có thêm nhận xét về độ trôi chảy).
// Deploy: Supabase Dashboard > Edge Functions > Deploy a new function > tên "speak-grade" > dán code này > Deploy
// Dùng chung secret GEMINI_API_KEY đã cấu hình cho speak-translate/speak-vocab-analyze.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SENTENCE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    verdict: { type: "string", enum: ["pass", "close", "retry"] },
    pronunciation_feedback: { type: "string" },
    fluency_feedback: { type: "string" },
    praise: { type: "string" },
  },
  required: ["score", "verdict", "pronunciation_feedback", "fluency_feedback", "praise"],
};

const WORD_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    verdict: { type: "string", enum: ["pass", "close", "retry"] },
    pronunciation_feedback: { type: "string" },
    praise: { type: "string" },
  },
  required: ["score", "verdict", "pronunciation_feedback", "praise"],
};

function buildSystemInstruction(kind: string): string {
  const base =
    "Bạn là giáo viên tiếng Anh chấm phát âm cho học sinh tiểu học Việt Nam, giọng nghiêm túc nhưng luôn khích lệ, không chê bai nặng nề. " +
    "Bạn sẽ nghe 1 đoạn audio học sinh nói, so với văn bản mục tiêu (target) mà học sinh được yêu cầu nói. " +
    "Chấm CHẶT CHẼ, thật sát với những gì nghe được trong audio, không chấm cho có — nếu sai từ nào, thiếu từ nào, phát âm sai âm nào thì phải nêu cụ thể. " +
    "score: thang điểm 0-10 (được phép có 1 số thập phân, ví dụ 8.7), phản ánh đúng mức độ chính xác. " +
    "verdict: \"pass\" nếu về cơ bản đọc đúng và phát âm chấp nhận được (thường ứng với score >= 8), " +
    "\"close\" nếu gần đúng nhưng còn vài lỗi phát âm/từ (thường score 5.5-8), " +
    "\"retry\" nếu sai nhiều, thiếu câu/từ, hoặc không nói đúng nội dung target (thường score < 5.5). " +
    "Mọi nhận xét viết bằng tiếng Việt, ngắn gọn 1-2 câu mỗi mục, xưng \"bạn\" khi nói với học sinh (không dùng \"con\").";

  if (kind === "word") {
    return base + " Đây là 1 TỪ đơn (không phải câu) nên chỉ cần nhận xét pronunciation_feedback (phát âm từ đó, có phiên âm liên quan nếu cần) và praise (khen ngắn), không cần nhận xét độ trôi chảy.";
  }
  return base + " Đây là 1 CÂU học sinh đọc lại. pronunciation_feedback: nêu rõ từ nào phát âm chưa chuẩn (nếu có). fluency_feedback: nhận xét tốc độ đọc, có tự nhiên/mạch lạc không. praise: khen ngắn gọn phần làm tốt.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const targetText = (body.targetText || "").toString().trim();
    const audioBase64 = body.audioBase64;
    const mimeType = body.mimeType || "audio/webm";
    const kind = body.kind === "word" ? "word" : "sentence";

    if (!targetText || !audioBase64) {
      return new Response(JSON.stringify({ error: "Thiếu targetText hoặc audioBase64" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    const promptLabel = kind === "word" ? "Từ mục tiêu (target)" : "Câu mục tiêu (target)";

    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemInstruction(kind) }] },
        contents: [{
          role: "user",
          parts: [
            { text: promptLabel + ": " + targetText },
            { inlineData: { mimeType: mimeType, data: audioBase64 } },
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: kind === "word" ? WORD_SCHEMA : SENTENCE_SCHEMA,
          temperature: 0.2,
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

    return new Response(JSON.stringify({
      score: typeof parsed.score === "number" ? parsed.score : null,
      verdict: parsed.verdict || "retry",
      pronunciation_feedback: parsed.pronunciation_feedback || "",
      fluency_feedback: parsed.fluency_feedback || "",
      praise: parsed.praise || "",
    }), {
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
