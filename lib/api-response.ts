export type ApiPayload = {
  error?: string;
  [key: string]: unknown;
};

export const readApiResponse = async <T extends ApiPayload = ApiPayload>(
  response: Response,
): Promise<T> => {
  const text = await response.text();

  if (!text.trim()) {
    return { error: `Сервер вернул пустой ответ (${response.status}).` } as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      error: `Сервер вернул некорректный ответ (${response.status}).`,
    } as T;
  }
};
