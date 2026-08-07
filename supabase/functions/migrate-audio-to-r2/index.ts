// Supabase Edge Function: migrate-audio-to-r2 (chay 1 lan, an toan chay lai nhieu lan)
// Chuyen cac file am thanh dang luu trong Supabase Storage (bucket "vocab-audio") sang
// Cloudflare R2, roi cap nhat lai audio_en_url/audio_vi_url/audio_question_url trong database.
// Tu ky request bang AWS Signature v4 (Web Crypto co san trong Deno) thay vi dung
// @aws-sdk/client-s3, vi goi do bi loi khi chay trong moi truong Edge Function cua Supabase.
//
// Cach dung: sau khi da deploy va khai bao du cac secret R2_* (giong file generate-audio),
// mo thang URL cua ham nay tren trinh duyet nhieu lan cho toi khi ket qua tra ve migrated: 0.
// Moi lan chay chi xu ly toi da 15 file de tranh bi timeout.
//
// Deploy: Supabase Dashboard > Edge Functions > New function > ten "migrate-audio-to-r2" > dan code nay > Deploy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BATCH_SIZE = 15;

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

function isSupabaseStorageUrl(url: string | null, supabaseUrl: string) {
  return !!url && url.indexOf(supabaseUrl + "/storage/v1/object/public/vocab-audio/") === 0;
}

function pathFromSupabaseUrl(url: string, supabaseUrl: string) {
  return url.slice((supabaseUrl + "/storage/v1/object/public/vocab-audio/").length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const r2Creds = {
      accountId: Deno.env.get("R2_ACCOUNT_ID") as string,
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") as string,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") as string,
      bucket: Deno.env.get("R2_BUCKET_NAME") as string,
    };
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL_BASE");

    var migrated = 0;
    var failed: string[] = [];

    var tables = [
      { name: "game_vocab", cols: ["audio_en_url", "audio_vi_url"] },
      { name: "game_sentences", cols: ["audio_en_url", "audio_vi_url"] },
      { name: "game_speaking_questions", cols: ["audio_question_url"] },
    ];

    for (const table of tables) {
      for (const col of table.cols) {
        if (migrated >= BATCH_SIZE) break;

        const { data: rows, error } = await supabase
          .from(table.name)
          .select("id," + col)
          .like(col, supabaseUrl + "/storage/v1/object/public/vocab-audio/%")
          .limit(BATCH_SIZE - migrated);

        if (error) {
          failed.push(table.name + "." + col + ": " + error.message);
          continue;
        }

        for (const row of rows || []) {
          const oldUrl = (row as any)[col] as string;
          if (!isSupabaseStorageUrl(oldUrl, supabaseUrl)) continue;

          try {
            const path = pathFromSupabaseUrl(oldUrl, supabaseUrl);
            const fileResp = await fetch(oldUrl);
            if (!fileResp.ok) {
              failed.push(table.name + "#" + (row as any).id + " (" + col + "): tai file cu that bai " + fileResp.status);
              continue;
            }
            const buf = await fileResp.arrayBuffer();

            await putObjectToR2({
              ...r2Creds,
              key: path,
              body: new Uint8Array(buf),
              contentType: "audio/mpeg",
              cacheControl: "public, max-age=31536000, immutable",
            });

            const newUrl = `${publicUrlBase}/${path}`;
            const { error: updateError } = await supabase
              .from(table.name)
              .update({ [col]: newUrl })
              .eq("id", (row as any).id);

            if (updateError) {
              failed.push(table.name + "#" + (row as any).id + " (" + col + "): cap nhat DB that bai " + updateError.message);
              continue;
            }

            migrated++;
          } catch (e) {
            failed.push(table.name + "#" + (row as any).id + " (" + col + "): " + String(e));
          }
        }
      }
    }

    return new Response(JSON.stringify({ migrated, failed, note: migrated === 0 && failed.length === 0 ? "Da chuyen xong het, khong con file nao can chuyen." : "Chay lai lan nua neu migrated > 0." }), {
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
