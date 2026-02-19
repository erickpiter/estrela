-- Adiciona coluna para a data agendada da entrega
ALTER TABLE sales_estrela
ADD COLUMN scheduled_date date;

-- Atualiza registros existentes para ter a data de criação como data agendada (opcional, para não ficar null)
UPDATE sales_estrela
SET scheduled_date = created_at::date
WHERE scheduled_date IS NULL;
