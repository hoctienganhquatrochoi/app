// Supabase Edge Function: generate-audio
// Nhận { text, lang, path } -> gọi Google translate_tts -> lưu vào Cloudflare R2 (bucket "vocab-audio")
// -> trả về public URL. Dùng R2 vì R2 không tính phí băng thông tải ra (egress), tránh lặp lại
// việc Supabase khóa project vì vượt hạn mức egress.
//
// Deploy: Supabase Dashboard > Edge Functions > generate-audio > dán code này > Deploy
// Cần khai báo các secret sau trong Supabase Dashboard > Edge Functions > Secrets:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL_BASE

import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.637.0?bundle";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getR2Client() {
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKeyId as string, secretAccessKey: secretAccessKey as string },
  });
}

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

    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL_BASE");
    const r2 = getR2Client();

    await r2.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: path,
      Body: new Uint8Array(audioBuffer),
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable",
    }));

    const publicUrl = `${publicUrlBase}/${path}`;

    return new Response(JSON.stringify({ url: publicUrl }), {
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
