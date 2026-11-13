# Prompt 2 — Autenticação (Adaptado para TI e Infraestrutura)

Vamos criar a autenticação do sistema. O sistema deve permitir que um técnico ou administrador crie uma conta e faça login. Use o Neon Auth que já está configurado no projeto "RC Tech".

## Tela de Login
- Campo de email
- Campo de senha
- Botão "Entrar"
- Link "Não tem conta? Cadastre-se"

## Tela de Cadastro
- Campo de nome completo
- Campo de email
- Campo de senha
- Campo de confirmar senha
- Botão "Criar conta"
- Link "Já tem conta? Faça login"

## Regras importantes
- Após o cadastro, salvar o nome, email e nível de acesso inicial do usuário na tabela `tecnicos` do Neon
- Após o login bem sucedido, redirecionar para o dashboard principal
- Se o login falhar, exibir mensagem de erro clara e amigável (ex: "Credenciais inválidas. Verifique seu e-mail e senha.")
- A senha deve ter no mínimo 9 caracteres
- Manter a sessão ativa para que o usuário não precise fazer login toda vez que abrir o sistema
- Se já estiver logado e tentar acessar a tela de login, redirecionar direto para o dashboard

## Stack
- React + Vite
- Typescript
- Tailwind CSS
- Shadcn/UI
- Neon Auth

## Design
- Visual limpo, moderno, corporativo e com pegada tecnológica
- Cores predominantes azul escuro/slate (tecnologia, confiança) e detalhes em verde ou azul elétrico (destaques/status), remetendo ao setor de TI e infraestrutura
- Logotipo com o texto "RC Tech" no topo de ambas as telas