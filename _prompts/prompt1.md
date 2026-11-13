# Prompt 1 — Base do projeto + Neon completo

Você vai criar o banco de dados para um sistema de gestão para uma empresa de tecnologia focada em assistência técnica, projetos de infraestrutura de redes, Wi-Fi, CFTV, serviços avulsos e atendimento via visita técnica. Você tem acesso ao Neon via MCP e o projeto já foi criado com o nome de "RC Tech". Então pode e deve criar toda a estrutura diretamente via MCP, sem necessidade de copiar SQL manualmente.
Crie as seguintes tabelas com todos os campos abaixo:

## Tabela ‘tecnicos’
- id (uuid, primary key, gerado automaticamente)
- nome (text, not null)
- email (text, not null, unique)
- nivel_acesso (text, not null) -- Ex: 'admin', 'tecnico_campo', 'suporte_n1'
- created_at (timestamp, gerado automaticamente)

## Tabela ‘clientes’
- id (uuid, primary key, gerado automaticamente)
- tecnico_responsavel_id (uuid, foreign key → tecnicos.id, nullable)
- tipo_cliente (text, not null) -- 'PF' (Pessoa Física) ou 'PJ' (Pessoa Jurídica)
- nome_fantasia_ou_razao (text, not null)
- documento (text, not null, unique) -- CPF ou CNPJ
- contato_responsavel (text)
- telefone (text)
- whatsapp (text)
- email (text)
- endereco (text)
- cidade (text)
- estado (text)
- cep (text)
- observacoes (text)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘tabela_servicos_padrao’ (Catálogo de Serviços, Mão de Obra e Deslocamento)
Usada para padronizar preços de serviços (ex: formatação, ponto de rede, ponto de CFTV) e taxas de visita/deslocamento.
- id (uuid, primary key, gerado automaticamente)
- categoria (text, not null) -- Ex: 'Assistência de Bancada', 'Infraestrutura e Redes', 'CFTV', 'Deslocamento / Visita'
- nome_servico (text, not null) -- Ex: 'Taxa de Visita Técnica (Até X km)', 'Ponto de Rede (Cabeamento/Crimpagem)', 'Ponto de Câmera CFTV', 'Instalação de Memória RAM/SSD'
- unidade_medida (text, not null) -- Ex: 'Unidade', 'Ponto', 'Hora', 'Visita', 'Km'
- valor_sugerido (numeric, not null)
- descricao (text)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘equipamentos_cliente’ (Para equipamentos em assistência)
- id (uuid, primary key, gerado automaticamente)
- cliente_id (uuid, foreign key → clientes.id, not null)
- tipo_equipamento (text, not null) -- Ex: 'Notebook', 'Desktop', 'Servidor', 'Impressora', 'No-break'
- marca (text)
- modelo (text)
- numero_serie (text, unique)
- patrimonio (text)
- especificacoes (text)
- observacoes_estado_geral (text)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘projetos_infraestrutura’ (Para redes, Wi-Fi e CFTV)
- id (uuid, primary key, gerado automaticamente)
- cliente_id (uuid, foreign key → clientes.id, not null)
- titulo_projeto (text, not null) -- Ex: 'Instalação de Rede Wi-Fi Corporativa'
- tipo_projeto (text, not null) -- Ex: 'Rede Local', 'Rede Wi-Fi', 'CFTV', 'Misto'
- status (text, not null) -- 'Orçamento', 'Aprovado', 'Em Execução', 'Concluído', 'Cancelado'
- responsavel_tecnico_id (uuid, foreign key → tecnicos.id)
- data_inicio_prevista (date)
- data_conclusao (date)
- observacoes_projeto (text)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘ordens_servico’ (OS de Bancada ou Chamados de Suporte)
- id (uuid, primary key, gerado automaticamente)
- numero_os (serial, unique)
- cliente_id (uuid, foreign key → clientes.id, not null)
- equipamento_id (uuid, foreign key → equipamentos_cliente.id, nullable)
- projeto_id (uuid, foreign key → projetos_infraestrutura.id, nullable)
- tecnico_id (uuid, foreign key → tecnicos.id)
- tipo_servico (text, not null) -- 'Assistência de Bancada', 'Suporte Técnico Externo (Visita)', 'Instalação Avulsa'
- status (text, not null) -- 'Aberta', 'Em Análise', 'Aguardando Aprovação', 'Em Execução', 'Aguardando Peças', 'Concluída', 'Cancelada'
- prioridade (text) -- 'Baixa', 'Média', 'Alta', 'Urgente'
- relato_problema (text, not null)
- diagnostico_tecnico (text)
- servicos_executados (text)
- pecas_utilizadas (text array)
- valor_pecas (numeric)
- valor_servicos (numeric)
- valor_deslocamento (numeric, default 0) -- Valor cobrado pela visita/deslocamento nesta OS
- valor_total (numeric)
- data_abertura (timestamp, not null, gerado automaticamente)
- data_previsao (timestamp)
- data_fechamento (timestamp)
- termos_garantia (text)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘visitas_tecnicas’ (Agenda e Controle de Visitas / Deslocamentos)
Permite registrar agendamentos de visitas ao cliente, qual técnico vai, controle de quilometragem e se a visita gerou OS ou faz parte de um projeto.
- id (uuid, primary key, gerado automaticamente)
- cliente_id (uuid, foreign key → clientes.id, not null)
- tecnico_id (uuid, foreign key → tecnicos.id, not null)
- ordem_servico_id (uuid, foreign key → ordens_servico.id, nullable)
- projeto_id (uuid, foreign key → projetos_infraestrutura.id, nullable)
- data_agendamento (timestamp, not null)
- status_visita (text, not null) -- 'Agendada', 'A Caminho', 'Realizada', 'Cancelada', 'Reagendada'
- motivo_visita (text, not null) -- Ex: 'Orçamento de CFTV', 'Suporte Corretivo Externo', 'Execução de Ponto de Rede'
- relatorio_visita (text) -- O que o técnico constatou/fez no local
- km_rodado (numeric) -- Quilometragem percorrida para cálculo de reembolso ou taxa
- valor_cobranca_visita (numeric, default 0) -- Quanto foi cobrado do cliente pela visita/deslocamento
- created_at (timestamp, gerado automaticamente)

