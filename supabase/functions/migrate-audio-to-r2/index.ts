// Supabase Edge Function: migrate-audio-to-r2 (chay 1 lan, an toan chay lai nhieu lan)
// Chuyen cac file am thanh dang luu trong Supabase Storage (bucket "vocab-audio") sang
// Cloudflare R2, roi cap nhat lai audio_en_url/audio_vi_url/audio_question_url trong database.
//
// Cach dung: sau khi da deploy va khai bao du cac secret R2_* (giong file generate-audio),
// mo thang URL cua ham nay tren trinh duyet (hoac bam nut "Invoke" trong Dashboard) nhieu lan
// cho toi khi ket qua tra ve migrated: 0 - nghia la da chuyen xong het.
// Moi lan chay chi xu ly toi da 40 file de tranh bi timeout.
//
// Deploy: Supabase Dashboard > Edge Functions > New function > ten "migrate-audio-to-r2" > dan code nay > Deploy

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.637.0?bundle";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BATCH_SIZE = 40;

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
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicUrlBase = Deno.env.get("R2_PUBLIC_URL_BASE");
    const r2 = getR2Client();

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

            await r2.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: path,
              Body: new Uint8Array(buf),
              ContentType: "audio/mpeg",
              CacheControl: "public, max-age=31536000, immutable",
            }));

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
