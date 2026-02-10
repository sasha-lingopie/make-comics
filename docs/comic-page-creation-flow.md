# Процес створення сторінки коміксу

Цей документ описує повний процес створення сторінки коміксу в додатку MakeComics — від введення промпту користувачем до збереження фінального зображення.

---

## Зміст

1. [Огляд архітектури](#1-огляд-архітектури)
2. [Створення першої сторінки (нова історія)](#2-створення-першої-сторінки-нова-історія)
3. [Додавання наступних сторінок](#3-додавання-наступних-сторінок)
4. [Перемальовування сторінки (Redraw)](#4-перемальовування-сторінки-redraw)
5. [Побудова промпту](#5-побудова-промпту)
6. [Генерація зображення](#6-генерація-зображення)
7. [Збереження результату](#7-збереження-результату)
8. [Схема бази даних](#8-схема-бази-даних)
9. [Конфігурація моделей та стилів](#9-конфігурація-моделей-та-стилів)

---

## 1. Огляд архітектури

```
Користувач (Browser)
    │
    ├── Landing Page (app/page.tsx)
    │     └── ComicCreationForm → POST /api/generate-comic
    │
    └── Story Editor (app/story/[storySlug]/story-editor-client.tsx)
          ├── GeneratePageModal → POST /api/add-page
          └── Redraw → POST /api/add-page (з pageId)
```

**Ключові компоненти:**

| Шар | Файл | Опис |
|-----|-------|------|
| UI (Landing) | `components/landing/comic-creation-form.tsx` | Форма створення першої сторінки |
| UI (Editor) | `components/editor/generate-page-modal.tsx` | Модалка генерації нових сторінок |
| UI (Editor) | `app/story/[storySlug]/story-editor-client.tsx` | Клієнтський редактор історії |
| API | `app/api/generate-comic/route.ts` | Створення нової історії + першої сторінки |
| API | `app/api/add-page/route.ts` | Додавання/перемальовування сторінок |
| Prompt | `lib/prompt.ts` | Побудова системного промпту |
| DB | `lib/db-actions.ts` | CRUD операції з БД |
| Storage | `lib/s3-upload.ts` | Завантаження зображень в S3 |
| Config | `lib/constants.ts` | Стилі, моделі, лейаути |

---

## 2. Створення першої сторінки (нова історія)

### 2.1. Введення даних користувачем

Користувач заповнює форму на Landing Page (`ComicCreationForm`):

- **Промпт** — текстовий опис сцени коміксу
- **Стиль** — один з: `American Modern`, `Manga`, `Noir` (за замовчуванням), `Vintage`
- **Персонажі** — до 2 зображень (reference images), завантажуються через file input
- **Advanced Settings** (опціонально):
  - **Model** — `Flash 2.5` (швидка) або `Gemini 3 Pro` (якісніша)
  - **Layout** — розкладка панелей: Single Panel, Classic 5-Panel (за замовчуванням), 4-Panel Grid, 3-Panel Vertical, 6-Panel Grid
  - **Custom System Prompt** — повна заміна системного промпту

Всі налаштування зберігаються в `localStorage` для повторного використання.

### 2.2. Завантаження зображень персонажів

1. Користувач обирає файли (PNG/JPEG, до 2 штук)
2. Файли завантажуються в **AWS S3** через `next-s3-upload` (клієнтський upload)
3. Endpoint: `POST /api/s3-upload` (проксі від `next-s3-upload`)
4. Повертаються публічні URL завантажених зображень

### 2.3. Запит до API

Клієнт відправляє `POST /api/generate-comic` з body:

```json
{
  "prompt": "A detective walks through neon-lit streets...",
  "style": "noir",
  "characterImages": ["https://s3.../char1.jpg", "https://s3.../char2.jpg"],
  "model": "flash-image-2.5",
  "layout": "classic-5-panel",
  "customSystemPrompt": null
}
```

### 2.4. Серверна обробка (`/api/generate-comic`)

1. **Аутентифікація** — перевірка `userId` через Clerk
2. **Створення Story** в БД з тимчасовим title (перші 50 символів промпту)
3. **Генерація унікального slug** через `generateComicSlug()` (до 10 спроб)
4. **Створення Page** в БД (pageNumber = 1)
5. **Паралельно запускаються:**
   - Генерація зображення через Together AI
   - Генерація title + description через текстову модель (`Qwen3-Next-80B`)
6. **Завантаження зображення в S3** (постійне сховище)
7. **Оновлення записів** в БД (page.generatedImageUrl, story.title, story.description)
8. **Відповідь клієнту** з `imageUrl`, `storySlug`, `pageId`

### 2.5. Редирект

Після успішної генерації клієнт виконує:
```
router.push(`/story/${result.storySlug}`)
```

---

## 3. Додавання наступних сторінок

### 3.1. Відкриття модалки

В редакторі історії (`StoryEditorClient`) користувач натискає кнопку "Continue Story" або клавішу `C`. Відкривається `GeneratePageModal`.

### 3.2. Розумний вибір персонажів

При відкритті модалки автоматично обираються персонажі:

- Якщо на останній сторінці >= 2 персонажі → обираються вони
- Якщо < 2 → доповнюються персонажами з передостанньої сторінки
- Максимум 2 обрані одночасно

Користувач може:
- Перемикати вибір існуючих персонажів (click)
- Переглядати превʼю (double-click)
- Завантажувати нових персонажів
- Видаляти нещодавно завантажених

### 3.3. Запит до API

Клієнт відправляє `POST /api/add-page` з body:

```json
{
  "storyId": "story-slug",
  "prompt": "The detective finds a clue...",
  "characterImages": ["https://s3.../char1.jpg"],
  "model": "flash-image-2.5",
  "layout": "classic-5-panel",
  "customSystemPrompt": null
}
```

### 3.4. Серверна обробка (`/api/add-page`)

1. **Аутентифікація** + перевірка ownership
2. **Визначення номера сторінки** — `getNextPageNumber(storyId)`
3. **Створення Page** в БД
4. **Збір reference images:**
   - Зображення попередньої сторінки (для візуальної консистентності)
   - Обрані зображення персонажів
5. **Побудова промпту** з контекстом продовження (промпти всіх попередніх сторінок)
6. **Генерація зображення** через Together AI
7. **Завантаження в S3** + оновлення БД
8. **Відповідь** з `imageUrl`, `pageId`, `pageNumber`

### 3.5. Оновлення UI

Нова сторінка додається в state, редактор автоматично переключається на неї.

---

## 4. Перемальовування сторінки (Redraw)

Перемальовування використовує той самий endpoint `POST /api/add-page`, але з додатковим параметром `pageId`:

```json
{
  "storyId": "story-slug",
  "pageId": "existing-page-uuid",
  "prompt": "Original prompt text...",
  "characterImages": ["https://s3.../char1.jpg"]
}
```

**Відмінності від додавання нової сторінки:**

- Не створюється новий запис Page — оновлюється існуючий
- Контекст продовження включає лише сторінки **до** поточної (не включаючи її)
- Reference image береться з попередньої сторінки (не поточної)
- При помилці генерації існуюча сторінка не видаляється

---

## 5. Побудова промпту

Промпт будується у `lib/prompt.ts` функцією `buildComicPrompt()`.

### 5.1. Структура фінального промпту

```
[SYSTEM PROMPT]

STORY:
[User's prompt text]
```

### 5.2. Складові системного промпту

1. **Continuation Context** (для продовження):
   ```
   STORY CONTINUATION CONTEXT:
   Page 1: [prompt page 1]
   Page 2: [prompt page 2]
   ...
   ```

2. **Character Consistency Instructions** (якщо є reference images):
   - Для 1 персонажа — інструкції збереження обличчя в усіх панелях
   - Для 2 персонажів — інструкції для обох з візуальним розрізненням

3. **Character Consistency Rules** — загальні правила консистентності

4. **Text and Lettering** — правила для тексту в бульбашках

5. **Layout Prompt** — опис розкладки панелей (з `PAGE_LAYOUTS`)

6. **Art Style** — опис стилю (з `COMIC_STYLES`)

7. **Composition** — правила композиції (кути камери, flow, пози)

### 5.3. Custom System Prompt

Якщо користувач задав `customSystemPrompt`, весь стандартний промпт замінюється на:
```
[Custom System Prompt]

STORY:
[User's prompt text]
```

---

## 6. Генерація зображення

### 6.1. Together AI Image Generation

```typescript
const response = await client.images.generate({
  model: modelConfig.modelId,    // "google/flash-image-2.5" або "google/gemini-3-pro-image"
  prompt: fullPrompt,
  width: dimensions.width,       // Залежить від моделі та наявності reference images
  height: dimensions.height,
  temperature: 0.1,              // Низька для консистентності облич
  reference_images: referenceImages.length > 0 ? referenceImages : undefined,
});
```

### 6.2. Reference Images (порядок)

Для нових сторінок (не першої):
1. **Зображення попередньої сторінки** — для стилістичної консистентності
2. **Зображення персонажів** (до 2) — для збереження облич

### 6.3. Розміри зображень

| Модель | З reference | Без reference |
|--------|-------------|---------------|
| Flash 2.5 | 864×1184 | 896×1152 |
| Gemini 3 Pro | 896×1200 | 896×1200 |

### 6.4. Обробка помилок

- **Content Policy Violation** — повертається спеціальне повідомлення
- **402 (Insufficient Credits)** — повідомлення про поповнення балансу
- **Інші помилки** — cleanup створених записів у БД:
  - Нова історія → видаляється вся Story
  - Нова сторінка → видаляється Page
  - Redraw → нічого не видаляється

---

## 7. Збереження результату

### 7.1. Потік збереження

```
Together AI → тимчасовий URL зображення
    │
    ▼
uploadImageToS3(imageUrl, s3Key)
    │
    ├── fetch(imageUrl) → Buffer
    ├── PutObjectCommand → S3 Bucket
    │     Key: comics/{storyId}/page-{pageNumber}-{timestamp}.jpg
    │     ContentType: image/jpeg
    │
    ▼
Публічний S3 URL → updatePage(pageId, s3ImageUrl)
```

### 7.2. Генерація title/description (тільки для нових історій)

Паралельно з генерацією зображення запускається текстова модель `Qwen3-Next-80B`:

- **Title** — до 60 символів
- **Description** — до 200 символів
- Формат відповіді — JSON
- При помилці — fallback на перші 50 символів промпту

---

## 8. Схема бази даних

### Stories

| Поле | Тип | Опис |
|------|-----|------|
| `id` | UUID | Primary key |
| `title` | text | Назва (генерується AI) |
| `slug` | text | Унікальний URL-slug |
| `description` | text | Опис (генерується AI) |
| `style` | text | Стиль коміксу (default: "noir") |
| `userId` | text | Clerk user ID |
| `usesOwnApiKey` | boolean | Чи використовує власний API key |
| `createdAt` | timestamp | Дата створення |
| `updatedAt` | timestamp | Дата оновлення |

### Pages

| Поле | Тип | Опис |
|------|-----|------|
| `id` | UUID | Primary key |
| `storyId` | UUID | FK → stories.id (cascade delete) |
| `pageNumber` | integer | Номер сторінки |
| `prompt` | text | Промпт користувача |
| `characterImageUrls` | jsonb (string[]) | URL зображень персонажів |
| `generatedImageUrl` | text | URL згенерованого зображення (S3) |
| `model` | text | ID використаної моделі |
| `layout` | text | ID використаної розкладки |
| `isCustomPrompt` | boolean | Чи використано кастомний промпт |
| `createdAt` | timestamp | Дата створення |
| `updatedAt` | timestamp | Дата оновлення |

### Page Text Blocks (OCR)

| Поле | Тип | Опис |
|------|-----|------|
| `id` | UUID | Primary key |
| `pageId` | UUID | FK → pages.id (cascade delete) |
| `text` | text | Розпізнаний текст |
| `boundingBox` | jsonb | Координати (normalized 0-1) |
| `confidence` | integer | Впевненість OCR (0-1) |

---

## 9. Конфігурація моделей та стилів

### Стилі (`COMIC_STYLES`)

| ID | Назва | Опис промпту |
|----|-------|-------------|
| `american-modern` | American Modern | Сучасний супергеройський стиль, яскраві кольори |
| `manga` | Manga | Японська манга, чорно-білий, speed lines |
| `noir` | Noir | Film noir, високий контраст, 1940s естетика |
| `vintage` | Vintage | Golden Age 1950s, halftone dots, ретро палітра |

### Моделі (`IMAGE_MODELS`)

| ID | Назва | Together AI Model | Опис |
|----|-------|-------------------|------|
| `flash-image-2.5` | Flash 2.5 | `google/flash-image-2.5` | Швидка, хороша якість |
| `gemini-3-pro` | Gemini 3 Pro | `google/gemini-3-pro-image` | Найкраща якість, повільніша |

### Розкладки (`PAGE_LAYOUTS`)

| ID | Назва | Панелей | Опис |
|----|-------|---------|------|
| `single-panel` | Single Panel | 1 | Одна повносторінкова ілюстрація |
| `classic-5-panel` | Classic 5-Panel | 5 | 2 зверху + 1 великий + 2 знизу |
| `4-panel-grid` | 4-Panel Grid | 4 | Сітка 2×2 |
| `3-panel-vertical` | 3-Panel Vertical | 3 | Три горизонтальні смуги |
| `6-panel-grid` | 6-Panel Grid | 6 | Класична сітка 2×3 |

---

## Діаграма повного потоку

```
┌─────────────────────────────────────────────────────────────────┐
│                        КОРИСТУВАЧ                               │
│  1. Вводить промпт                                              │
│  2. Обирає стиль, модель, layout                                │
│  3. Завантажує фото персонажів (optional, max 2)                │
│  4. Натискає "Generate"                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    КЛІЄНТ (Browser)                              │
│  1. Upload character images → S3 (next-s3-upload)               │
│  2. POST /api/generate-comic або /api/add-page                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    СЕРВЕР (Next.js API)                          │
│  1. Auth check (Clerk)                                          │
│  2. Create/validate Story + Page in DB (Drizzle → Neon Postgres)│
│  3. Collect reference images (prev page + characters)           │
│  4. Build full prompt (lib/prompt.ts)                           │
│  5. ┌─ Generate image (Together AI)                             │
│     └─ Generate title/desc (Together AI, тільки нова історія)   │
│  6. Upload generated image → S3                                 │
│  7. Update DB records                                           │
│  8. Return response                                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    КЛІЄНТ (Browser)                              │
│  - Нова історія: redirect → /story/{slug}                       │
│  - Нова сторінка: додати в state, показати в editor             │
│  - Redraw: оновити зображення поточної сторінки                 │
└─────────────────────────────────────────────────────────────────┘
```
