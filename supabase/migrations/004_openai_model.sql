-- Judy: model choice needs to be independent per provider (switching Anthropic <-> OpenAI
-- shouldn't lose either one's picked model). ai_model (003) now means "Anthropic's model".
alter table integration_settings add column if not exists openai_model text;
