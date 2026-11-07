"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

type MealType = "Завтрак" | "Обед" | "Ужин";

const initialMenu: Record<MealType, string[]> = {
  Завтрак: ["Овсяная каша", "Сырники"],
  Обед: ["Борщ", "Курица с рисом"],
  Ужин: ["Овощной салат", "Запеченная рыба"],
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [menu, setMenu] = useState(initialMenu);
  const [dishName, setDishName] = useState("");
  const [mealType, setMealType] = useState<MealType>("Завтрак");

  const mealGroups = useMemo(() => Object.entries(menu) as [MealType, string[]][], [menu]);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!login.trim() || !password.trim()) {
      setLoginError("Введите логин и пароль.");
      return;
    }

    setLoginError("");
    setIsLoggedIn(true);
  };

  const handleCreateDish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDish = dishName.trim();
    if (!trimmedDish) {
      return;
    }

    setMenu((prevMenu) => ({
      ...prevMenu,
      [mealType]: [...prevMenu[mealType], trimmedDish],
    }));
    setDishName("");
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
              <h2>Добавить блюдо</h2>
              <label className={styles.field}>
                Название блюда
                <input
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                  placeholder="Например: Гречка с грибами"
                />
              </label>
              <label className={styles.field}>
                Прием пищи
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value as MealType)}
                >
                  <option value="Завтрак">Завтрак</option>
                  <option value="Обед">Обед</option>
                  <option value="Ужин">Ужин</option>
                </select>
              </label>
              <button type="submit" className={styles.button}>
                Добавить
              </button>
            </form>

            <section className={styles.card}>
              <h2>Что мы можем приготовить</h2>
              <div className={styles.menuGrid}>
                {mealGroups.map(([meal, dishes]) => (
                  <div key={meal}>
                    <h3>{meal}</h3>
                    <ul>
                      {dishes.map((dish, index) => (
                        <li key={`${meal}-${dish}-${index}`}>{dish}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
