import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import {
  STORAGE_BUCKET,
  getMissingNeonEnv,
  getStorageClient,
} from "@/lib/neon-services";

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!files.length) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  const s3 = getStorageClient();
  const uploaded = [] as { key: string; url: string }[];

  for (const file of files) {
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const fileName = sanitizeFileName(file.name);
    const key = `dishes/${randomUUID()}-${fileName}.${extension ?? "bin"}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type || "application/octet-stream",
      }),
    );

    uploaded.push({ key, url: `/api/photo?key=${encodeURIComponent(key)}` });
  }

  return NextResponse.json({ files: uploaded });
}
