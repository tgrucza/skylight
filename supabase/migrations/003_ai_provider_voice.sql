-- Judy: multi-provider AI (Anthropic + OpenAI) with independent stored keys, a
-- chosen model per provider, and a voice preference (browser TTS or OpenAI TTS).
-- ai_provider/ai_api_key_enc already exist (001_v2.sql) and continue to mean "Anthropic".

alter table integration_settings add column if not exists openai_api_key_enc text;
alter table integration_settings add column if not exists ai_model text;
alter table integration_settings add column if not exists voice_provider text not null default 'browser';
alter table integration_settings add column if not exists voice_name text;
