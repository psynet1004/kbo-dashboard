# KBO Analytics Dashboard

KBO 2026 시즌 통합 대시보드. Psynet Data 3.0 API 사용.

## 구성

| 파일 | 설명 |
|---|---|
| `kbo-dashboard.html` | 메인 대시보드 (17개 섹션) |
| `daily-win-gap.html` | 일간 승차 변화 단독 차트 |
| `netlify.toml` | Netlify 배포 설정 |
| `netlify/functions/api.js` | API 프록시 Function (auth_key 서버측 주입) |

## 환경변수

Netlify Site settings → Environment variables 에서 다음 키 설정 필요:

```
KBO_AUTH_KEY = <Psynet API 인증키>
```

## 데이터 소스

`data.psynet.co.kr / GAME_LIST` · `LEAGUE_ID=11` (KBO 1군)
