# Humanpartner Mall

휴먼파트너 렌탈 쇼핑몰 프론트엔드/백엔드(서버, Firebase Functions) 프로젝트입니다.

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

## 3) Firebase 프로젝트 연결

`.firebaserc`의 `REPLACE_WITH_FIREBASE_PROJECT_ID`를 실제 Firebase 프로젝트 ID로 변경하세요.

또는:

```bash
firebase use --add
```

## 4) Supabase 초기 스키마 (필수)

신규 Supabase 프로젝트를 연결했다면 `supabase_bootstrap_schema.sql`을 SQL Editor에서 1회 실행하세요.

실행하지 않으면 로그인 시 아래와 같은 오류가 발생할 수 있습니다.
- `PGRST205`
- `Could not find the table 'public.user_profiles' in the schema cache`
