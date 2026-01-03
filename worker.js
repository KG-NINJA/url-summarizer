export default {
  async fetch(req, env) {
    if (req.method !== 'POST') {
      return new Response('Not allowed', { status: 405 });
    }

    const { url } = await req.json();

    // 1. HTML取得
    const html = await fetch(url).then(r => r.text());

    // 2. 超簡易本文抽出（PoC用）
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, '')
      .slice(0, 3000);

    // 3. LLM要約（ダミー or 無料API）
    const summary = text.split('\n').slice(0,5).join(' ');

    const result = {
      url,
      title: text.slice(0,40),
      summary
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
