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

- Listagem dinâmica de usuários com colunas geradas a partir do JSON retornado
- Pesquisa rápida por usuário, nome, e-mail e centro de custo
- Filtro para exibir somente usuários ativos
- Seleção múltipla com ações em lote para ativar, inativar e excluir
- Detalhe por linha para visualizar e-mail, centro de custo e status
- Estado vazio com mensagem contextual e ação de cadastro inicial
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

## Tema e Tipografia

O projeto usa o padrão de customização recomendado pela PO-UI com tokens CSS globais. O tema é carregado com os arquivos de variáveis e core do PO-UI, permitindo sobrescrever cores, tipografia e estados visuais sem quebrar a base do framework.

As personalizações principais estão centralizadas em `src/styles.scss` e seguem a escala de tipografia da PO-UI para títulos, textos e menus.

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


---

## Boas Práticas Adotadas

- Separação entre camada de apresentação e serviços
- Nomenclatura consistente para componentes, modelos e métodos
- Padrão visual com variáveis de tema (azul claro e azul escuro)
- Validações no frontend para reduzir erros de entrada
- Estrutura pronta para testes unitários e de integração

---

## Referências

**Base utilizada:** Este projeto utilizou como base um CRUD desenvolvido por [Pablo Waniery](https://github.com/pablooficial), com adaptações e melhorias específicas para o contexto de gerenciamento de acesso ao Power-BI.

---

## Autor

Desenvolvido por Viana.
