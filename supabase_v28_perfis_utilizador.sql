-- V28 - Tabela para sincronizar nome/alcunha do relatório por utilizador
-- Executar no Supabase > SQL Editor > New query > Run

CREATE TABLE IF NOT EXISTS public.perfis_utilizador (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_relatorio text,
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.perfis_utilizador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis_utilizador_select_own" ON public.perfis_utilizador;
CREATE POLICY "perfis_utilizador_select_own"
ON public.perfis_utilizador
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "perfis_utilizador_insert_own" ON public.perfis_utilizador;
CREATE POLICY "perfis_utilizador_insert_own"
ON public.perfis_utilizador
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "perfis_utilizador_update_own" ON public.perfis_utilizador;
CREATE POLICY "perfis_utilizador_update_own"
ON public.perfis_utilizador
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
