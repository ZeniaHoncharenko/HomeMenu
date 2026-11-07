"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

type MealType = "Завтрак" | "Обед" | "Ужин" | "Прочее";

type Dish = {
  id: string;
  name: string;
  mealType: MealType;
  ingredients: string;
  recipe: string;
  rating: number;
  canTakeToWork: boolean;
  photos: string[];
};

const initialDishes: Dish[] = [
  {
    id: "breakfast-oatmeal",
    name: "Овсяная каша с фруктами",
    mealType: "Завтрак",
    ingredients: "Овсяные хлопья, молоко, банан, яблоко, мед",
    recipe:
      "Сварить овсяные хлопья на молоке. Нарезать фрукты и добавить сверху вместе с медом.",
    rating: 8,
    canTakeToWork: true,
    photos: [],
  },
  {
    id: "lunch-borscht",
    name: "Борщ",
    mealType: "Обед",
    ingredients: "Свекла, картофель, капуста, морковь, лук, томат",
    recipe:
      "Сварить бульон, добавить овощи по очереди и томат. Довести до готовности и дать настояться.",
    rating: 9,
    canTakeToWork: true,
    photos: [],
  },
  {
    id: "dinner-fish",
    name: "Запеченная рыба",
    mealType: "Ужин",
    ingredients: "Филе рыбы, лимон, специи, оливковое масло",
    recipe: "Замариновать рыбу со специями и лимоном, запекать 20-25 минут.",
    rating: 7,
    canTakeToWork: false,
    photos: [],
  },
];

