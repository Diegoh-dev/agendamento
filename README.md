# Agendamento API

API REST para gerenciar agendamentos, com Node.js, TypeScript, Express e MySQL.

## Justificativa

Node.js + TypeScript para tipagem e simplicidade. Express na arquitetura MVC. MySQL para persistir os dados e garantir conflito de horário com constraint única, mesmo sob concorrência.

## Pré-requisitos

- Node.js 20+
- MySQL 8+ rodando localmente

## Setup

1. Crie o banco (ou deixe o migrate criar):

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS agendamento;"
```

2. Configure o `.env`:

```bash
cp .env.example .env
```

Ajuste `DB_USER` e `DB_PASSWORD` com suas credenciais do MySQL.

3. Instale e migrate:

```bash
npm install
npm run db:migrate
```

## Scripts

```bash
npm run dev
npm test
npm run build
npm start
```

## Testando

Com `npm run dev` rodando:

- Front de teste: `http://localhost:3000/`
## Endpoints

Base: `http://localhost:3000/api`

### Health

```bash
GET /api/health
```

### Criar agendamento

```bash
POST /api/appointments
Content-Type: application/json

{
  "patientName": "Ana Silva",
  "doctorName": "Dr. Souza",
  "scheduledAt": "2030-01-15T14:00:00.000Z"
}
```

`scheduledAt` deve estar em ISO 8601 com `Z` ou offset (como `2030-01-15T11:00:00-03:00`). Horários sem fuso são recusados. A resposta sempre devolve o horário em UTC.

### Listar agendamentos

```bash
GET /api/appointments?doctor=Dr.%20Souza&patient=Ana%20Silva&from=2030-01-01T00:00:00.000Z&to=2030-12-31T23:59:59.000Z
```

Filtros opcionais: `doctor`, `patient`, `from`, `to`.

`from` e `to` aceitam só a data (`AAAA-MM-DD`, no horário de Brasília) ou data e hora em ISO 8601 (com `Z` ou offset, como `-03:00`):

- Com os dois preenchidos, o filtro é um intervalo inclusivo. Uma data sem hora vale como 00:00:00.000 em `from` e 23:59:59.999 em `to`.
- Com só um deles preenchido, o filtro vale só para aquele dia (quando é só a data) ou só para aquele instante exato (quando tem hora).

### Cancelar agendamento

```bash
PATCH /api/appointments/:id/cancel
```

## Regras

- Datas inválidas ou no passado → `400`
- Conflito de horário (mesmo médico, mesmo horário, ATIVO) → `409`
- Cancelado libera o horário
- Resposta só com `id`, `patientName`, `doctorName`, `scheduledAt`, `status`

## Concorrência

A coluna gerada `slot_ativo` tem índice `UNIQUE` e só é preenchida quando `status = 'ATIVO'`. O MySQL rejeita dois agendamentos ativos no mesmo médico/horário mesmo em requisições simultâneas.
