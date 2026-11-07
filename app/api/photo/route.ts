import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  STORAGE_BUCKET,
  getMissingStorageEnv,
  getStorageClient,
} from "@/lib/neon-services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key")?.trim();

  if (!key) {
    return NextResponse.json({ error: "Photo key is required." }, { status: 400 });
  }

  try {
    const missing = getMissingStorageEnv();
    if (missing.length) {
      return NextResponse.json(
        {
          error: "Storage environment variables are missing. Run neon env pull and restart the app.",
          missing,
        },
        { status: 500 },
      );
    }

    const s3 = getStorageClient();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
      }),
    );

    if (!response.Body) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return new Response(response.Body.transformToWebStream(), {
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Photo download failed:", error);
    const message = String(error);
    const errorMessage = message.includes("NoSuchBucket")
      ? `Bucket "${STORAGE_BUCKET}" не создан в Neon Object Storage. Выполните neon deploy.`
      : "Не удалось получить фото из S3-хранилища.";
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
