# План покращень MakeComics

## Зміст

1. [A — Збільшити ліміт персонажів до 5](#a--збільшити-ліміт-персонажів-до-5)
2. [B — Видалення коміксів](#b--видалення-коміксів)
3. [C — Вертикальний Webtoon формат](#c--вертикальний-webtoon-формат)
4. [D — Story Summary + Character Descriptions](#d--story-summary--character-descriptions)
5. [E — Редагування initial prompt історії](#e--редагування-initial-prompt-історії)
6. [Порядок реалізації](#порядок-реалізації)

---

## A — Збільшити ліміт персонажів до 5

**Складність:** Низька  
**Залежності:** Немає

### Що змінити

| Файл | Зміна |
|------|-------|
| `components/landing/comic-creation-form.tsx` | Змінити `slice(0, 2)` → `slice(0, 5)` (рядок ~150). Оновити текст "Max 2" → "Max 5" |
| `components/editor/generate-page-modal.tsx` | Змінити ліміт вибору з 2 до 5 в `toggleCharacterSelection()` — умова `newSelected.size >= 2` → `>= 5`. Аналогічно в `handleFiles()` де обрізається до 2 |
| `lib/prompt.ts` | Зараз є секції для 1 та 2 персонажів. Додати секцію для 3-5 персонажів з інструкціями по консистентності кожного |

### Деталі по `lib/prompt.ts`

Зараз:
```typescript
if (characterImages.length === 1) { ... }
else if (characterImages.length === 2) { ... }
```

Потрібно додати:
```typescript
else if (characterImages.length >= 3) {
  // Інструкції для кожного персонажа з нумерацією:
  // CHARACTER 1 REFERENCE: Use the FIRST uploaded image...
  // CHARACTER 2 REFERENCE: Use the SECOND uploaded image...
  // CHARACTER 3 REFERENCE: Use the THIRD uploaded image...
  // і т.д.
}
```

---

## B — Видалення коміксів

**Складність:** Низька  
**Залежності:** Немає

### Що вже є

- `deleteStory(storyId)` в `lib/db-actions.ts` — видаляє story (pages видаляються cascade)
- `deleteStory` вже імпортується в `app/api/generate-comic/route.ts` (для cleanup)

### Що змінити

| Файл | Зміна |
|------|-------|
| `app/api/stories/[storySlug]/route.ts` | Додати `DELETE` handler: auth check → ownership check → `deleteStory(story.id)` |
| `app/stories/page.tsx` | Додати кнопку видалення на кожній картці (іконка Trash2). Додати `AlertDialog` для підтвердження. Після видалення — оновити state |
| `components/editor/editor-toolbar.tsx` | (Опціонально) Додати кнопку "Delete Story" в toolbar редактора з confirmation dialog та redirect на `/stories` |

### API DELETE handler (псевдокод)

```typescript
export async function DELETE(request, { params }) {
  // 1. auth() → userId
  // 2. getStoryWithPagesBySlug(slug)
  // 3. Перевірити ownership (story.userId === userId)
  // 4. deleteStory(story.id)
  // 5. Return { success: true }
}
```

---

## C — Вертикальний Webtoon формат

**Складність:** Середня  
**Залежності:** Немає

### Концепція

Замість горизонтальних comic page layouts (2×3, 2×2, тощо) — вертикальний webtoon формат:
- **1 колонка, 6 рядків** — кожен рядок це панель
- Зображення вузьке та довге (вертикальний scroll)

### Що змінити

| Файл | Зміна |
|------|-------|
| `lib/constants.ts` | 1) Додати layout `webtoon-6-panel` з вертикальним prompt. 2) Змінити `DEFAULT_PAGE_LAYOUT` на `webtoon-6-panel`. 3) Додати per-layout dimension overrides або змінити dimensions моделей на вертикальні |
| `lib/prompt.ts` | Оновити `getPanelCount()` для `webtoon-6-panel` → 6 |
| `components/editor/comic-canvas.tsx` | Адаптувати відображення під вертикальний формат (можливо потрібен vertical scroll замість fit-to-screen) |
| `app/api/download-pdf/route.ts` | Перевірити що PDF генерація коректно працює з вертикальними зображеннями |

### Layout prompt (приклад)

```
PAGE LAYOUT:
Vertical webtoon-style comic strip with 1 column and 6 rows:
[Panel 1] — top panel
[Panel 2]
[Panel 3]
[Panel 4]
[Panel 5]
[Panel 6] — bottom panel
- All panels stacked vertically in a single column
- Each panel is a wide horizontal strip
- Solid black panel borders with clean white gutters between panels
- Reading order: top to bottom
- This is a vertical scroll format (webtoon style)
```

### Розміри зображень

Зараз моделі мають фіксовані розміри (~896×1152). Для webtoon потрібні вужчі та довші:

**Варіант A:** Per-layout dimension overrides в `PAGE_LAYOUTS`:
```typescript
{
  id: "webtoon-6-panel",
  dimensions: { width: 640, height: 1536 },  // ~1:2.4 ratio
  ...
}
```

**Варіант B:** Змінити загальні dimensions моделей (простіше, але менш гнучко).

**Рекомендація:** Варіант A — додати optional `dimensions` в layout config. В API routes перевіряти: якщо layout має `dimensions` → використати їх, інакше → стандартні з моделі.

### Зміни в `comic-canvas.tsx`

Зараз canvas показує зображення в portrait режимі. Для webtoon:
- Зображення буде значно вищим
- Потрібен vertical scroll або zoom-to-fit
- Можливо потрібен інший aspect ratio контейнера

---

## D — Story Summary + Character Descriptions

**Складність:** Висока  
**Залежності:** Потрібен `pnpm drizzle-kit push` після зміни schema

### Концепція

Перед написанням промптів для окремих сторінок, користувач задає:
1. **Story Summary** — загальний опис сюжету, сеттінгу, тону
2. **Character Descriptions** — текстовий опис кожного персонажа (імʼя, зовнішність, роль)

Ці дані включаються в промпт **кожної** сторінки для підтримки консистентності.

### Зміни в Schema

```typescript
// lib/schema.ts — додати до stories table:
summary: text('summary'),                        // Story summary
characterDescriptions: text('character_descriptions'), // Character descriptions (free text)
```

### Що змінити

| Файл | Зміна |
|------|-------|
| `lib/schema.ts` | Додати поля `summary`, `characterDescriptions` до `stories` |
| `lib/db-actions.ts` | Оновити `createStory()` — приймати нові поля. Оновити `updateStory()` — дозволити оновлення нових полів |
| `lib/prompt.ts` | Додати `summary` та `characterDescriptions` в `BuildComicPromptOptions`. Включити їх в системний промпт перед continuation context |
| `components/landing/comic-creation-form.tsx` | Додати textarea для Summary та Character Descriptions (можливо в expandable секції) |
| `app/api/generate-comic/route.ts` | Приймати `summary`, `characterDescriptions` з request body. Передавати в `createStory()` та `buildComicPrompt()` |
| `app/api/add-page/route.ts` | Читати `summary`, `characterDescriptions` зі story та передавати в `buildComicPrompt()` |
| `app/api/stories/[storySlug]/route.ts` | Розширити PUT для оновлення `summary`, `characterDescriptions` |
| **Drizzle** | `pnpm drizzle-kit push` |

### Зміни в промпті

Додати нову секцію в `buildComicPrompt()`:

```
STORY OVERVIEW:
[Summary text from user]

CHARACTER GUIDE:
[Character descriptions from user]

[...rest of existing prompt...]
```

Ця секція йде **перед** continuation context, щоб AI завжди мав загальний контекст.

### UI на Landing Page

Додати під основним prompt textarea:

```
┌─────────────────────────────────────┐
│ Story Summary (optional)            │
│ ┌─────────────────────────────────┐ │
│ │ Describe the overall story...   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Character Descriptions (optional)   │
│ ┌─────────────────────────────────┐ │
│ │ Name: Detective Noir            │ │
│ │ Appearance: Tall, dark coat...  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## E — Редагування initial prompt історії

**Складність:** Середня  
**Залежності:** Залежить від D (використовує ті самі поля schema)

### Концепція

Після створення історії, користувач може редагувати:
- Story Summary
- Character Descriptions
- Description

Це дозволяє додавати деталі для покращення консистентності без перестворення історії.

### Що змінити

| Файл | Зміна |
|------|-------|
| Новий компонент: `components/editor/story-settings-modal.tsx` | Модалка з формою редагування summary, character descriptions, description |
| `components/editor/editor-toolbar.tsx` | Додати кнопку "Story Settings" (іконка Settings) → відкриває модалку |
| `app/story/[storySlug]/story-editor-client.tsx` | Інтегрувати `StorySettingsModal`, передати story data та callback для оновлення |
| `app/api/stories/[storySlug]/route.ts` | PUT вже існує для title. Розширити для `summary`, `characterDescriptions`, `description` |

### UI модалки Story Settings

```
┌─────────────────────────────────────────┐
│ Story Settings                      [X] │
│                                         │
│ Title                                   │
│ ┌─────────────────────────────────────┐ │
│ │ The Neon Detective                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Story Summary                           │
│ ┌─────────────────────────────────────┐ │
│ │ A noir detective story set in...    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Character Descriptions                  │
│ ┌─────────────────────────────────────┐ │
│ │ Detective Noir: Tall man in dark... │ │
│ │ Femme Fatale: Mysterious woman...   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel] [Save Changes]    │
└─────────────────────────────────────────┘
```

---

## Порядок реалізації

```
Фаза 1 (паралельно, незалежні):
├── A: Max 5 персонажів        (~1-2 години)
├── B: Видалення коміксів      (~1-2 години)
└── C: Webtoon формат          (~3-4 години)

Фаза 2 (послідовно):
├── D: Summary + Descriptions  (~4-6 годин)
│     └── drizzle-kit push
└── E: Редагування prompt      (~2-3 години)
        └── залежить від D
```

### Загальний чеклист

- [ ] **A** — `comic-creation-form.tsx`: slice(0,5), "Max 5"
- [ ] **A** — `generate-page-modal.tsx`: ліміт 5 в toggle та handleFiles
- [ ] **A** — `lib/prompt.ts`: секція для 3-5 персонажів
- [ ] **B** — `app/api/stories/[storySlug]/route.ts`: DELETE handler
- [ ] **B** — `app/stories/page.tsx`: кнопка видалення + confirmation
- [ ] **B** — (опціонально) `editor-toolbar.tsx`: Delete Story
- [ ] **C** — `lib/constants.ts`: webtoon layout + dimensions
- [ ] **C** — `lib/prompt.ts`: getPanelCount для webtoon
- [ ] **C** — `comic-canvas.tsx`: вертикальне відображення
- [ ] **C** — Перевірити PDF генерацію
- [ ] **D** — `lib/schema.ts`: summary, characterDescriptions
- [ ] **D** — `pnpm drizzle-kit push`
- [ ] **D** — `lib/db-actions.ts`: оновити createStory, updateStory
- [ ] **D** — `lib/prompt.ts`: включити summary/descriptions в промпт
- [ ] **D** — `comic-creation-form.tsx`: UI для summary/descriptions
- [ ] **D** — `generate-comic/route.ts`: приймати нові поля
- [ ] **D** — `add-page/route.ts`: читати summary зі story
- [ ] **E** — Новий `story-settings-modal.tsx`
- [ ] **E** — `editor-toolbar.tsx`: кнопка Story Settings
- [ ] **E** — `story-editor-client.tsx`: інтеграція модалки
- [ ] **E** — `stories/[storySlug]/route.ts`: розширити PUT
