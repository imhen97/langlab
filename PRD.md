PRD.md
Product Requirements Document (PRD)
1. Overview
This document outlines the product requirements for developing the AI-powered English learning platform. The goal is to create an interactive and engaging website that integrates AI-driven tutoring, video-based lessons, vocabulary/grammar practice, and personalized progress tracking.
The document will serve as a reference for planning, implementation, and iteration.
2. Objectives
Provide students with an AI-driven English learning experience.
Enable interactive features such as quizzes, speech recognition, and progress dashboards.
Support monetization via paid subscriptions and referral links.
Ensure scalability, responsiveness, and easy integration with Notion for task/project management.
3. Target Users
Students: High school, university, and adult learners preparing for TOEIC/IELTS/OPIc.
Tutors: Instructors who want to provide structured feedback via AI tools.
Self-learners: Individuals seeking daily English practice through videos and AI-driven exercises.
4. Core Features (MVP Scope)
4.1 User Management
Sign up / Login (Email, Google, Kakao)
Profile creation (Name, Goals, Progress tracking)
4.2 Learning Modules
Pre-study section (video summary, vocabulary, expressions)
Interactive exercises (quizzes, fill-in-the-blank, multiple choice)
AI-driven speaking practice (voice input → feedback)
4.3 Lesson Flow
Video/lesson introduction
Key vocabulary/expressions (with audio)
Practice quiz (auto-graded)
Unlock next lesson upon completion
4.4 Progress Tracking
Dashboard with daily/weekly goals
XP points, badges, and streaks
4.5 Monetization
Paid subscription model
Referral links (CEX exchange, etc.)
Tiered access (Free vs Premium content)
5. Extended Features (Phase 2+)
AI Avatar for real-time conversation practice
Personalized learning path (adaptive learning)
Tutor dashboard (upload materials, track students)
Mobile app version
6. Technical Requirements
6.1 Frontend
Framework: Next.js (latest)
Styling: TailwindCSS + ShadCN UI
Animation: Framer Motion
Responsive design (desktop & mobile)
6.2 Backend
Node.js + Express or Next.js API routes
Database: PostgreSQL / Supabase
Authentication: NextAuth.js
AI Integration: OpenAI API (text + speech)
6.3 Infrastructure
Hosting: Vercel (Frontend), AWS or Supabase (DB)
File storage: AWS S3 / Supabase storage
CI/CD pipeline for deployment
7. Milestones & Development Steps
Phase 1 – Foundation (Week 1–2)
Setup project repository & environment
Implement authentication (Email/Google/Kakao)
Create basic UI (landing page, login, dashboard)
Phase 2 – Learning Flow (Week 3–5)
Build pre-study module (video + vocab + expressions)
Develop quiz system (MCQ, fill-in-the-blank)
Implement lesson unlocking system
Phase 3 – AI Features (Week 6–8)
Integrate OpenAI API (chat-based learning)
Add voice input & feedback (speech-to-text + AI correction)
Progress tracking dashboard
Phase 4 – Monetization (Week 9–10)
Payment gateway integration (Stripe/KakaoPay)
Referral system implementation
Phase 5 – Optimization (Week 11–12)
UI/UX improvements
Performance optimization
Bug fixes and QA testing
8. Success Metrics
Engagement: Daily active users, lesson completion rate
Learning Outcomes: Improved quiz scores, speaking accuracy
Monetization: Subscription conversions, referral revenue
Retention: Weekly returning users, streak continuation
9. Risks & Mitigation
API cost overload → Set usage limits, optimize caching.
User churn → Add gamification (badges, streaks).
Scaling issues → Use cloud infrastructure & modular design.
✅ This PRD will be synced with Notion for task tracking. Each development step (milestone) will be broken into subtasks in Notion, and progress will be updated in real-time.