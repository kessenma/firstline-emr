// utils/s3-config.ts
import { S3Client } from "@aws-sdk/client-s3";

export interface S3Config {
  endpoint: string;
  key: string;
  secret: string;
  bucket: string;
  region: string;
}

export function validateS3Config(): S3Config | null {
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const key = process.env.OBJECT_STORAGE_KEY;
  const secret = process.env.OBJECT_STORAGE_SECRET;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const region = process.env.OBJECT_STORAGE_REGION || "fra1";

  // Check if any required config is missing or set to 'test'
  if (!endpoint || !key || !secret || !bucket ||
      endpoint === 'test' || key === 'test' || secret === 'test' || bucket === 'test') {
    console.error('[S3 CONFIG ERROR] Invalid S3 configuration detected:', {
      endpoint: endpoint || 'missing',
      hasKey: !!key && key !== 'test',
      hasSecret: !!secret && secret !== 'test',
      bucket: bucket || 'missing',
      region
    });
    return null;
  }

  return { endpoint, key, secret, bucket, region };
}

export function createS3Client(): S3Client | null {
  const config = validateS3Config();
  if (!config) {
    return null;
  }

  return new S3Client({
    endpoint: config.endpoint.startsWith("https://")
      ? config.endpoint
      : `https://${config.endpoint}`,
    region: config.region,
    credentials: {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
    },
    forcePathStyle: true, // IMPORTANT for MinIO
  });
}

export function getS3ConfigErrorResponse() {
  return {
    error: "S3 configuration error",
    message: "Please configure DigitalOcean Spaces credentials in environment variables. Check that OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_KEY, OBJECT_STORAGE_SECRET, and OBJECT_STORAGE_BUCKET are properly set and not 'test' values.",
    troubleshooting: {
      steps: [
        "1. Set OBJECT_STORAGE_ENDPOINT to your DigitalOcean Spaces endpoint (e.g., 'fra1.digitaloceanspaces.com')",
        "2. Set OBJECT_STORAGE_KEY to your Spaces access key",
        "3. Set OBJECT_STORAGE_SECRET to your Spaces secret key",
        "4. Set OBJECT_STORAGE_BUCKET to your bucket name",
        "5. Restart your application after updating environment variables"
      ]
    }
  };
}