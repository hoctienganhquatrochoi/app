// Dán anon public key thật vào đây (Supabase Dashboard > Settings > API > Project API keys > anon public)
// SUPABASE_URL đã đúng theo project "english-for-kids" đang dùng chung.
var SUPABASE_URL = "https://ybqbweywgkbfidhlcjeh.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicWJ3ZXl3Z2tiZmlkaGxjamVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTU3OTAsImV4cCI6MjA5NjM5MTc5MH0.DD1sJjgbIv82fgLk3SPxpGDg7ENo9jPO0nD63UVKN9g";

// URL của Edge Function "generate-audio" sau khi deploy (Dashboard > Edge Functions > generate-audio > Details > sao chép URL)
var GENERATE_AUDIO_URL = SUPABASE_URL + "/functions/v1/generate-audio";

var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
