# muel-tree / supabase / migrations

> **주의**: 이 폴더의 SQL 파일들은 Supabase **CLI migration이 아닙니다**.
> Supabase SQL Editor에서 **수동으로 적용된 스크립트**입니다.

## 실제 schema 관리

이 프로젝트(`pqzmehtuwnxyspfhyucd`)의 정식 migration history는
`Documents/Codex/2026-05-05/obsidian-rag-memory-eval-observer-crm/muel-bot/supabase/migrations/`
에서 관리됩니다 (5/22 기준 22개 migration 적용 완료).

## 이 폴더의 파일이 하는 일

| 파일 | 적용 시점 | 상태 (2026-05-22 확인) |
|---|---|---|
| `001_rls_policies.sql` | 5/6 04:20 | ✅ public.dreams / dream_connections / service_events에 RLS 적용됨 |
| `002_muel_profiles.sql` | 5/6 04:33 | ✅ muel_profiles / muel_profile_identities 테이블 존재 |
| `003_gemini_operations.sql` | 5/12 05:05 | ✅ gemini_operations / gemini_webhook_events / gemini_webhook_configs 테이블 존재 |

## 향후 변경 시

- **`supabase db push` 실행하지 마세요.** 이 폴더는 CLI 추적 대상이 아닙니다.
- 새 schema 변경은 **muel-bot 쪽 `supabase/migrations/`**에서 정식 migration으로 작성하세요.
- 부득이 SQL Editor에서 실행해야 하는 경우, 이 폴더에 파일을 추가하되 멱등성(`if not exists`)을 보장하세요.
