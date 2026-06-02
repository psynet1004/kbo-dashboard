// Netlify Function: KBO API 프록시 + auth_key 서버측 주입
// Node 내장 https 모듈 사용 (fetch 대비 안정성 ↑)
//
// 라우팅:
//   브라우저   /api/livescore/gameList?search_date=...&compe=baseball
//   ↓ netlify.toml redirect
//   Function  /.netlify/functions/api/livescore/gameList?search_date=...&compe=baseball
//   ↓ this function
//   Upstream  https://data.psynet.co.kr/data3V1/livescore/gameList?...&auth_key=ENV

const https = require("https");
const { URL } = require("url");

const UPSTREAM_HOST = "data.psynet.co.kr";
const UPSTREAM_PATH_PREFIX = "/data3V1";

function fetchUpstream(targetUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent": "KBO-Dashboard-Netlify/1.0",
        "Accept": "application/json"
      },
      timeout: 12000
    }, (res) => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers["content-type"] || "application/json",
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Upstream timeout (12s)")));
    req.on("error", reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const KEY = process.env.KBO_AUTH_KEY;
  if (!KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "KBO_AUTH_KEY 환경변수 미설정 — Netlify Site settings → Environment variables 확인" })
    };
  }

  // sub path 추출: 두 가지 케이스 모두 처리
  //   /api/livescore/gameList
  //   /.netlify/functions/api/livescore/gameList
  const path = event.path || event.rawPath || "";
  const m1 = path.match(/\/api\/(.+)$/);
  const m2 = path.match(/\/functions\/api\/(.+)$/);
  const subPath = (m1 && m1[1]) || (m2 && m2[1]) || "";

  if (!subPath) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "sub path 추출 실패", debug: { path } })
    };
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  params.set("auth_key", KEY);

  const upstreamUrl = `https://${UPSTREAM_HOST}${UPSTREAM_PATH_PREFIX}/${subPath}?${params.toString()}`;

  try {
    const result = await fetchUpstream(upstreamUrl);
    return {
      statusCode: result.statusCode,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store"
      },
      body: result.body
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "upstream 호출 실패",
        detail: String(e.message || e),
        code: e.code || null
      })
    };
  }
};
