// Netlify Function: KBO API 프록시 + auth_key 서버측 주입
// 클라이언트는 키 없이 /api/* 호출, 서버가 환경변수에서 키 추가 후 upstream 호출
//
// 라우팅:
//   브라우저  /api/livescore/gameList?search_date=...&compe=baseball
//   ↓ netlify.toml redirect
//   Function /.netlify/functions/api/livescore/gameList?search_date=...&compe=baseball
//   ↓ this function
//   Upstream https://data.psynet.co.kr/data3V1/livescore/gameList?...&auth_key=ENV

const UPSTREAM = "https://data.psynet.co.kr/data3V1";

exports.handler = async (event) => {
  const KEY = process.env.KBO_AUTH_KEY;
  if (!KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "KBO_AUTH_KEY 환경변수가 설정되지 않음. Netlify Site settings → Environment variables 에서 추가" })
    };
  }

  // event.path 예: "/.netlify/functions/api/livescore/gameList"
  // /api/ 또는 /functions/api/ 뒤의 sub path 추출
  const m = event.path.match(/\/api\/(.+)$/);
  const subPath = m ? m[1] : "";
  if (!subPath) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "경로 누락" })
    };
  }

  // 쿼리 파라미터 + auth_key 주입
  const params = new URLSearchParams(event.queryStringParameters || {});
  params.set("auth_key", KEY);

  const upstreamUrl = `${UPSTREAM}/${subPath}?${params.toString()}`;

  try {
    const r = await fetch(upstreamUrl, {
      headers: { "User-Agent": "KBO-Dashboard-Netlify/1.0" }
    });
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: {
        "Content-Type": r.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      },
      body
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `upstream 호출 실패: ${e.message || e}` })
    };
  }
};
