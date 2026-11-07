"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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
  photoKeys: string[];
};

const mealTypes: MealType[] = ["Завтрак", "Обед", "Ужин", "Прочее"];

const emptyDishForm = {
  dishName: "",
  mealType: "Завтрак" as MealType,
  ingredients: "",
  recipe: "",
  rating: "5",
  canTakeToWork: false,
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [dishName, setDishName] = useState(emptyDishForm.dishName);
  const [mealType, setMealType] = useState<MealType>(emptyDishForm.mealType);
  const [ingredients, setIngredients] = useState(emptyDishForm.ingredients);
  const [recipe, setRecipe] = useState(emptyDishForm.recipe);
  const [rating, setRating] = useState(emptyDishForm.rating);
  const [canTakeToWork, setCanTakeToWork] = useState(emptyDishForm.canTakeToWork);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editingPhotoKeys, setEditingPhotoKeys] = useState<string[]>([]);

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

  const resetDishForm = () => {
    setEditingDishId(null);
    setEditingPhotoKeys([]);
    setDishName(emptyDishForm.dishName);
    setMealType(emptyDishForm.mealType);
    setIngredients(emptyDishForm.ingredients);
    setRecipe(emptyDishForm.recipe);
    setRating(emptyDishForm.rating);
    setCanTakeToWork(emptyDishForm.canTakeToWork);
    setPhotoFiles([]);
  };

  const loadDishes = async () => {
    setIsLoading(true);
    setDataError("");

    try {
      const response = await fetch("/api/dishes", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось загрузить блюда.");
      }

      setDishes(Array.isArray(payload.dishes) ? payload.dishes : []);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Не удалось загрузить блюда.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    void loadDishes();
  }, [isLoggedIn]);

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

  const handleEditDish = (dish: Dish) => {
    setEditingDishId(dish.id);
    setEditingPhotoKeys(dish.photoKeys);
    setDishName(dish.name);
    setMealType(dish.mealType);
    setIngredients(dish.ingredients);
    setRecipe(dish.recipe);
    setRating(String(dish.rating));
    setCanTakeToWork(dish.canTakeToWork);
    setPhotoFiles([]);
  };

  const handleDeleteDish = async (dishId: string) => {
    setDataError("");

    try {
      const response = await fetch(`/api/dishes?id=${encodeURIComponent(dishId)}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось удалить блюдо.");
      }

      setDishes((prevDishes) => prevDishes.filter((dish) => dish.id !== dishId));

      if (editingDishId === dishId) {
        resetDishForm();
      }
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Не удалось удалить блюдо.");
    }
  };

  const uploadPhotos = async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Не удалось загрузить фото.");
    }

    if (!Array.isArray(payload.files)) {
      return [] as string[];
    }

    return payload.files
      .map((item: { key?: string }) => item.key)
      .filter((item: string | undefined): item is string => Boolean(item));
  };

  const handleCreateDish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDataError("");

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

    try {
      const photoKeys = photoFiles.length > 0 ? await uploadPhotos(photoFiles) : editingPhotoKeys;
      const response = await fetch("/api/dishes", {
        method: editingDishId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingDishId ?? undefined,
          name: trimmedDish,
          mealType,
          ingredients: trimmedIngredients,
          recipe: trimmedRecipe,
          rating: numericRating,
          canTakeToWork,
          photoKeys,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось сохранить блюдо.");
      }

      const savedDish: Dish | undefined = payload.dish;
      if (!savedDish) {
        throw new Error("Ответ сервера не содержит блюдо.");
      }

      setDishes((prevDishes) =>
        editingDishId
          ? prevDishes.map((dish) => (dish.id === editingDishId ? savedDish : dish))
          : [savedDish, ...prevDishes],
      );

      resetDishForm();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Не удалось сохранить блюдо.");
    }
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
              {isLoading && <p className={styles.emptyState}>Загрузка блюд...</p>}
              {dataError && <p className={styles.error}>{dataError}</p>}
              {!isLoading && (
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
                                <strong>На работу:</strong> {dish.canTakeToWork ? "Да" : "Нет"}
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
              )}
              {!isLoading && !hasResults && (
                <p className={styles.emptyState}>По запросу ничего не найдено.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
