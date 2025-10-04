# 랭귀지랩 (LangLab) - AI 기반 언어 학습 플랫폼

유튜브 영상, 뉴스 기사, MP3 파일을 활용한 맞춤형 영어 학습 플랫폼입니다.

## 🚀 주요 기능

### 📚 레슨 생성

- **다양한 소스 지원**: YouTube 링크, 뉴스 기사, MP3/MP4 파일
- **레벨별 맞춤**: A2(초급) ~ C1(고급) 레벨 자동 조정
- **목표별 학습**: 회화, IELTS, TOEIC, OPIc 대비
- **AI 자동 생성**: 20초 내 요약본, 어휘, 패턴, 퀴즈, 스피킹 카드 생성

### 🎯 학습 도구

- **동기화된 대본**: 영상과 함께 자막 표시
- **AB 반복**: 구간 반복 학습
- **속도 조절**: 0.5x ~ 1.5x 재생 속도
- **개인 단어장**: 학습한 단어 저장 및 간격 반복
- **진도 추적**: 학습 진행률 및 성취도 관리

### 🏆 동기부여 시스템

- **연속 학습 스트릭**: 매일 학습으로 연속 기록 달성
- **XP 포인트**: 학습 활동에 따른 포인트 적립
- **성취 배지**: 목표 달성 시 배지 획득
- **주간 목표**: 개인별 학습 목표 설정

## 🛠 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: NextAuth.js (Google, Kakao, Email)
- **AI Integration**: OpenAI GPT-4
- **Payments**: Stripe, Toss Payments
- **Deployment**: Vercel

## 📦 설치 및 실행

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd langlab
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/langlab"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# YouTube API
YOUTUBE_API_KEY="your-youtube-api-key"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Stripe
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"

# Toss Payments (for Korea)
TOSS_CLIENT_KEY="your-toss-client-key"
TOSS_SECRET_KEY="your-toss-secret-key"

# Email
RESEND_API_KEY="your-resend-api-key"

# Analytics
NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

### 4. YouTube API 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. YouTube Data API v3 활성화
3. API 키 생성 및 `.env.local`에 추가
4. API 할당량 설정 (일일 10,000 요청 권장)

### 5. 데이터베이스 설정

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev

# Prisma 클라이언트 생성
npx prisma generate
```

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
langlab/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 랜딩 페이지
│   │   ├── create/            # 레슨 생성 페이지
│   │   ├── lesson/[id]/       # 레슨 뷰어 페이지
│   │   ├── dashboard/         # 대시보드 페이지
│   │   └── auth/              # 인증 페이지들
│   ├── components/            # 재사용 가능한 컴포넌트
│   │   └── ui/                # 기본 UI 컴포넌트
│   └── lib/                   # 유틸리티 및 설정
│       ├── auth.ts           # NextAuth 설정
│       ├── prisma.ts         # Prisma 클라이언트
│       └── utils.ts          # 공통 유틸리티
├── prisma/
│   └── schema.prisma         # 데이터베이스 스키마
└── public/                   # 정적 파일
```

## 🎨 디자인 시스템

### 브랜드 색상

- **Primary**: Purple (#a855f7)
- **Secondary**: Pink (#ec4899)
- **Accent**: Mint (#14b8a6)

### 타이포그래피

- **Primary Font**: Pretendard
- **Secondary Font**: Inter
- **Monospace**: Nunito

## 📊 데이터 모델

### 주요 엔티티

- **User**: 사용자 정보 및 역할
- **Source**: 원본 콘텐츠 (YouTube, 뉴스, MP3)
- **Lesson**: 생성된 레슨 데이터
- **Progress**: 학습 진도 및 점수
- **Subscription**: 구독 정보
- **WordbookItem**: 개인 단어장
- **Streak**: 연속 학습 기록

## 🔧 API 엔드포인트

### 인증

- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/signin` - 로그인

### 레슨

- `POST /api/lesson/generate` - 레슨 생성
- `GET /api/lesson/:id` - 레슨 조회
- `POST /api/quiz/grade` - 퀴즈 채점
- `POST /api/progress` - 진도 업데이트

### 구독

- `POST /api/subscription/checkout` - 결제 시작
- `GET /api/subscription/status` - 구독 상태 확인

## 🚀 배포

### Vercel 배포

1. GitHub 저장소에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 환경 변수 설정
4. 자동 배포 완료

### 환경 변수 설정 (Production)

- 모든 개발 환경 변수를 프로덕션 값으로 업데이트
- 도메인 및 HTTPS 설정 확인
- 데이터베이스 연결 확인

## 📈 성능 최적화

- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **코드 분할**: 동적 임포트로 번들 크기 최적화
- **캐싱**: API 응답 및 정적 자산 캐싱
- **CDN**: Vercel Edge Network 활용

## 🔒 보안

- **인증**: NextAuth.js로 안전한 인증
- **데이터 보호**: Prisma ORM으로 SQL 인젝션 방지
- **환경 변수**: 민감한 정보 환경 변수로 관리
- **HTTPS**: 프로덕션에서 SSL/TLS 암호화

## 📱 반응형 디자인

- **Mobile First**: 모바일 우선 설계
- **Breakpoints**: Tailwind CSS 반응형 클래스 활용
- **터치 친화적**: 모바일 터치 인터페이스 최적화

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run type-check
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

- **이메일**: support@langlab.io
- **문서**: [docs.langlab.io](https://docs.langlab.io)
- **커뮤니티**: [Discord](https://discord.gg/langlab)

---

**랭귀지랩**으로 더 재미있고 효과적인 영어 학습을 시작하세요! 🚀
