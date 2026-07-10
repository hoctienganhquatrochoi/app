// Supabase Edge Function: translate-text
// Nhận { text } -> dịch Anh->Việt qua Google Translate (endpoint không chính thức, giống cách
// generate-audio dùng Google TTS) -> trả về { translation }
// Deploy: Supabase Dashboard > Edge Functions > Deploy a new function > tên "translate-text" > dán code này > Deploy

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

    if (!text) {
      return new Response(JSON.stringify({ error: "Thiếu text" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=" +
      encodeURIComponent(text);

    const resp = await fetch(url);

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Google Translate lỗi: " + resp.status }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let translation = "";
    for (const segment of data[0]) {
      translation += segment[0];
    }

    return new Response(JSON.stringify({ translation: translation }), {
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
