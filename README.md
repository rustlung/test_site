# Résidé Prestige

Веб-сайт для приёма заявок от клиентов элитной недвижимости.

---

## Архитектура

```
                    ┌─────────────────────────────────────────────────┐
                    │                    NGINX (80)                    │
                    │  - /           → frontend (SPA)                  │
                    │  - /api/       → backend (FastAPI)               │
                    │  - /api/openapi.json → Swagger                   │
                    │  - /pgadmin/   → pgadmin                         │
                    │  - /v2/        → Docker Registry                 │
                    └─────────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │    Frontend     │         │    Backend      │         │   PostgreSQL    │
    │  React + Nginx  │         │  FastAPI +      │         │    (5432)       │
    │   (port 80)     │         │  Uvicorn (8000) │────────▶│                 │
    └─────────────────┘         └─────────────────┘         └─────────────────┘
              │                           │
              │                           │
              └───────────────────────────┘
                    API: /api/leads/, /api/services/, /api/behavior/
```

- **Nginx** — обратный прокси, раздаёт статику (frontend) и проксирует API на backend.
- **Frontend** — React SPA, собирается в nginx:alpine.
- **Backend** — FastAPI, SQLAlchemy, PostgreSQL.
- **PostgreSQL** — хранение данных.
- **pgAdmin** — админка для БД.
- **Registry** — Docker registry (для деплоя через Watchtower).

---

## Структура папок

```
test_site/
├── backend/                 # FastAPI API
│   ├── app/
│   │   ├── core/
│   │   │   └── database.py  # Подключение к PostgreSQL
│   │   ├── models/
│   │   │   └── models.py    # Lead, LeadBehavior, Service + CRUD
│   │   ├── routes/
│   │   │   ├── leads.py     # POST/GET заявок
│   │   │   ├── behavior.py  # GET поведения по lead_id
│   │   │   └── services.py  # CRUD услуг
│   │   └── main.py          # FastAPI app, CORS, lifespan
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React SPA
│   ├── src/
│   │   ├── App.jsx          # Форма заявки
│   │   ├── hooks/
│   │   │   └── useBehaviorTracking.js
│   │   └── styles/
│   ├── public/
│   ├── Dockerfile           # Multi-stage: node build → nginx
│   ├── package.json
│   └── webpack.config.js
├── infra/                   # Docker-инфраструктура
│   ├── docker-compose.yml
│   ├── .env                 # Переменные окружения (не в git)
│   └── nginx/
│       └── nginx.conf
└── README.md
```

---

## Стек технологий

| Компонент | Технология |
|-----------|------------|
| Frontend | React 18, Webpack, Babel |
| Backend | FastAPI, SQLAlchemy 2, Pydantic |
| БД | PostgreSQL 16 |
| Инфра | Docker, Docker Compose, Nginx |
| Деплой | Watchtower, Docker Registry |

---

## Запуск локально

1. Создай `infra/.env` (см. раздел «Переменные окружения» ниже).

2. Запусти всё:
   ```bash
   cd infra
   docker compose up --build
   ```

3. Открой в браузере:
   - Сайт: http://localhost
   - Swagger: http://localhost/api/docs
   - PGAdmin: http://localhost/pgadmin/

---

## Деплой на сервер

1. Клонируй репозиторий на сервер:
   ```bash
   git clone <repo-url> test_site
   cd test_site
   ```

2. Создай `infra/.env` с актуальными значениями.

3. Запусти:
   ```bash
   cd infra
   docker compose up -d --build
   ```

4. Обновление после `git push`:
   - При использовании Watchtower + Registry контейнеры обновляются автоматически.
   - Иначе на сервере: `git pull && cd infra && docker compose up -d --build`.

---

## API эндпоинты

Базовый URL: `/api` (через nginx).

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/` | Health-check: `{"status": "ok"}` |
| **Leads** | | |
| POST | `/leads/` | Создать заявку (lead + behavior в теле) |
| GET | `/leads/` | Список заявок |
| GET | `/leads/{id}` | Одна заявка по id |
| **Behavior** | | |
| GET | `/behavior/{lead_id}` | Поведение пользователя по lead_id |
| **Services** | | |
| GET | `/services/` | Список активных услуг |
| POST | `/services/` | Создать услугу |
| PUT | `/services/{id}` | Обновить услугу |
| DELETE | `/services/{id}` | Удалить услугу |

### POST /api/leads/

```json
{
  "lead": {
    "first_name": "string",
    "last_name": "string",
    "patronymic": "string",
    "business_info": "string",
    "business_niche": "string",
    "company_size": "string",
    "task_volume": "string",
    "role": "string",
    "budget": "string",
    "task_type": "string",
    "interested_product": "string",
    "deadline": "string",
    "contact_method": "string",
    "contact_value": "string | null",
    "convenient_time": "string",
    "comment": "string | null"
  },
  "behavior": {
    "time_on_page": 0,
    "clicks": null,
    "hovers": null,
    "return_count": 0,
    "raw_data": null
  }
}
```

---

## Переменные окружения (.env)

Файл `infra/.env` (не коммитится в git):

```env
# PostgreSQL
POSTGRES_DB=resideprestige
POSTGRES_USER=admin
POSTGRES_PASSWORD=<пароль>

# PGAdmin
PGADMIN_EMAIL=admin@resideprestige.ru
PGADMIN_PASSWORD=<пароль>

# Backend (DATABASE_URL для SQLAlchemy)
DATABASE_URL=postgresql://admin:<пароль>@postgres:5432/resideprestige
```

---

## Git commit (initial)

For the first commit that adds backend, frontend, and full stack to the repo that previously had only `infra/`:

```
Add full-stack Résidé Prestige: backend, frontend, README

- Backend: FastAPI + SQLAlchemy + PostgreSQL (leads, services, behavior)
- Frontend: React SPA with lead form and behavior tracking
- Docker Compose: nginx, backend, frontend, postgres, pgadmin, registry
- README: architecture, API docs, env vars, run/deploy instructions
```
