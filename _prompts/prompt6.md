# Prompt 6 — Geração Automatizada de Laudos Técnicos / Escopos de Projetos via IA (Adaptado para TI)
Você é um desenvolvedor full-stack sênior especializado em React, Neon e integração de LLMs. Sua tarefa é implementar a funcionalidade completa de geração automatizada de laudos técnicos de assistência ou escopos de projetos de infraestrutura via IA dentro do sistema "RC Tech".

# STACK
- React (Vite)
- Neon (PostgreSQL)
- Google Gen AI SDK (@google/generative-ai) -> Modelo: gemini-2.5-flash ou superior

# OBJETIVO
Permitir que o técnico ou gestor clique em um botão para acionar uma inteligência artificial que lê o histórico do equipamento, o problema relatado pelo cliente (ou o escopo preliminar de uma rede/CFTV) e gera um Laudo Técnico Estruturado ou um Escopo Detalhado de Projeto em formato JSON. O resultado deve ser exibido em uma interface interativa e totalmente editável antes de ser persistido no banco de dados na respectiva OS ou Projeto.

# SERVERLESS FUNCTION: /api/gerar-laudo-ou-escopo
Crie a função server-side garantindo segurança absoluta e tratamento de erros.

### Responsabilidades Técnicas:
1. **Segurança: A GEMINI_API_KEY deve ser consumida estritamente via variável de ambiente no backend. Nunca vaze chaves para o cliente.
2. **Uso do SDK: Utilize a versão recente do SDK oficial da Google (@google/generative-ai).
3. **Structured Outputs (Crucial): Para garantir 100% de certeza que o Gemini retornará um JSON válido sem quebras de texto ou markdown, configure a chamada utilizando o parâmetro responseMimeType: "application/json".
4. **Prompt Interno da IA: O prompt enviado ao Gemini deve ser o seguinte:

Você é um Engenheiro de Computação e Técnico Sênior em Infraestrutura de TI e Suporte de Bancada.
Gere um laudo técnico detalhado e profissional ou um escopo de projeto de infraestrutura com base nos dados fornecidos abaixo.

Dados do Cliente / Equipamento / Problema ou Demanda:
{dados_do_contexto}

# Regras Críticas de Execução:
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como ```json ... ```), explicações, introduções ou textos complementares.
- Seja técnico, preciso e utilize terminologias corretas do mercado de TI brasileiro (ex: crimpagem, patch panel, VLAN, SSD NVMe, loop de rede, etc.).
- Estruture o texto de forma limpa e objetiva para que possa ser lido diretamente pelo cliente final ou pela equipe.

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "diagnostico_tecnico": "Texto detalhado do diagnóstico ou análise técnica realizada.",
  "servicos_recomendados": [
    "Passo 1 do procedimento técnico ou serviço a ser executado",
    "Passo 2 do procedimento técnico ou serviço a ser executado",
    "Passo 3 do procedimento técnico ou serviço a ser executado"
  ],
  "materiais_ou_pecas_sugeridas": [
    "Item 1 (ex: Cabo UPT Cat6 Furukawa - 20 metros)",
    "Item 2 (ex: Conector RJ45 Macho Cat6 - 10 unidades)"
  ],
  "termos_garantia": "Recomendações e termos de garantia aplicáveis ao serviço (ex: 90 dias para mão de obra e peças substituídas)."
}

# FLUXO DO FRONTEND & COMPORTAMENTO DA INTERFACE
1. **Ponto de Partida: Dentro da tela de uma Ordem de Serviço (OS) ou Projeto de Infraestrutura.
2. **Ação: Um botão em destaque "✨ Gerar Laudo/Escopo com IA". Ao clicar:
  - Dispara um Loading visual com mensagens dinâmicas (ex: "Analisando histórico do equipamento...", "IA gerando laudo técnico...").
  - O botão fica desabilitado para evitar cliques duplos.
3. **Retorno da API: O JSON recebido alimenta o estado do formulário React.
4. **Interface de Edição: Exiba o conteúdo gerado em campos de texto e listas editáveis, permitindo que o técnico ajuste qualquer laudo, peça ou serviço antes de aprovar.
5. **Ajuste Manual: O técnico pode alterar livremente qualquer informação caso queira complementar com um detalhe específico.
6. **Persistência: O botão "Salvar Laudo/Documento" atualiza a OS ou o Projeto correspondente no Neon e registra o histórico de interações.

# TRATAMENTO DE ERROS E RESILIÊNCIA
- Se a API do Gemini falhar ou estourar o tempo limite (Timeout), exiba um Toast amigável: "Não foi possível gerar a sugestão com IA no momento. Deseja preencher os campos manualmente?".
- Adicione uma validação com try/catch ao tentar dar JSON.parse() na resposta da IA para evitar crash no sistema caso ocorra alguma anomalia no texto.

# NÃO FAZER
- Não faça chamadas diretas para a API do Gemini a partir do código do lado do cliente (frontend).
- Não hardcodeie a estrutura de dados em inglês se a exibição final para o usuário é em português.
- Não substitua dados manuais importantes inseridos pelo técnico sem a confirmação dele na interface.

#ENTREGÁVEIS DESEJADOS
1. Código completo da Serverless Function (/api/gerar-laudo-ou-escopo) configurada para o Gemini.
2. Componente React com gerenciamento de estado (Loading, Dados do Laudo/Escopo, Botão de Disparo e Edição na OS).