## Tabela ‘itens_os_ou_projeto’ (Detalhamento de serviços, peças e pontos)
- id (uuid, primary key, gerado automaticamente)
- ordem_servico_id (uuid, foreign key → ordens_servico.id, nullable)
- projeto_id (uuid, foreign key → projetos_infraestrutura.id, nullable)
- servico_catalogo_id (uuid, foreign key → tabela_servicos_padrao.id)
- quantidade (numeric, not null, default 1) -- Ex: 4 câmeras instaladas, 10 pontos de rede crimpados
- valor_unitario (numeric, not null)
- valor_total_item (numeric, not null)
- created_at (timestamp, gerado automaticamente)

## Tabela ‘contratos_manutencao_recorrente’
- id (uuid, primary key, gerado automaticamente)
- cliente_id (uuid, foreign key → clientes.id, not null)
- titulo_contrato (text, not null) -- Ex: 'Contrato Mensal de Suporte e Manutenção Preventiva'
- escopo_servicos (jsonb)
- sla_horas (integer)
- valor_mensal (numeric)
- data_inicio (date)
- data_fim (date)
- status_contrato (text) -- 'Ativo', 'Suspenso', 'Encerrado'
- created_at (timestamp, gerado automaticamente)

Após criar todas as tabelas e relacionamentos, ative o Row Level Security (RLS) em todas as tabelas para garantir a segurança dos dados e configure as policies necessárias. Neon Auth está habilitado no banco.
Por fim, confirme que tudo foi criado corretamente listando as tabelas e seus campos.



