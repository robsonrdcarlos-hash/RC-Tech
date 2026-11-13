# Prompt 7 — Revisão e Preparação para Produção/Deploy (Adaptado para TI)
Você é um engenheiro de software responsável por revisar e preparar o "RC Tech" para produção.

# OBJETIVO
Garantir que o projeto de gestão de assistência técnica e infraestrutura de TI está correto, seguro e pronto para deploy, independentemente de utilizar IA ou não.


# VERIFICAÇÃO DO PROJETO
Revise todo o projeto e valide:

## 1. Estrutura geral
- todos os arquivos essenciais existem
- não há imports quebrados
- não há erros aparentes de código
- build do projeto (npm run build) está funcionando sem erros

## 2. Integração com Neon e IA
- conexão com o banco Neon estabelecida corretamente
- autenticação (Neon Auth) funcionando nas telas de login/cadastro
- Row Level Security (RLS) respeitado em todas as tabelas (clientes, OS, equipamentos, projetos, visitas)
- operações de leitura, escrita, atualização e exclusão funcionando
-integração com a API do Gemini (Serverless) protegida e funcionando

## 3. Variáveis de ambiente e segurança
Verificar se:

- A GEMINI_API_KEY NÃO está:
- hardcoded no código
- exposta no frontend
- versionada no repositório
- As chaves de banco de dados e autenticação estão seguras no ambiente de servidor/deploy

## 4. Arquivo .env (Desenvolvimento Local)
Verificar se existe:
.env

Exemplo esperado:
- VITE_NEON_AUTH_URL=sua_neon_chave_aqui
- VITE_DATABASE_URL=sua_neon_url
- GEMINI_API_KEY=sua_chave_gemini_no_backend

## 5. .gitignore
Verificar se contém:
Text
.env
node_modules
dist

# PROBLEMAS COMUNS A IDENTIFICAR
- uso de chave de API do Gemini no código do frontend
- .env versionado no GitHub
- falha de conexão com Neon ou políticas de RLS bloqueando consultas legítimas
- dados (como OS ou Equipamentos) não persistindo corretamente
- falha no parsing de JSON da IA
- ausência de tratamento de erro em formulários críticos (abertura de OS e cadastro de clientes)

# DEPLOY — PASSO A PASSO
Se tudo estiver correto, seguir os passos abaixo para subida do projeto:

## Link do repositório
https://github.com/robsonrdcarlos-hash/RC-Tech.git

## 1. Configuração do Git e Commit

- abrir o repositório local
- revisar alterações (git status)
- escrever mensagem de commit
- realizar commit (git add . e git commit -m "feat: finalizacao do sistema techsupport manager")

## Comandos para usar no terminal
Dados do Github / Perfil:
Bash
git config --global user.name "robsonrdcarlos-hash"
git config --global user.email "robson.rdcarlos@gmail.com"

# Autenticar e Enviar ao GitHub:
Abrir o terminal (Ctrl + J) e executar:
Bash
git push -u origin main --force

## IMPORTANTE
- nunca colocar a API Key no código do frontend
- nunca subir .env para o GitHub
- variáveis de ambiente sensíveis devem ser configuradas diretamente no painel da plataforma de hospedagem (Vercel, Netlify, etc.)

# RESULTADO ESPERADO
- sistema online funcionando
- dados persistindo corretamente no Neon (clientes, OS, visitas, equipamentos, projetos)
- nenhuma informação sensível exposta

#NÃO FAZER
- não ignorar erros antes do deploy
- não subir .env
- não expor API Key do Gemini ou do Banco de Dados

# CRITÉRIO DE SUCESSO
- deploy realizado com sucesso
- sistema de atendimento, OS e infraestrutura funcional em produção
- segurança e isolamento de dados garantidos