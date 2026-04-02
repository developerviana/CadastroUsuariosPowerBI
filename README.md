<div align="center">

# CadastroUsuariosPowerBI

### Gestão de Usuários Habilitados no Power BI

[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular)](https://angular.io/)
[![PO-UI](https://img.shields.io/badge/PO--UI-17-0C69A8)](https://po-ui.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplicacao web para cadastro, consulta, alteracao e remocao de usuarios com acesso ao Power BI, com foco em usabilidade, organizacao do codigo e padrao visual institucional.

[Sobre](#-sobre-o-projeto) •
[Tecnologias](#-tecnologias) •
[Arquitetura](#-arquitetura) •
[Como Executar](#-como-executar) •
[Endpoints Backend](#-endpoints-necessarios-no-backend) •
[Boas Praticas](#-boas-praticas-adotadas)

</div>

---

## Sobre o Projeto

Este projeto implementa uma tela de CRUD para administracao de usuarios habilitados a visualizar conteudos do Power BI.

### Objetivos

- Centralizar o controle de acesso de usuarios
- Facilitar manutencao e auditoria de permissoes
- Padronizar interface com componentes PO-UI
- Preparar frontend para integracao limpa com API backend

### Funcionalidades

- Listagem paginada de usuarios habilitados
- Pesquisa por nome, email e centro de custo
- Cadastro de novo usuario
- Edicao de dados existentes
- Exclusao com confirmacao
- Validacoes de campos obrigatorios e formato de email

---

## Tecnologias

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Angular | 17.x | Estrutura do frontend |
| PO-UI | 17.x | Componentes visuais e UX |
| TypeScript | 5.x | Tipagem e manutenibilidade |
| SCSS | - | Estilizacao e tema institucional |

---

## Arquitetura

Organizacao baseada em separacao de responsabilidades:

```
src/
	app/
		models/       # Contratos tipados (DTOs e modelos)
		services/     # Integracao HTTP e regras de acesso a dados
	components/     # Componentes de tela e UI
```

### Principios aplicados

- Componentes com responsabilidade unica
- Services para isolamento da comunicacao com API
- Modelos fortemente tipados
- Nomes descritivos e padronizados
- Codigo preparado para testes e evolucao incremental

---

## Como Executar

### Pre-requisitos

- Node.js 18+
- npm 9+
- Angular CLI (opcional)

### Instalacao

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run start
```

Aplicacao disponivel em `http://localhost:4200`.

### Build de producao

```bash
npm run build
```

### Testes

```bash
npm run test
```

---

## Endpoints Necessarios no Backend

Sugestao de contrato REST para suportar o CRUD:

### 1. Listar usuarios habilitados

- Metodo: `GET`
- Rota: `/api/power-bi-users`
- Query params: `page`, `pageSize`, `search`, `costCenter`

Resposta esperada:

```json
{
	"items": [
		{
			"id": 1,
			"userCode": "000028",
			"name": "KAMYLA.BORGES",
			"email": "kamyla@climaesociedade.org",
			"costCenterCode": "71100",
			"costCenterName": "E01 - UTSAS",
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

### 2. Buscar usuario por id

- Metodo: `GET`
- Rota: `/api/power-bi-users/{id}`

### 3. Criar usuario habilitado

- Metodo: `POST`
- Rota: `/api/power-bi-users`

Payload sugerido:

```json
{
	"userCode": "000041",
	"name": "TALITA.BISPO",
	"email": "talita.bispo@climaesociedade.org",
	"costCenterCode": "72701",
	"costCenterName": "A CLASSIFICAR",
	"active": true
}
```

### 4. Atualizar usuario habilitado

- Metodo: `PUT`
- Rota: `/api/power-bi-users/{id}`

### 5. Remover usuario habilitado

- Metodo: `DELETE`
- Rota: `/api/power-bi-users/{id}`

### 6. Opcional: consulta de centros de custo

- Metodo: `GET`
- Rota: `/api/cost-centers`
- Uso: popular dropdown/autocomplete de centro de custo

---

## Boas Praticas Adotadas

- Separacao entre camada de apresentacao e servicos
- Nomenclatura consistente para componentes, modelos e metodos
- Padrao visual com variaveis de tema (azul claro e azul escuro)
- Validacoes no frontend para reduzir erros de entrada
- Estrutura pronta para testes unitarios e de integracao

---

## Roadmap

- Integracao com autenticacao e controle de perfil
- Auditoria de alteracoes por usuario
- Exportacao da listagem para CSV
- Filtros avancados por status e area

---

## Licenca

Este projeto esta sob a licenca MIT. Consulte o arquivo [LICENSE](LICENSE).

---

## Autor

Desenvolvido por [developerviana](https://github.com/developerviana).
