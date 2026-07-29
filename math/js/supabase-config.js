// Dùng chung project Supabase với "english-for-kids" để chia sẻ tài khoản học sinh và lịch sử học tập.
var SUPABASE_URL = "https://ybqbweywgkbfidhlcjeh.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicWJ3ZXl3Z2tiZmlkaGxjamVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTU3OTAsImV4cCI6MjA5NjM5MTc5MH0.DD1sJjgbIv82fgLk3SPxpGDg7ENo9jPO0nD63UVKN9g";

var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
