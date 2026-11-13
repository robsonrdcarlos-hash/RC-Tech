# Prompt 5 — Perfil do Cliente + Ordens de Serviço e Equipamentos (Adaptado para TI)

Agora vamos criar a página de perfil do cliente. Essa tela é acessada ao clicar em um cliente na listagem ou nos cards do dashboard.

## Layout geral
A página deve ser organizada em abas ou seções claras: Dados do Cliente, Equipamentos, Ordens de Serviço (OS) e Projetos de Infraestrutura.

## Seção 1 — Dados do Cliente
- Exibir todos os dados cadastrados do cliente organizados nas mesmas 3 abas do cadastro: Dados Gerais, Endereço e Informações de TI.
- Os campos devem ser editáveis diretamente na página.
- Botão "Salvar alterações" para confirmar as edições.
- Exibir mensagem de sucesso ao salvar.

## Seção 2 — Equipamentos do Cliente
- Para gerenciar os notebooks, desktops, servidores ou impressoras que pertencem a este cliente.
- Lista de equipamentos cadastrados para este cliente (Marca, Modelo, Tipo, Número de Série / Patrimônio).
- Botão "Adicionar Equipamento" que abre um modal rápido com os campos:
- Tipo de Equipamento (Notebook, Desktop, Servidor, Impressora, No-break, Outro)
- Marca e Modelo
- Número de Série / Patrimônio
- Especificações (Ex: Core i5, 8GB RAM, SSD 240GB)
- Observações do estado geral
- Botão "Salvar Equipamento".
- Ao salvar, atualizar a lista automaticamente.

## Seção 3 — Ordens de Serviço (OS) e Chamados
- Histórico de todas as Ordens de Serviço vinculadas a este cliente em ordem cronológica decrescente (mais recente primeiro), exibindo: Número da OS, Tipo de Serviço, Técnico Responsável, Status, Prioridade e Valor Total.
- Botão "Nova Ordem de Serviço" que abre um modal ou redireciona para o formulário de abertura de OS preenchendo o cliente automaticamente:
- Seleção de Equipamento (vinculado ao cliente, se houver)
- Tipo de Serviço ('Assistência de Bancada', 'Suporte Técnico Externo', 'Instalação Avulsa')
- Relato do problema (texto obrigatório)
- Prioridade ('Baixa', 'Média', 'Alta', 'Urgente')
- Técnico responsável
- Botão "Abrir OS"
- Ao clicar em uma OS da lista, abrir os detalhes para acompanhamento, laudo técnico e fechamento.
- Se não houver OS registradas, exibir a mensagem "Nenhuma Ordem de Serviço registrada para este cliente ainda".

## Seção 4 — Projetos de Infraestrutura e Contratos
- Botão "Novo Projeto de Infraestrutura" bem visível (para Redes, Wi-Fi, CFTV).
- Histórico de projetos e contratos recorrentes vinculados ao cliente (Ex: "Rede Wi-Fi Corporativa", "Contrato de Manutenção Mensal"), exibindo Título, Tipo, Status e Data.
- Se não houver projetos ou contratos salvos, exibir a mensagem "Nenhum projeto ou contrato registrado para este cliente ainda".

## Regras importantes
- Todos os dados devem ser carregados do Neon em tempo real.
- Todas as alterações e novos cadastros devem ser salvos no Neon.
- A funcionalidade completa de edição detalhada dos projetos pode ser aberta em modal ou nova tela.

## Design
- Seguir o mesmo padrão visual do sistema (tons de azul corporativo/slate e detalhes modernos).
- Menu lateral fixo mantido.
- Interface limpa com separação clara entre Equipamentos, Chamados (OS) e Projetos de Infra.