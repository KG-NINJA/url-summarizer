export default {
  async fetch(request, env) {
    const urlObj = new URL(request.url);
    const path = urlObj.pathname;

    // どちらでも受ける（/ でも /summarize でもOK）
    const isSummarizeEndpoint = (path === "/" || path === "/summarize");

    // --- CORS プリフライト ---
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (!isSummarizeEndpoint) {
      return new Response("Not Found", { status: 404, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const targetUrl = body.url;
    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.startsWith("http")) {
      return json({ error: "Invalid URL" }, 400);
    }

    // 1) HTML取得
    let html;
    try {
      const res = await fetch(targetUrl, {
        headers: { "User-Agent": "URL-Summarizer-Prototype" }
      });
      html = await res.text();
    } catch {
      return json({ error: "Failed to fetch target URL" }, 500);
    }

    // 2) title 抽出
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? decode(titleMatch[1]).slice(0, 80) : "No title";

    // 3) 本文抽出（PoC用）
    const text = decode(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
    ).slice(0, 3000);

    // 4) 仮要約（LLMなし）
    const summary = (text.split("。").slice(0, 4).join("。") + "。").trim();

    return json({ title, summary, url: targetUrl });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

function decode(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}
