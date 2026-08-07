// Supabase Edge Function: generate-audio
// Nhận { text, lang, path } -> gọi Google translate_tts -> lưu vào Cloudflare R2 (bucket "vocab-audio")
// -> trả về public URL. Dùng R2 vì R2 không tính phí băng thông tải ra (egress), tránh lặp lại
// việc Supabase khóa project vì vượt hạn mức egress.
// Tự ký request bằng AWS Signature v4 (Web Crypto có sẵn trong Deno) thay vì dùng @aws-sdk/client-s3,
// vì gói đó bị lỗi khi chạy trong môi trường Edge Function của Supabase.
//
// Deploy: Supabase Dashboard > Edge Functions > generate-audio > dán code này > Deploy
// Cần khai báo các secret sau trong Supabase Dashboard > Edge Functions > Secrets:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL_BASE

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
}

async function putObjectToR2(opts: {
  accountId: string; accessKeyId: string; secretAccessKey: string;
  bucket: string; key: string; body: Uint8Array; contentType: string; cacheControl: string;
}): Promise<void> {
  const { accountId, accessKeyId, secretAccessKey, bucket, key, body, contentType, cacheControl } = opts;
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders =
    `cache-control:${cacheControl}\ncontent-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "cache-control;content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHash].join("\n");

  const kDate = await hmac(new TextEncoder().encode("AWS4" + secretAccessKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(await hmac(kSigning, stringToSign));

  const authorizationHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const resp = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authorizationHeader,
    },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`R2 upload failed: ${resp.status} ${text}`);
  }
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

    await putObjectToR2({
      accountId: Deno.env.get("R2_ACCOUNT_ID") as string,
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") as string,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") as string,
      bucket: Deno.env.get("R2_BUCKET_NAME") as string,
      key: path,
      body: new Uint8Array(audioBuffer),
      contentType: "audio/mpeg",
      cacheControl: "public, max-age=31536000, immutable",
    });

    const publicUrl = `${Deno.env.get("R2_PUBLIC_URL_BASE")}/${path}`;

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
