import { S3Client } from "@aws-sdk/client-s3";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

export const STORAGE_BUCKET = "assets";

let pool: Pool | null = null;
let s3: S3Client | null = null;

const requiredEnv = [
  "DATABASE_URL",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_ENDPOINT_URL_S3",
  "AWS_REGION",
] as const;

const getMissingEnv = () =>
  requiredEnv.filter((key) => {
    const value = process.env[key];
    return !value || !value.trim();
  });

export const getMissingNeonEnv = () => getMissingEnv();

export const getDatabasePool = () => {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  attachDatabasePool(pool);

  return pool;
};

export const getStorageClient = () => {
  if (s3) return s3;

  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS object storage environment variables are not configured.");
  }

  s3 = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3;
};
