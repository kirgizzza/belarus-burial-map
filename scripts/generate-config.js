// Генерирует config.js из переменных окружения (для Netlify / CI)

const fs = require("fs");
const path = require("path");

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Задайте переменные SUPABASE_URL и SUPABASE_ANON_KEY");
  process.exit(1);
}

const content = `window.SUPABASE_CONFIG = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anonKey)},
};
`;

const outPath = path.join(__dirname, "..", "public", "config.js");
fs.writeFileSync(outPath, content, "utf8");
console.log("config.js создан");
