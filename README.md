<div align="center">

# CadastroUsuariosPowerBI

### Gestão de Usuários Habilitados no Power BI no Protheus

[![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular)](https://angular.io/)
[![PO-UI](https://img.shields.io/badge/PO--UI-17-0C69A8)](https://po-ui.io/)
[![Protheus-lib-core](https://img.shields.io/badge/protheus--lib--core-17.3.4-8B5CF6)](https://tdn.totvs.com.br/display/public/framework/Protheus-lib-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript)](https://www.typescriptlang.org/)

[Visão Geral](#visao-geral) •
[Tecnologias](#tecnologias) •
[Funcionalidades](#funcionalidades) •
[Integração Protheus](#integracao-protheus-lib-core) •
[Execução](#como-executar) •
[Estrutura](#estrutura-do-projeto)

</div>

---

## Visao Geral

Aplicação Angular + PO-UI para administrar usuários com acesso ao Power BI, com foco em operação dentro do Protheus via FWCallApp.

O projeto foi evoluído para usar Protheus-lib-core como base de integração com contexto de sessão, identidade do usuário e fechamento nativo da rotina.

---

## Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|------------|
| Angular | 17.x | Estrutura do frontend |
| PO-UI | 17.x | Componentes visuais e UX |
| Protheus-lib-core | 17.3.4 | Integração nativa com Protheus |
| TypeScript | 5.x | Tipagem e manutenibilidade |
| SCSS | - | Estilização e responsividade |

---

## Funcionalidades

- Listagem de usuários com dados de código, nome, e-mail, centro de custo e status.
- Busca por múltiplos campos (usuário, nome, e-mail e centro de custo).
- Filtro para exibir somente ativos.
- Cadastro e edição de usuário.
- Seleção múltipla com atualização de status em lote (ativar/inativar).
- Autocomplete para usuário e centro de custo.
- Exibição de contexto no layout: usuário, login, empresa, filial e módulo.
- Ação de "Sair da rotina" integrada ao fechamento nativo do Protheus.

---

## Integracao Protheus-lib-core

Dependência utilizada:

- @totvs/protheus-lib-core: 17.3.4

Pontos aplicados no projeto:

- `ProtheusLibCoreModule` registrado no bootstrap da aplicação.
- `ProAppConfigService` para detectar execução dentro do Protheus (`insideProtheus`) e fechar app com `callAppClose`.
- `ProThreadInfoService` para obter identidade do usuário da thread.
- `ProSessionInfoService` para carregar empresa, filial e módulo no layout.

Comportamento de autenticação HTTP:

- Dentro do Protheus: requisições sem Basic manual (fluxo nativo/interceptadores).
- Fora do Protheus (desenvolvimento local): fallback para Basic Auth no service.

---

## Como Executar

### Pre-requisitos

- Node.js 18+
- npm 9+

### Instalar dependências

```bash
npm install
```

### Rodar em desenvolvimento

```bash
npm run start
```

Aplicação local: http://localhost:4200

### Build

```bash
npm run build
```

---

## Estrutura do Projeto

```text
src/
	app/
		models/        # contratos tipados
		services/      # integração HTTP e regras de acesso
		app.component* # menu, contexto de sessão e identidade
		app.config.ts  # providers globais (PO-UI e Protheus-lib-core)
	components/
		user-access/   # tela principal de gestão de usuários
backend/
	controller/      # endpoints REST TLPP
	service/         # regras de negócio TLPP
```

---

## Observacoes

- O backend usa `recno` como identificador técnico de atualização de registro.
- O status segue regra de negócio: ativo = `2`, inativo = `1`.
- A experiência ideal de autenticação/contexto é obtida quando o app roda embarcado no Protheus.

---

## Referencias

- Documentação oficial: https://tdn.totvs.com.br/display/public/framework/Protheus-lib-core
- PO-UI: https://po-ui.io/
- Base utilizada: CRUD de [Pablo Waniery](https://github.com/pablooficial), adaptado para o cenário deste projeto.
