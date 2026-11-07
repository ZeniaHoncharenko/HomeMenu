import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getDatabasePool, getMissingDatabaseEnv } from "@/lib/neon-services";

type DishRow = {
  id: string;
  name: string;
  meal_type: string;
  ingredients: string;
  recipe: string;
  rating: number;
  can_take_to_work: boolean;
  photo_keys: string[];
};

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS dishes (
    id text PRIMARY KEY,
    name text NOT NULL,
    meal_type text NOT NULL,
    ingredients text NOT NULL,
    recipe text NOT NULL,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 10),
    can_take_to_work boolean NOT NULL DEFAULT false,
    photo_keys text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;

const validMealTypes = new Set(["Завтрак", "Обед", "Ужин", "Прочее"]);

const withPhotoUrls = (row: DishRow) => ({
  id: row.id,
  name: row.name,
  mealType: row.meal_type,
  ingredients: row.ingredients,
  recipe: row.recipe,
  rating: row.rating,
  canTakeToWork: row.can_take_to_work,
  photoKeys: row.photo_keys ?? [],
  photos: (row.photo_keys ?? []).map(
    (key) => `/api/photo?key=${encodeURIComponent(key)}`,
  ),
});

const parseDishPayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;

  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : randomUUID();
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const mealType =
    typeof candidate.mealType === "string" ? candidate.mealType.trim() : "";
  const ingredients =
    typeof candidate.ingredients === "string" ? candidate.ingredients.trim() : "";
  const recipe =
    typeof candidate.recipe === "string" ? candidate.recipe.trim() : "";
  const rating = Number(candidate.rating);
  const canTakeToWork = Boolean(candidate.canTakeToWork);
  const photoKeys = Array.isArray(candidate.photoKeys)
    ? candidate.photoKeys.filter((item): item is string => typeof item === "string")
    : [];

  if (
    !name ||
    !validMealTypes.has(mealType) ||
    !ingredients ||
    !recipe ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 10
  ) {
    return null;
  }

  return {
    id,
    name,
    mealType,
    ingredients,
    recipe,
    rating,
    canTakeToWork,
    photoKeys,
  };
};

const getEnvErrorResponse = () => {
  const missing = getMissingDatabaseEnv();
  if (!missing.length) return null;

  return NextResponse.json(
    {
      error: "DATABASE_URL is missing. Run neon env pull and restart the app.",
      missing,
    },
    { status: 500 },
  );
};

const ensureTable = async () => {
  const pool = getDatabasePool();
  await pool.query(TABLE_SQL);
  return pool;
};

export async function GET() {
  try {
    const envError = getEnvErrorResponse();
    if (envError) return envError;

    const pool = await ensureTable();
    const result = await pool.query<DishRow>(
      `
        SELECT id, name, meal_type, ingredients, recipe, rating, can_take_to_work, photo_keys
        FROM dishes
        ORDER BY created_at DESC
      `,
    );

    return NextResponse.json({ dishes: result.rows.map(withPhotoUrls) });
  } catch (error) {
    console.error("Loading dishes failed:", error);
    return NextResponse.json({ error: "Не удалось загрузить блюда из базы данных." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const envError = getEnvErrorResponse();
    if (envError) return envError;

    const payload = parseDishPayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid dish payload." }, { status: 400 });
    }

    const pool = await ensureTable();
    const result = await pool.query<DishRow>(
      `
        INSERT INTO dishes (id, name, meal_type, ingredients, recipe, rating, can_take_to_work, photo_keys)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, meal_type, ingredients, recipe, rating, can_take_to_work, photo_keys
      `,
      [
        payload.id,
        payload.name,
        payload.mealType,
        payload.ingredients,
        payload.recipe,
        payload.rating,
        payload.canTakeToWork,
        payload.photoKeys,
      ],
    );

    return NextResponse.json({ dish: withPhotoUrls(result.rows[0]) }, { status: 201 });
  } catch (error) {
    console.error("Creating dish failed:", error);
    return NextResponse.json({ error: "Не удалось сохранить блюдо в базе данных." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  try {
    const envError = getEnvErrorResponse();
    if (envError) return envError;

    const payload = parseDishPayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid dish payload." }, { status: 400 });
    }

    const pool = await ensureTable();
    const result = await pool.query<DishRow>(
      `
        UPDATE dishes
        SET
          name = $2,
          meal_type = $3,
          ingredients = $4,
          recipe = $5,
          rating = $6,
          can_take_to_work = $7,
          photo_keys = $8
        WHERE id = $1
        RETURNING id, name, meal_type, ingredients, recipe, rating, can_take_to_work, photo_keys
      `,
      [
        payload.id,
        payload.name,
        payload.mealType,
        payload.ingredients,
        payload.recipe,
        payload.rating,
        payload.canTakeToWork,
        payload.photoKeys,
      ],
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Dish not found." }, { status: 404 });
    }

    return NextResponse.json({ dish: withPhotoUrls(result.rows[0]) });
  } catch (error) {
    console.error("Updating dish failed:", error);
    return NextResponse.json({ error: "Не удалось обновить блюдо в базе данных." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  try {
    const envError = getEnvErrorResponse();
    if (envError) return envError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "Dish id is required." }, { status: 400 });
    }

    const pool = await ensureTable();
    const result = await pool.query(`DELETE FROM dishes WHERE id = $1`, [id]);

    if (!result.rowCount) {
      return NextResponse.json({ error: "Dish not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Deleting dish failed:", error);
    return NextResponse.json({ error: "Не удалось удалить блюдо из базы данных." }, { status: 502 });
  }
}
