# Техническое задание для Codex: оптимизация и исправление критических точек HEISSKRAFT (`hk-future`)

Этот документ содержит структурированный план исправлений и оптимизаций кодовой базы **HEISSKRAFT** (Next.js 16.4.2, React 19, Payload CMS 3.92, PostgreSQL 17). Задачи сгруппированы в независимые пакеты по приоритетам с указанием точных файлов, строк, архитектурных инвариантов и критериев приёмки.

---

## 0. Обязательные инварианты и границы работ

При выполнении всех пунктов ниже необходимо строго соблюдать следующие правила проекта:

1. **Что НЕ входит в объём работ (игнорировать):**
   - Не реализовывать отправку демонстрационной формы заявки (`LeadModal` / `LeadButton`) во внешние сервисы или CRM.
   - Не создавать юридические и информационные страницы `/privacy`, `/personal-data`, `/about`, `/requisites`, а также не наполнять страницы-заглушки `/projects`, `/warranty`, `/selection/pumps`, `/selection/pipelines`.
2. **Сохранение трёх режимов сборки и работы:**
   - Серверный режим с включённой CMS (`CMS_ENABLED=true`).
   - Серверный/локальный режим без CMS (`CMS_ENABLED=false`, данные берутся из статических модулей `src/content/*`).
   - Статический экспорт для GitHub Pages (`npm run build:export`, `GITHUB_PAGES=true`, `basePath: "/hk-future"`).
3. **Безопасность и изоляция данных:**
   - Никогда не передавать сырые документы Payload, внутренние ID, метаданные авторизации или черновые записи в клиентские компоненты — все публичные данные проходят через Zod-схемы в `src/content/cms-adapter.ts`.
   - Не смешивать кеш опубликованных данных с данными авторизованного предпросмотра (`getPreviewUser()`).
   - Сохранить неизменяемость байтов загруженных файлов в коллекции `media` и дедупликацию PDF по `sha256`.
   - Схему БД изменять только через миграции Payload (`src/cms/migrations`), `push: false` должен оставаться неизменным.

---

## Пакет 1 (P1). Производительность изображений и производные размеры (`imageSizes`)

### Проблема
- В `src/cms/collections.ts` (строки 93–98) у коллекции `Media` настроены размеры `thumb` (160×160), `card` (640w) и `wide` (1200w), однако:
  1. Схема `media` в `src/content/cms-adapter.ts` (строки 31–33) парсит только корневой `url` оригинала и отбрасывает `sizes`.
  2. Компоненты `src/sections/products/ProductGrid.tsx` (строка 12), `src/sections/products/ProductScreen.tsx` (строки 36, 48) и `src/components/layout/SiteSearch.tsx` (строка 25) рендерят `<Image unoptimized ... />` с URL исходного файла.
  3. Для уже импортированных медиафайлов производные размеры могут отсутствовать на диске, если файлы импортировались напрямую без генерации ресайзов.
- В результате карточки каталога и миниатюры поиска (56×56) скачивают многомегабайтные оригиналы (до 55 МиБ на категорию `Therm`).

### Что сделать
1. **Расширить DTO медиа в `src/content/cms-adapter.ts`:**
   - Добавить поддержку опционального объекта `sizes` (`thumb`, `card`, `wide`) в Zod-схему `media` в `src/content/cms-adapter.ts` и в `src/content/catalog-presenter.ts`.
   - В `galleryOf` / `coverOf` / `mapProduct` / `productSummaries` формировать структуру изображения с производными ссылками и безопасным фолбэком на оригинал:
     - `thumbUrl: file.sizes?.thumb?.url || file.sizes?.card?.url || file.url`
     - `cardUrl: file.sizes?.card?.url || file.sizes?.wide?.url || file.url`
     - `wideUrl: file.sizes?.wide?.url || file.url`
     - `originalUrl: file.url`
   - В выборках `findAll('products')` и `getSiteSearchContent()` убедиться, что `select` / `populate` для `media` включает поле `sizes`.
2. **Подключить оптимальные размеры в UI-компонентах:**
   - В `src/components/layout/SiteSearch.tsx` (`Thumbnail`, строка 25): использовать `thumbUrl` (или `image` из поисковой записи, который указывает на `thumbUrl`).
   - В `src/sections/products/ProductGrid.tsx` (строка 12): использовать `cardUrl` для обложки карточки товара.
   - В `src/sections/products/ProductScreen.tsx`:
     - В главном блоке `.productImage` (строка 48) использовать `wideUrl`.
     - В галерее `.gallery` (строка 36) использовать `cardUrl` внутри `<img>`, а в `<a href={...}>` оставлять ссылку на полноразмерный `originalUrl`.
