# 바다 한 컷

Gemini AI를 활용해 해양생물 사진을 판독하는 웹페이지입니다.

## 실행

```bash
npm install
npm run dev
```

## Gemini API 키

`.env.local` 파일에 아래처럼 설정합니다. 이 파일은 GitHub에 올리지 마세요.

```bash
GEMINI_API_KEY=your_key_here
```

배포 환경에서도 `GEMINI_API_KEY`를 비밀 환경변수로 등록해야 사진 판독이 작동합니다.
