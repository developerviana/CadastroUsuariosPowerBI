<div align="center">

# CadastroUsuariosPowerBI

### Gestão de Usuários Habilitados no Power BI

[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular)](https://angular.io/)
[![PO-UI](https://img.shields.io/badge/PO--UI-17-0C69A8)](https://po-ui.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplicação web para cadastro, consulta, alteração e remoção de usuários com acesso ao Power BI, com foco em usabilidade, organização de código e padrão visual institucional.

[Sobre](#-sobre-o-projeto) •
[Tecnologias](#-tecnologias) •
[Arquitetura](#-arquitetura) •
[Como Executar](#-como-executar) •
[Endpoints Backend](#-endpoints-necessários-no-backend) •
[Boas Práticas](#-boas-práticas-adotadas)

</div>

---

## Sobre o Projeto

Este projeto implementa uma tela de CRUD para administração de usuários habilitados a visualizar conteúdos do Power BI.

### Objetivos

- Centralizar o controle de acesso de usuários
- Facilitar manutenção e auditoria de permissões
- Padronizar interface com componentes PO-UI
- Preparar o frontend para integração limpa com a API de backend

### Funcionalidades

- Listagem paginada de usuários habilitados
- Pesquisa por nome, e-mail e centro de custo
- Cadastro de novo usuário
- Edição de dados existentes
- Exclusão com confirmação
- Validações de campos obrigatórios e formato de e-mail

---

## Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| Angular | 17.x | Estrutura do frontend |
| PO-UI | 17.x | Componentes visuais e UX |
| TypeScript | 5.x | Tipagem e manutenibilidade |
| SCSS | - | Estilização e tema institucional |

---

## Arquitetura

Organização baseada em separação de responsabilidades:

```
src/
	app/
		models/       # Contratos tipados (DTOs e modelos)
		services/     # Integração HTTP e regras de acesso a dados
	components/     # Componentes de tela e UI
```

### Princípios aplicados

- Componentes com responsabilidade única
- Services para isolamento da comunicação com a API
- Modelos fortemente tipados
- Nomes descritivos e padronizados
- Código preparado para testes e evolução incremental

---

## Como Executar

### Pre-requisitos

- Node.js 18+
- npm 9+
- Angular CLI (opcional)

### Instalação

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run start
```

Aplicação disponível em `http://localhost:4200`.

### Build de produção

```bash
npm run build
```

### Testes

```bash
npm run test
```

---

## Endpoints Necessários no Backend

Sugestão de contrato REST para suportar o CRUD:

### 1. Listar usuários habilitados

- Método: `GET`
- Rota: `/api/power-bi-users`
- Query params: `page`, `pageSize`, `search`, `costCenter`

Resposta esperada:

```json
{
	"items": [
		{
			"id": 1,
			"userCode": "USR-001",
			"name": "ANA EXEMPLO",
			"email": "ana.exemplo@organizacao-ficticia.org",
			"costCenterCode": "CC-1001",
			"costCenterName": "CENTRO DE CUSTO A",
			"active": true,
			"createdAt": "2026-04-02T12:00:00Z",
			"updatedAt": "2026-04-02T12:00:00Z"
		}
	],
	"page": 1,
	"pageSize": 10,
	"total": 1,
	"hasNext": false
}
```

### 2. Buscar usuário por id

- Método: `GET`
- Rota: `/api/power-bi-users/{id}`

### 3. Criar usuário habilitado

- Método: `POST`
- Rota: `/api/power-bi-users`

Payload sugerido:

```json
{
	"userCode": "USR-002",
	"name": "BRUNO DEMO",
	"email": "bruno.demo@organizacao-ficticia.org",
	"costCenterCode": "CC-2002",
	"costCenterName": "CENTRO DE CUSTO B",
	"active": true
}
```

### 4. Atualizar usuário habilitado

- Método: `PUT`
- Rota: `/api/power-bi-users/{id}`

### 5. Remover usuário habilitado

- Método: `DELETE`
- Rota: `/api/power-bi-users/{id}`

### 6. Opcional: consulta de centros de custo

- Método: `GET`
- Rota: `/api/cost-centers`
- Uso: popular dropdown/autocomplete de centro de custo

---

## Boas Práticas Adotadas

- Separação entre camada de apresentação e serviços
- Nomenclatura consistente para componentes, modelos e métodos
- Padrão visual com variáveis de tema (azul claro e azul escuro)
- Validações no frontend para reduzir erros de entrada
- Estrutura pronta para testes unitários e de integração

---

## Autor

Desenvolvido por Viana.