3. **Скрипт пакетной досборки `imageSizes` для существующей медиатеки:**
   - Создать идемпотентный CLI-скрипт (например, `scripts/cms/backfill-image-sizes.ts`), который проходит по существующим изображениям (`image/jpeg`, `image/png`, `image/webp`) в локальной медиатеке и при отсутствии `sizes.thumb` / `sizes.card` / `sizes.wide` генерирует их через `sharp` и обновляет метаданные записи в БД, не изменяя байты и `sha256` исходного файла.

### Критерии приёмки
- В `SiteSearch`, `ProductGrid` и `ProductScreen` передаются URL уменьшенных копий (`thumb`, `card`, `wide`), если они доступны, с фолбэком на оригинал.
- Ссылка на открытие полного изображения/чертежа в новой вкладке на странице товара по-прежнему ведёт на оригинал.

---

## Пакет 2 (P1). HTTP-кеширование опубликованных медиафайлов в `src/proxy.ts`

### Проблема
- В `src/proxy.ts` (строка 33) для всех проксируемых маршрутов безусловно выставляется `response.headers.set('Cache-Control', 'private, no-store')`.
- Из-за этого даже публичные запросы `GET` и `HEAD` к `/api/media/file/<filename>` запрещают браузеру и CDN кешировать опубликованные изображения и обложки документов.
- Дополнительно `HEAD` на опубликованный файл в ряде сценариев возвращает `404` при успешном `GET`.

### Что сделать
1. **Разделить политику `Cache-Control` в `src/proxy.ts`:**
   - Определять, является ли запрос публичным чтением медиа (`publicMediaRead`: методы `GET` или `HEAD` по пути `/^\/api\/media\/file\/[^/]+$/`) **без** активной авторизационной/preview-сессии (отсутствует cookie `payload-token`).
   - Если это анонимное публичное чтение медиа (`publicMediaRead && !hasAuthCookie`), устанавливать:
     ```ts
     response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
     ```
     (Так как в проекте байты существующей записи `media` неизменяемы по хуку `beforeOperation` в `src/cms/collections.ts`, опубликованный файл по конкретному имени файла не подменяется in-place, а умеренный `max-age=3600` позволяет отозвать доступ при снятии с публикации в разумное окно.)
   - Для всех остальных запросов (`/studio`, `/admin`, `/api/preview`, `/api/catalog-import/*`, а также чтения медиа с cookie `payload-token`) строго сохранять `Cache-Control: private, no-store`.
2. **Проверить поддержку `HEAD` для `/api/media/file/*` и `/favicon.ico`:**
   - Убедиться, что `HEAD`-запросы к опубликованным файлам медиатеки не блокируются и корректно возвращают `200 OK` с заголовками.
   - Проверить доступность `/favicon.ico` в корне публичного приложения (устранить `404` при запросе `/favicon.ico`).

