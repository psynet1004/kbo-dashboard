// Netlify Edge Function (Deno runtime)
export default async (request, context) => {
  const KEY = Deno.env.get("KBO_AUTH_KEY");
  if (!KEY) {
    return new Response(
      JSON.stringify({ error: "KBO_AUTH_KEY 환경변수 미설정" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(request.url);
  const m = url.pathname.match(/\/api\/(.+)$/);
  const subPath = m ? m[1] : "";
  if (!subPath) {
    return new Response(
      JSON.stringify({ error: "sub path 추출 실패", path: url.pathname }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const params = new URLSearchParams(url.search);
  params.set("auth_key", KEY);

  const upstreamUrl = `https://data.psynet.co.kr/data3V1/${subPath}?${params.toString()}`;

  try {
    const r = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 KBO-Dashboard-Edge",
        "Accept": "application/json"
      }
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "upstream 호출 실패", detail: String(e?.message || e) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const config = {
  path: "/api/*"
};
