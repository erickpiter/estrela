# Plano de Ação - MiniPainel Loja

Este documento detalha o estudo e o plano de execução para a criação do sistema **MiniPainel**, um programa focado exclusivamente na "Página de Login" e "Painel da Loja", derivado do projeto original.

## 1. Visão Geral

O objetivo é isolar a funcionalidade do Painel da Loja em um sistema leve e dedicado. Ele manterá a conexão com o banco de dados Supabase existente, permitindo operações em tempo real de vendas, agendamentos e estoque, mas com uma interface simplificada e focada.

### Escopo Funcional
- **Autenticação Simples**: Login com credenciais fixas (ou via Supabase Auth futuramente).
- **Dashboard Operacional**:
  - Visualização de agendamentos do dia.
  - Controle de No-Shows com sistema de tags.
  - Registro de Vendas (PDV simplificado).
  - Resumo financeiro diário.
  - Alertas de estoque baixo.
  - Ações rápidas.

## 2. Análise Técnica e Dependências

O sistema baseia-se fortemente em componentes React modularizados e no hook de dados `useStorePanelData`.

### Árvore de Dependências Identificada
*   **Página Principal**: `PainelLojaPage.tsx`
*   **Autenticação**: `PainelLojaAuthPage.tsx`
*   **Lógica de Dados (Core)**: `src/hooks/useStorePanelData.ts`
    *   *Dependências*: Supabase Client, Tables (contacts, sales, sales_items, inventory, profiles).
*   **Componentes de Domínio** (`src/components/painel-loja/`):
    *   `TodayAppointments`: Lista agendamentos.
    *   `PendingNoShows`: Gerencia faltas.
    *   `SaleRegistration`: Dashboard de vendas e stats.
    *   `SaleRegistrationModal`: Modal complexo de PDV (carrinho, busca de produtos/clientes).
    *   `DailySummary`: Resumo de KPIs.
    *   `InventoryAlerts`: Monitoramento de estoque.
    *   `QuickActions`: Botões de atalho.
*   **Componentes UI (Shadcn/ui)**:
    *   Card, Button, Badge, Avatar, Dialog, Input, Select, Textarea, Separator, ScrollArea, Toast.
*   **Ícones**: `lucide-react`
*   **Utilitários**: `formatPhoneForWhatsApp`, formatação de moeda.

## 3. Estrutura do Novo Projeto

A estrutura sugerida para a pasta `MiniPainel` segue o padrão Vite + React + TypeScript.

```
MiniPainel/
├── src/
│   ├── components/
│   │   ├── auth/           # PainelLojaAuthPage
│   │   ├── painel/         # Componentes extraídos (TodayAppointments, etc.)
│   │   ├── ui/             # Componentes Shadcn reutilizados
│   │   └── Layout.tsx      # Estrutura base
│   ├── hooks/
│   │   ├── useStorePanelData.ts  # Lógica de negócios
│   │   └── use-toast.ts          # Feedback visual
│   ├── lib/
│   │   ├── utils.ts        # Utilitários CSS e formatação
│   │   └── supabase.ts     # Cliente Supabase (Conexão)
│   ├── pages/
│   │   └── Dashboard.tsx   # Antiga PainelLojaPage
│   ├── App.tsx             # Roteamento (Login vs Dashboard)
│   └── index.css           # Estilos globais (Tailwind)
├── package.json
└── vite.config.ts
```

## 4. Plano de Implementação Passo a Passo

### Fase 1: Setup Inicial
1.  [ ] Inicializar projeto Vite na pasta `MiniPainel`.
2.  [ ] Configurar Tailwind CSS.
3.  [ ] Instalar dependências principais:
    *   `lucide-react`
    *   `@supabase/supabase-js`
    *   `class-variance-authority`, `clsx`, `tailwind-merge` (para utils).
    *   `radix-ui` (primitivos para os componentes shadcn).

### Fase 2: Migração do Core
1.  [ ] **Supabase**: Copiar configuração do cliente Supabase para `src/lib/supabase.ts`. Garantir que as variáveis de ambiente (URL e Key) sejam configuradas.
2.  [ ] **Utils**: Copiar `filters/utils.ts` (ou criar simplificado) para `src/lib/utils.ts`.
3.  [ ] **Hook de Dados**: Migrar `useStorePanelData.ts`.
    *   *Atenção*: Verificar importações de tipos. Pode ser necessário criar um arquivo `types.ts` unificado se os tipos do Supabase (Database types) não forem importados automaticamente.

### Fase 3: Componentes UI (Design System)
1.  [ ] Copiar componentes base necessários da pasta `ui` original para a nova `ui`.
    *   Prioridade: Button, Card, Input, Dialog, Select.

### Fase 4: Funcionalidades
1.  [ ] Implementar `PainelLojaAuthPage`.
2.  [ ] Implementar `SaleRegistrationModal` (PDV).
    *   Este é o componente mais complexo. Requer cuidado com o gerenciamento de estado do carrinho.
3.  [ ] Implementar os Widgets do Dashboard (`TodayAppointments`, `PendingNoShows`, etc.).
4.  [ ] Montar a página principal `Dashboard.tsx`.

### Fase 5: Integração e Testes
1.  [ ] Configurar `App.tsx` para gerenciar o estado de login (`isAuthenticated`).
2.  [ ] Testar fluxo completo: Login -> Visualizar Agendamentos -> Criar Venda -> Verificar atualização de estoque/financeiro.

## 5. Próximos Passos Imediatos
Sugerimos iniciar pela **Fase 1 (Setup)** e **Fase 2 (Migração do Core)** para garantir que a conexão com o banco de dados funcione antes de construir a interface.
