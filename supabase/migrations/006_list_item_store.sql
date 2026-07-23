-- Optional grocery store section for list_items (e.g. Costco, Sam's Club).
-- Null / empty means "Any store" (general). Checklist items leave this null.
-- Column-only change; existing RLS policies are unchanged.

alter table list_items
  add column if not exists store text;

comment on column list_items.store is
  'Grocery store section label (e.g. Costco). Null = Any store / General. Unused for checklist lists.';