const mealTypes: MealType[] = ["Завтрак", "Обед", "Ужин", "Прочее"];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [dishes, setDishes] = useState(initialDishes);
  const [searchTerm, setSearchTerm] = useState("");
  const [dishName, setDishName] = useState("");
  const [mealType, setMealType] = useState<MealType>("Завтрак");
  const [ingredients, setIngredients] = useState("");
  const [recipe, setRecipe] = useState("");
  const [rating, setRating] = useState("5");
  const [canTakeToWork, setCanTakeToWork] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const mealGroups = useMemo(
    () =>
      mealTypes.map((type) => {
        const query = searchTerm.trim().toLowerCase();
        const items = dishes.filter((dish) => {
          if (dish.mealType !== type) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            dish.name.toLowerCase().includes(query) ||
            dish.ingredients.toLowerCase().includes(query) ||
            dish.recipe.toLowerCase().includes(query)
          );
        });

        return [type, items] as const;
      }),
    [dishes, searchTerm],
  );
  const hasResults = mealGroups.some(([, items]) => items.length > 0);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!login.trim() || !password.trim()) {
      setLoginError("Введите логин и пароль.");
      return;
    }

    if (login.trim() !== "admin" || password !== "20032004") {
      setLoginError("Неверный логин или пароль.");
      return;
    }

    setLoginError("");
    setIsLoggedIn(true);
  };

  const handlePhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = event.target.files ? Array.from(event.target.files) : [];
    setPhotoFiles(nextFiles);
  };

  const resetDishForm = () => {
    setEditingDishId(null);
    setDishName("");
    setIngredients("");
    setRecipe("");
    setRating("5");
    setCanTakeToWork(false);
    setPhotoFiles([]);
  };

  const handleEditDish = (dish: Dish) => {
    setEditingDishId(dish.id);
    setDishName(dish.name);
    setMealType(dish.mealType);
    setIngredients(dish.ingredients);
    setRecipe(dish.recipe);
    setRating(String(dish.rating));
    setCanTakeToWork(dish.canTakeToWork);
    setPhotoFiles([]);
  };

  const handleDeleteDish = (dishId: string) => {
    setDishes((prevDishes) => prevDishes.filter((dish) => dish.id !== dishId));

    if (editingDishId === dishId) {
      resetDishForm();
    }
  };

  const handleCreateDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDish = dishName.trim();
    const trimmedIngredients = ingredients.trim();
    const trimmedRecipe = recipe.trim();
    const numericRating = Number(rating);

    if (!trimmedDish || !trimmedIngredients || !trimmedRecipe) {
      return;
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10) {
      return;
    }

    const hasNewPhotos = photoFiles.length > 0;
    const photos = hasNewPhotos
      ? (await Promise.all(photoFiles.map((file) => readFileAsDataUrl(file)))).filter(Boolean)
      : null;

    if (editingDishId) {
      setDishes((prevDishes) =>
        prevDishes.map((dish) =>
          dish.id === editingDishId
            ? {
                ...dish,
                name: trimmedDish,
                mealType,
                ingredients: trimmedIngredients,
                recipe: trimmedRecipe,
                rating: numericRating,
                canTakeToWork,
                photos: photos ?? dish.photos,
              }
            : dish,
        ),
      );

      resetDishForm();
      return;
    }

    setDishes((prevDishes) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: trimmedDish,
        mealType,
        ingredients: trimmedIngredients,
        recipe: trimmedRecipe,
        rating: numericRating,
        canTakeToWork,
        photos: photos ?? [],
      },
      ...prevDishes,
    ]);

    resetDishForm();
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Семейное меню</h1>
        {!isLoggedIn ? (
          <form className={styles.card} onSubmit={handleLoginSubmit}>
            <h2>Вход</h2>
            <label className={styles.field}>
              Логин
              <input value={login} onChange={(event) => setLogin(event.target.value)} />
            </label>
            <label className={styles.field}>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {loginError && <p className={styles.error}>{loginError}</p>}
            <button type="submit" className={styles.button}>
              Войти
            </button>
          </form>
        ) : (
          <div className={styles.content}>
            <form className={styles.card} onSubmit={handleCreateDish}>
              <h2>{editingDishId ? "Редактировать блюдо" : "Добавить блюдо"}</h2>
              <label className={styles.field}>
                Название блюда
                <input
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  placeholder="Например: Гречка с грибами"
                />
              </label>
              <label className={styles.field}>
                Категория
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value as MealType)}
                >
                  <option value="Завтрак">Завтрак</option>
                  <option value="Обед">Обед</option>
                  <option value="Ужин">Ужин</option>
                  <option value="Прочее">Прочее</option>
                </select>
              </label>
              <label className={styles.field}>
                Состав
                <textarea
                  value={ingredients}
                  onChange={(event) => setIngredients(event.target.value)}
                  placeholder="Например: курица, рис, морковь, специи"
                />
              </label>
              <label className={styles.field}>
                Подробный рецепт
                <textarea
                  value={recipe}
                  onChange={(event) => setRecipe(event.target.value)}
                  placeholder="Опишите шаги приготовления"
                />
              </label>
              <label className={styles.field}>
                Оценка (1-10)
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                />
              </label>
              <label className={`${styles.field} ${styles.checkboxField}`}>
                <input
                  type="checkbox"
                  checked={canTakeToWork}
                  onChange={(event) => setCanTakeToWork(event.target.checked)}
                />
                Можно брать на работу
              </label>
              <label className={styles.field}>
                Фото блюда (можно несколько)
                <input type="file" accept="image/*" multiple onChange={handlePhotosChange} />
              </label>
              <button type="submit" className={styles.button}>
                {editingDishId ? "Сохранить изменения" : "Добавить"}
              </button>
              {editingDishId && (
                <button type="button" className={styles.secondaryButton} onClick={resetDishForm}>
                  Отменить редактирование
                </button>
              )}
            </form>

            <section className={styles.card}>
              <h2>Что мы можем приготовить</h2>
              <label className={styles.field}>
                Поиск
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Искать по названию, составу или рецепту"
                />
              </label>
              <div className={styles.menuGrid}>
                {mealGroups.map(([meal, items]) => (
                  <div key={meal} className={styles.mealColumn}>
                    <h3>{meal}</h3>
                    {items.length === 0 ? (
                      <p className={styles.emptyState}>Нет блюд</p>
                    ) : (
                      <ul className={styles.dishList}>
                        {items.map((dish) => (
                          <li key={dish.id} className={styles.dishCard}>
                            <h4>{dish.name}</h4>
                            <p>
                              <strong>Состав:</strong> {dish.ingredients}
                            </p>
                            <p>
                              <strong>Рецепт:</strong> {dish.recipe}
                            </p>
                            <p>
                              <strong>Оценка:</strong> {dish.rating}/10
                            </p>
                            <p>
                              <strong>На работу:</strong>{" "}
                              {dish.canTakeToWork ? "Да" : "Нет"}
                            </p>
                            {dish.photos.length > 0 && (
                              <div className={styles.photoGrid}>
                                {dish.photos.map((photo, index) => (
                                  <Image
                                    key={`${dish.id}-photo-${index}`}
                                    src={photo}
                                    alt={`${dish.name} фото ${index + 1}`}
                                    width={320}
                                    height={220}
                                    sizes="(max-width: 900px) 50vw, 220px"
                                  />
                                ))}
                              </div>
                            )}
                            <div className={styles.dishActions}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => handleEditDish(dish)}
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                className={`${styles.secondaryButton} ${styles.dangerButton}`}
                                onClick={() => handleDeleteDish(dish.id)}
                              >
                                Удалить
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              {!hasResults && <p className={styles.emptyState}>По запросу ничего не найдено.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
