## Prompt 3 — Dashboard principal (Adaptado para TI e Infraestrutura)

Agora vamos criar o dashboard principal do sistema. Essa é a primeira tela que o técnico ou gestor vê após fazer login.

## Layout
- Menu lateral fixo com as opções: Dashboard, Clientes, Ordens de Serviço (OS), Projetos de Infra, Visitas Técnicas, Catálogo/Serviços e Contratos
- Área principal com os cards de informação e atalhos rápidos

## Cards de informação
- O dashboard deve exibir 4 cards principais de métricas:

## Card 1 — Ordens de Serviço (OS) Abertas / Em Andamento
- Exibe o número total de OS com status "Aberta", "Em Análise", "Em Execução" ou "Aguardando Peças" sob responsabilidade da equipe (ou filtrado por técnico logado).

## Card 2 — Visitas Técnicas Hoje
- Exibe a lista de visitas técnicas agendadas para o dia atual, mostrando o horário, nome do cliente e o técnico responsável.
- Cada item da lista deve ser clicável e redirecionar para os detalhes da OS ou Projeto vinculado.

## Card 3 — Projetos de Infraestrutura Ativos
- Exibe o número e uma lista resumida dos projetos (Redes, Wi-Fi, CFTV) que estão com status "Em Execução".

## Card 4 — OS Urgentes / Atrasadas
- Exibe uma lista de Ordens de Serviço com prioridade "Alta/Urgente" ou cuja data de previsão de entrega já expirou e ainda não foram concluídas.
- Cada item da lista deve ser clicável e redirecionar diretamente para a OS correspondente.

## Regras importantes
- Todos os dados devem ser carregados do Neon em tempo real
- Respeitar as políticas de segurança (RLS), exibindo dados filtrados conforme o nível de acesso do usuário logado (ex: técnico comum vê seus chamados, admin vê tudo)
- Se não houver itens em alguma lista (ex: nenhuma visita hoje), exibir uma mensagem amigável correspondente (ex: "Nenhuma visita técnica agendada para hoje")

## Design
- Seguir o mesmo padrão visual da tela de autenticação (tons de azul corporativo/slate e detalhes em verde/azul elétrico)
- Cards com visual limpo, moderno, profissional e com ícones representativos (usar Lucide Icons, ex: Wrench, HardDrive, Calendar, AlertTriangle)
- Menu lateral fixo com logo "RC Tech" no topo