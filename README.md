# HomeMenu

Приложение на Next.js для семейного меню на русском языке:
- разделы блюд на завтрак, обед и ужин;
- простой вход (логин `admin`, пароль `20032004`);
- добавление, редактирование и удаление блюд в выбранных разделах.

## Запуск локально

Для сохранения блюд настройте переменную `DATABASE_URL` для базы Neon. Её можно получить командой
`neon env pull` и сохраните в файле `.env.local` в корне проекта. Переменные S3-хранилища нужны только для загрузки фотографий:
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` и `AWS_REGION`.
Bucket `menu1` объявлен в [neon.ts](./neon.ts) и должен быть создан в связанном
проекте Neon:

```bash
neon deploy
```

Альтернативно:

```bash
neon buckets create assets
```

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Сборка

```bash
npm run build
```

## Деплой на Vercel

Проект готов для деплоя на Vercel как стандартное Next.js-приложение.
