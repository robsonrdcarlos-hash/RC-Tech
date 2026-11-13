### Prompt 4 — Cadastro e listagem de clientes (Adaptado para TI e Infraestrutura)
Agora vamos criar a tela de clientes do sistema. Ela é composta por duas partes: a listagem de clientes e o formulário de cadastro.

### Tela de listagem de clientes
- Exibir todos os clientes cadastrados (filtrados pelas permissões do usuário logado)
- Cada card/linha de cliente exibe: Nome/Razão Social, Tipo (PF ou PJ), Telefone/WhatsApp e Cidade/Estado
- Campo de busca por nome, razão social ou documento (CPF/CNPJ) no topo da listagem
- Botão "Novo Cliente" que redireciona para o formulário de cadastro
- Cada cliente da lista deve ser clicável e redirecionar para a página de detalhes/perfil do cliente
- Se não houver clientes cadastrados, exibir a mensagem "Nenhum cliente cadastrado ainda"

### Formulário de cadastro — página nova
O formulário deve ser organizado em 3 abas: Dados Gerais, Endereço e Informações de TI.

### Aba 1 — Dados Gerais
- Tipo de Cliente (Seleção única: Pessoa Física / PF ou Pessoa Jurídica / PJ)
- Nome / Razão Social (Texto, obrigatório)
- Nome Fantasia (Texto, opcional — útil para PJ)
- CPF ou CNPJ (Texto, com máscara de formatação, obrigatório/único)
- Nome do Contato Responsável (Texto — ex: "Falar com o Carlos do Financeiro/TI", útil para PJ)
- Telefone Principal (Texto, com máscara)
- WhatsApp (Texto, com máscara)
- E-mail Principal (Texto, formato e-mail)

### Aba 2 — Endereço (Essencial para Visitas Técnicas e Projetos de Campo)
- CEP (Texto, com busca automática de endereço se possível)
- Endereço (Rua, Avenida, etc.)
- Número
- Complemento (Sala, Bloco, Andar)
- Bairro
- Cidade
- Estado

### Aba 3 — Informações de TI e Observações
- Técnico Responsável pela Conta (Seleção única listando os técnicos cadastrados)
- Observações gerais sobre o cliente (Texto livre — ex: "Empresa possui alarme monitorado", "Chave com o zelador", etc.)
- Infraestrutura atual resumida (Texto livre — ex: "Rede estruturada Cat6, Servidor Windows Server 2019, 10 estações Windows 11")

### Regras importantes
- Os campos obrigatórios são: Tipo de Cliente, Nome/Razão Social e CPF/CNPJ
- Ao salvar, vincular o cliente ao sistema (e opcionalmente ao técnico responsável)
- Após salvar, redirecionar para o perfil do cliente recém cadastrado
- Exibir mensagem de sucesso ao salvar

### Design
- Seguir o mesmo padrão visual do sistema (tons de azul corporativo/slate e detalhes modernos)
- Menu lateral fixo mantido na tela de listagem e no formulário
- Abas limpas e organizadas para facilitar o preenchimento rápido em atendimento telefônico ou balcão