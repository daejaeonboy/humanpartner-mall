# Rentalpartner Mall

렌탈어때 렌탈 쇼핑몰 프론트엔드/백엔드(서버, Firebase Functions) 프로젝트입니다.

## 1) 환경 변수 설정

### 프론트엔드 (`.env`)

```bash
cp .env.example .env
```

필수:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

선택:
- `VITE_API_URL` (기본값: `http://localhost:4000`)
- `VITE_EMAIL_VERIFY_FUNCTION_URL` (로컬에서 Cloud Function 직접 호출 시)

### 서버 (`server/.env`)

```bash
cp server/.env.example server/.env
```

필수:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### Firebase Functions (`functions/.env`)

```bash
cp functions/.env.example functions/.env
```

필수:
- `EMAIL_USER`
- `EMAIL_PASS`

## 2) 로컬 실행

```bash
npm install
npm run dev
```

서버를 함께 쓸 경우:

```bash
cd server
npm install
npm run dev
```

## 3) 배포

운영 배포는 항상 아래 명령만 사용하세요. 이 스크립트들은 활성 Firebase 프로젝트와 무관하게
`humanpartner-mall` 프로젝트로 고정 배포합니다.

```bash
npm run deploy:prod
```

- 프론트(Hosting)만 배포

```bash
npm run deploy:prod:functions
```

- 인증 메일 함수(`sendEmailVerification`)만 배포

```bash
npm run deploy:prod:all
```

- 프론트와 인증 메일 함수를 함께 배포

주의:
- `firebase deploy`를 단독으로 실행하지 마세요.
- 반드시 위 스크립트로 배포하세요.

## 4) Supabase 초기 스키마 (필수)

신규 Supabase 프로젝트를 연결했다면 `supabase_bootstrap_schema.sql`을 SQL Editor에서 1회 실행하세요.

실행하지 않으면 로그인 시 아래와 같은 오류가 발생할 수 있습니다.
- `PGRST205`
- `Could not find the table 'public.user_profiles' in the schema cache`

