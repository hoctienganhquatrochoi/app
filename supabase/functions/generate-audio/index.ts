// Supabase Edge Function: generate-audio
// Nhận { text, lang, path } -> gọi Google translate_tts -> lưu vào Storage bucket "vocab-audio" -> trả về public URL
// Deploy: Supabase Dashboard > Edge Functions > Deploy a new function > tên "generate-audio" > dán code này > Deploy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const text = body.text;
    const lang = body.lang;
    const path = body.path;

    if (!text || !lang || !path) {
      return new Response(JSON.stringify({ error: "Thiếu text/lang/path" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const ttsUrl = "https://translate.google.com/translate_tts?ie=UTF-8&q=" +
      encodeURIComponent(text) + "&tl=" + encodeURIComponent(lang) + "&client=tw-ob";

    const ttsResp = await fetch(ttsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });

    if (!ttsResp.ok) {
      return new Response(JSON.stringify({ error: "Google TTS lỗi: " + ttsResp.status }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResp.arrayBuffer();
    if (audioBuffer.byteLength < 100) {
      return new Response(JSON.stringify({ error: "File âm thanh quá nhỏ, Google có thể đã chặn request" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl as string, serviceRoleKey as string);

    const uploadResult = await supabase.storage
      .from("vocab-audio")
      .upload(path, audioBuffer, { contentType: "audio/mpeg", upsert: true });

    if (uploadResult.error) {
      return new Response(JSON.stringify({ error: "Lỗi upload: " + uploadResult.error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const publicUrlResult = supabase.storage.from("vocab-audio").getPublicUrl(path);

    return new Response(JSON.stringify({ url: publicUrlResult.data.publicUrl }), {
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
