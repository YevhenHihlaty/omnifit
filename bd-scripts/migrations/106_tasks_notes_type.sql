-- 106_tasks_notes_type.sql — add notes and task_type to tasks table

alter table public.tasks
  add column if not exists notes text,
  add column if not exists task_type text;
