-- Adicionar coluna para Instagram na tabela 'sales_estrela'

ALTER TABLE sales_estrela 
ADD COLUMN IF NOT EXISTS customer_instagram TEXT;

COMMENT ON COLUMN sales_estrela.customer_instagram IS 'Arroba do Instagram do cliente (ex: @usuario)';
