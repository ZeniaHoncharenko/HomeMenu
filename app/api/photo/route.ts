import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  STORAGE_BUCKET,
  getMissingNeonEnv,
  getStorageClient,
} from "@/lib/neon-services";

export async function GET(request: Request) {
  const missing = getMissingNeonEnv();
  if (missing.length) {
    return NextResponse.json(
      {
        error:
          "Neon environment variables are missing. Run neon deploy/neon env pull and restart the app.",
        missing,
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key")?.trim();

  if (!key) {
    return NextResponse.json({ error: "Photo key is required." }, { status: 400 });
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
}