### Критерии приёмки
- Анонимный `GET /api/media/file/<published-image>` возвращает `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
- Запрос к `/api/media/file/<draft-image>` без авторизации по-прежнему возвращает `403`/`404` и не кешируется публично.
- Все запросы к `/studio/*` и авторизованным API возвращают `Cache-Control: private, no-store`.

---

## Пакет 3 (P1). Оптимизация глобального поиска и выборок каталога

### Проблема
1. **Перегрузка корневого Layout (`src/app/(frontend)/layout.tsx`, строка 52):**
   - На каждый запрос любой страницы вызывается `getSiteSearchContent()`, который через `findAll` выгружает из БД все категории, все опубликованные товары, все варианты товаров (`enrichVariantSummaries`), статьи и страницы, после чего сериализует весь индекс в RSC-пропсы клиентского компонента `Header` -> `SiteSearch`.
2. **Линейный обход и копирование массивов в `enrichVariantSummaries` (`src/content/cms-adapter.ts`, строки 255–264):**
   - Для формирования `groups` используется `groups.set(key, [...(groups.get(key) || []), v.sku])` (квадратичное копирование массива в цикле по 2 619 вариантам) и `families.find(f => f.slug === p.slug)` внутри `.map()` по всем товарам.
3. **Лишняя загрузка всех товаров на главной странице каталога (`src/sections/catalog/CatalogScreen.tsx`, строка 7):**
   - При открытии `/catalog` (`path = []`) загружается полный массив `getProductSummariesContent()`, хотя на стартовом экране каталога отображаются только 3 корневых раздела (без карточек товаров), а список товаров нужен только для клиентского поиска внутри `CatalogBrowser` или внутри конечных категорий.
4. **Чтение всех вариантов товара разом (`src/content/cms-adapter.ts`, строка 273 и `src/sections/products/VariantTable.tsx`):**
   - У товаров с большим числом исполнений (например, `HMV` — 208 вариантов) таблица `VariantTable` рендерит все строки в DOM сразу без клиентской/серверной порционной выдачи.

### Что сделать
1. **Оптимизировать алгоритмику и кеширование в `src/content/cms-adapter.ts`:**
   - В `enrichVariantSummaries` заменить `[...(groups.get(key) || []), v.sku]` на `let list = groups.get(key); if (!list) { list = []; groups.set(key, list); } list.push(v.sku);` и использовать `Map<string, typeof families[number]>` по `slug` вместо `families.find(...)`.
   - Выделить формирование публичных (не-preview) данных каталога и поискового индекса в серверный кеш (`unstable_cache` из `next/cache` с тегами, например `['cms-public-content', 'cms-search-index', 'cms-catalog']`), который используется **только** тогда, когда `await getPreviewUser()` равен `null`.
   - В `src/cms/hooks.ts` (`contentChanged`, `contentDeleted`) и при публикациях вариантов/документов вызывать `revalidateTag` для сброса этого кеша сразу после изменения контента.
   - Для авторизованных редакторов (`user !== null`) сохранять прямой запрос без общего кеша, чтобы preview всегда видел свежие черновики.
2. **Перевести поиск в шапке (`SiteSearch.tsx`) на ленивую подгрузку или легковесный Route Handler (при `CMS_ENABLED=true`):**
   - Создать публичный Route Handler `GET /api/search?q=<query>` (разрешив `pathname === '/api/search'` для `GET`/`HEAD` в `src/proxy.ts`), который:
     - Принимает строку `q` (обрезает до 160 символов, при пустой строке возвращает `{ results: [] }`).
     - Ищет по закешированному опубликованному индексу `getSiteSearchContent()` на сервере через `searchSite(entries, q)` и возвращает только топ-8 результатов (`SiteSearchEntry[]`).
   - В `src/app/(frontend)/layout.tsx`:
     - При `CMS_ENABLED=true` не блокировать рендер каждой страницы передачей тысяч SKU в HTML-пропсы шапки (передавать пустой массив или только компактный набор разделов/страниц, а при вводе текста в `SiteSearch.tsx` запрашивать `/api/search?q=...` с debounce 150 мс и `AbortController`, либо подгружать поисковый индекс лениво только при открытии строки поиска `open === true`).
     - При `CMS_ENABLED=false` / `GITHUB_PAGES=true` сохранить работу `SiteSearch` по переданным локальным `entries`, чтобы статический экспорт на GitHub Pages и его E2E-тесты работали без серверного API.
3. **Ограничить DOM-рендер больших таблиц вариантов в `src/sections/products/VariantTable.tsx`:**
   - Сохранить мгновенную фильтрацию по всем `variants` (поиск по артикулу/исполнению и фильтр по размеру), но если число отфильтрованных строк превышает `50`, рендерить первые `50` строк с кнопкой «Показать ещё» / постраничной навигацией (и корректным счётчиком `Показано X из Y`), чтобы не раздувать DOM на мобильных устройствах.
4. **Детерминированная сортировка товаров и категорий:**
   - В `findAll` (`src/content/cms-adapter.ts`, строка 174) для `categories` и `products` использовать составную сортировку `['sortOrder', 'id']` (или досортировывать по `sortOrder`, затем по `slug`/`id`), чтобы порядок карточек с одинаковым `sortOrder = 500` был абсолютно стабильным между запросами.

### Критерии приёмки
- HTML-ответ страниц при `CMS_ENABLED=true` больше не раздувается полным списком всех 2 619 SKU вариантов в сериализованных пропсах `Header`.
- Повторные открытия публичных страниц каталога/главной не выполняют полную каскадную выгрузку всех коллекций из PostgreSQL на каждый запрос, но публикация/снятие с публикации в CMS мгновенно инвалидирует кеш.
- Все существующие unit- и E2E-тесты поиска (`SiteSearch` и каталог) проходят как в серверном режиме, так и в статическом экспорте (`E2E_EXPORT=true`).

---

## Пакет 4 (P1/P2). Защита стоимости запросов к Payload REST API и оптимизация RBAC/индексов БД

### Проблема
1. **Неограниченные выборки через `/api/*` и глубина `depth`:**
   - Хотя `src/proxy.ts` закрывает большинство `/api/*` маршрутов для прямого внешнего вызова, внутри `payload.config.ts` не заданы глобальные `defaultDepth` / `maxDepth`, а у коллекций не ограничены лимиты пагинации.
2. **Полное чтение таблицы `products` при каждой проверке доступа к `product-variants` (`src/cms/catalog-fields.ts`, строки 72–79):**
   - В `variants.access.read` при каждом чтении вариантов анонимным пользователем выполняется `req.payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, pagination: false, ... })`. Если за один запрос выполняется несколько чтений вариантов, запрос к `products` повторяется.
3. **Гонка при параллельной публикации вариантов с одинаковым `sku` (`src/cms/catalog-fields.ts`, строки 86–92):**
   - Уникальность `sku` проверяется через `req.payload.count` в хуке `beforeValidate`, но в БД нет уникального индекса на опубликованные `sku`, что допускает дубли при конкурентных транзакциях.

### Что сделать
1. **Задать безопасные лимиты глубины в `payload.config.ts`:**
   - Добавить `defaultDepth: 1` и `maxDepth: 4` в `buildConfig` в `payload.config.ts`.
2. **Мемоизировать проверку опубликованных родителей в `variants.access.read` (`src/cms/catalog-fields.ts`, строки 72–79):**
   - Кешировать промис/массив ID опубликованных товаров в `req.context` (или `WeakMap<PayloadRequest, Promise<(string | number)[]>>` по объекту `req`, так как вложенные вызовы Local API могут пересоздавать `req.context`), чтобы за время жизни одного HTTP-запроса список ID опубликованных товаров запрашивался из БД не более одного раза.
3. **Добавить частичный уникальный индекс для опубликованных `sku` вариантов:**
   - Создать новую миграцию в `src/cms/migrations` (и зарегистрировать её в `src/cms/migrations/index.ts`), которая добавляет частичный уникальный индекс в PostgreSQL для таблицы `product_variants`:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS product_variants_published_sku_unique_idx
       ON product_variants (sku)
       WHERE _status = 'published' AND sku IS NOT NULL AND btrim(sku) <> '';
     ```
   - Черновики (`_status = 'draft'`) при этом по-прежнему могут иметь конфликтующие `sku` до ручного разбора редактором в `/studio`.

### Критерии приёмки
- Миграция чисто накатывается через `npm run cms:migrate` и проходит проверку `npm run cms:test` и `npm run cms:restore-check`.
- Попытка опубликовать два варианта с одинаковым `sku` блокируется как на уровне хука `beforeValidate`, так и на уровне индекса PostgreSQL.

---

## Пакет 5 (P2). Исправление дефектов UI каталога и карточки товара

### Проблема
1. **Горизонтальное переполнение на мобильном экране 390px (`src/sections/products/Products.module.css`, строка 41):**
   - На странице `/catalog/pipelines/therm` при ширине viewport 390px документ расширяется до 430px из-за длинных слов в заголовках двухколоночной сетки карточек (например, «полипропиленовая», «воздухоотводчиком»). У `.card h2` отсутствует перенос длинных слов.
2. **Ошибочная подпись «Изготовление по запросу» у семейств товаров (`src/sections/products/ProductGrid.tsx`, строка 13):**
   - Сейчас рендерится:
     ```tsx
     <p>{product.sku ? `Артикул: ${product.sku}` : 'Изготовление по запросу'}</p>
     {Boolean(product.variantCount) && <p>Вариантов: {product.variantCount}<br />Артикулы: {product.articleSummary}</p>}
     ```
   - Все 221 опубликованный товар в базе имеют тип `family` (`productKind === 'family'`), у которых корневой `product.sku` пуст, а артикулы находятся в вариантах. В итоге на каждой серийной карточке ошибочно выводится «Изготовление по запросу» прямо над строкой «Вариантов: N / Артикулы: ...».

### Что сделать
1. **Исправить перенос длинных слов в `src/sections/products/Products.module.css`:**
   - Для `.card` (строка 39) и `.card h2` (строка 41), а также `.card p` (строка 42) добавить безопасный перенос слов:
     ```css
     .card { min-width: 0; overflow-wrap: anywhere; }
     .card h2 { margin-top: 20px; font: 500 18px/1.4 var(--hk-font-text); overflow-wrap: anywhere; hyphens: auto; }
     ```
   - Проверить на ширинах `320px`, `360px`, `390px` и `430px`, что `document.documentElement.scrollWidth <= window.innerWidth` (без скрытия проблемы через глобальный `overflow-x: hidden`).
2. **Привязать отображение артикула и способа заказа в `src/sections/products/ProductGrid.tsx` к `productKind` и наличию вариантов:**
   - Передавать `productKind` в `PublicProductSummary` (`src/content/cms-adapter.ts`, строки 228–249).
   - В `src/sections/products/ProductGrid.tsx`:
     - Если `product.sku` заполнен — выводить `<p>Артикул: {product.sku}</p>`.
     - Иначе если `product.variantCount && product.variantCount > 0` — выводить блок вариантов (`Вариантов: {product.variantCount}` и при наличии `product.articleSummary` — `Артикулы: {product.articleSummary}`), **не** показывая надпись «Изготовление по запросу».
     - Выводить `<p>Изготовление по запросу</p>` (или «Подбор по запросу») только тогда, когда `product.productKind === 'request'` либо когда у товара нет ни корневого `sku`, ни опубликованных вариантов (`!product.sku && !product.variantCount`).

### Критерии приёмки
- На мобильном экране `390×844` страница `/catalog/pipelines/therm` не имеет горизонтального скролла (`scrollWidth === 390`).
- Серийные карточки (`productKind === 'family'`) с опубликованными вариантами больше не показывают ложную метку «Изготовление по запросу».

---

## Пакет 6 (P3). Документация и аудит зависимостей

### Что сделать
1. **Актуализировать статус `/docs` в `README.md`:**
   - В `README.md` (раздел «Известные ограничения», строка 158) убрать `/docs` из перечня нереализованных маршрутов, так как публичная библиотека документов `src/app/(frontend)/docs/page.tsx` уже реализована и протестирована.
2. **Проверить `scripts/audit-dependencies.mjs`:**
   - Проверить актуальный вывод `npm run audit:dependencies`. Не применять `npm audit fix --force` и не понижать мажорную/минорную версию Payload CMS. Если `graphql-scalars` (где GraphQL отключён в `payload.config.ts`) или транзитивный `deepmerge` можно безопасно обновить через `overrides` в `package.json` на патч-версию без нарушения совместимости и тестов — проверить это; если безопасного совместимого патча в реестре нет — зафиксировать статус в отчёте без поломки дерева зависимостей.

---

## Порядок проверки после внесения изменений

После реализации всех пакетов последовательно выполнить и убедиться в зелёном статусе следующих команд:

```sh
# 1. Статический анализ и unit-тесты
npm run typecheck
npm run lint
npm test

# 2. Интеграционные тесты CMS (PostgreSQL)
npm run cms:test

# 3. Сборка и E2E без CMS + статический экспорт
CMS_ENABLED=false npm run build:production
PLAYWRIGHT_CHANNEL=chrome CMS_ENABLED=false npm run test:e2e
npm run build:export
npm run test:assets
E2E_EXPORT=true E2E_BASE_PATH=/hk-future PLAYWRIGHT_CHANNEL=chrome npm run test:e2e

# 4. Сборка и E2E с включённой CMS (последовательно, порт 3100)
CMS_ENABLED=true CMS_SERVER_URL=http://localhost:3100 NEXT_PUBLIC_SITE_URL=http://localhost:3100 npm run build:production
PLAYWRIGHT_CHANNEL=chrome CMS_ENABLED=true npm run test:e2e
E2E_CMS_CONTENT=true PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- product-page.spec.ts
PLAYWRIGHT_CHANNEL=chrome npm run test:cms:e2e
```
