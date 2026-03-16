-- Поведение по сессии: запись кликов/движений до отправки заявки.
-- Выполнить один раз на существующей БД (если таблица lead_behavior уже есть без session_id):
--
-- psql -U postgres -d postgres -f 001_lead_behavior_session_id.sql
-- или: docker exec -i rp_postgres psql -U postgres -d postgres < backend/migrations/001_lead_behavior_session_id.sql

ALTER TABLE lead_behavior ADD COLUMN IF NOT EXISTS session_id VARCHAR(64) NULL;
ALTER TABLE lead_behavior ALTER COLUMN lead_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ix_lead_behavior_session_id ON lead_behavior (session_id) WHERE session_id IS NOT NULL;
