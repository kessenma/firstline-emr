/**
 * 🔍 STORAGE SERVICE DIAGNOSTIC TOOL
 *
 * Run this to diagnose object storage connection issues
 *
 * Usage:
 *   node --loader ts-node/esm apps/web/lib/storage/diagnose-storage.ts
 */

import {
  S3Client,
  ListBucketsCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

interface DiagnosticResult {
  step: string;
  status: "✅ PASS" | "❌ FAIL" | "⚠️ WARN";
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function log(result: DiagnosticResult) {
  results.push(result);
  console.log(`${result.status} ${result.step}: ${result.message}`);
  if (result.details) {
    console.log("   Details:", result.details);
  }
}

async function diagnose() {
  console.log("\n🔍 OBJECT STORAGE DIAGNOSTIC TOOL\n");
  console.log("=" .repeat(70));

  // Step 1: Check environment variables
  console.log("\n📋 STEP 1: Checking Environment Variables\n");

  const requiredVars = [
    "OBJECT_STORAGE_ENDPOINT",
    "OBJECT_STORAGE_KEY",
    "OBJECT_STORAGE_SECRET",
    "OBJECT_STORAGE_BUCKET",
    "OBJECT_STORAGE_REGION",
  ];

  const envConfig: Record<string, string> = {};

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      log({
        step: `ENV: ${varName}`,
        status: "❌ FAIL",
        message: "Missing required environment variable",
      });
    } else {
      envConfig[varName] = value;
      // Mask sensitive values
      const displayValue =
        varName.includes("KEY") || varName.includes("SECRET")
          ? value.substring(0, 4) + "..." + value.substring(value.length - 4)
          : value;
      log({
        step: `ENV: ${varName}`,
        status: "✅ PASS",
        message: "Environment variable set",
        details: { value: displayValue },
      });
    }
  }

  // Check for common endpoint issues
  const endpoint = envConfig.OBJECT_STORAGE_ENDPOINT;
  if (endpoint) {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      log({
        step: "ENV: ENDPOINT FORMAT",
        status: "⚠️ WARN",
        message: "Endpoint should NOT include protocol (http:// or https://)",
        details: {
          current: endpoint,
          expected: endpoint.replace(/^https?:\/\//, ""),
        },
      });
    } else {
      log({
        step: "ENV: ENDPOINT FORMAT",
        status: "✅ PASS",
        message: "Endpoint format is correct (no protocol prefix)",
      });
    }
  }

  // Check bucket name validity
  const bucket = envConfig.OBJECT_STORAGE_BUCKET;
  if (bucket) {
    // S3 bucket naming rules
    const bucketRegex = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
    if (!bucketRegex.test(bucket)) {
      log({
        step: "ENV: BUCKET NAME",
        status: "❌ FAIL",
        message: "Invalid bucket name format",
        details: {
          bucket,
          rules: [
            "Must be 3-63 characters",
            "Only lowercase letters, numbers, dots, and hyphens",
            "Must start and end with letter or number",
          ],
        },
      });
    } else {
      log({
        step: "ENV: BUCKET NAME",
        status: "✅ PASS",
        message: "Bucket name format is valid",
      });
    }
  }

  // Step 2: Test S3 Client Creation
  console.log("\n🔧 STEP 2: Creating S3 Client\n");

  let s3Client: S3Client;

  try {
    const endpointUrl = endpoint?.startsWith("http")
      ? endpoint
      : `https://${endpoint}`;

    s3Client = new S3Client({
      endpoint: endpointUrl,
      region: envConfig.OBJECT_STORAGE_REGION || "us-east-1",
      credentials: {
        accessKeyId: envConfig.OBJECT_STORAGE_KEY!,
        secretAccessKey: envConfig.OBJECT_STORAGE_SECRET!,
      },
      forcePathStyle: true,
      // Add timeout and retry configuration
      requestHandler: {
        connectionTimeout: 5000,
        socketTimeout: 5000,
      } as any,
    });

    log({
      step: "S3 CLIENT",
      status: "✅ PASS",
      message: "S3 client created successfully",
      details: {
        endpoint: endpointUrl,
        region: envConfig.OBJECT_STORAGE_REGION || "us-east-1",
        forcePathStyle: true,
      },
    });
  } catch (error) {
    log({
      step: "S3 CLIENT",
      status: "❌ FAIL",
      message: "Failed to create S3 client",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return;
  }

  // Step 3: Test Connection - List Buckets
  console.log("\n🌐 STEP 3: Testing Connection (ListBuckets)\n");

  try {
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    log({
      step: "LIST BUCKETS",
      status: "✅ PASS",
      message: "Successfully connected to object storage",
      details: {
        bucketCount: listBucketsResponse.Buckets?.length || 0,
        buckets: listBucketsResponse.Buckets?.map((b) => b.Name) || [],
      },
    });
  } catch (error: any) {
    log({
      step: "LIST BUCKETS",
      status: "❌ FAIL",
      message: "Failed to list buckets",
      details: {
        error: error.message,
        code: error.Code || error.code || error.$metadata?.httpStatusCode,
        stack: error.stack,
      },
    });
  }

  // Step 4: Check if target bucket exists
  console.log("\n🪣 STEP 4: Checking Target Bucket\n");

  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      }),
    );
    log({
      step: "BUCKET EXISTS",
      status: "✅ PASS",
      message: `Bucket '${bucket}' exists and is accessible`,
    });
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      log({
        step: "BUCKET EXISTS",
        status: "❌ FAIL",
        message: `Bucket '${bucket}' does not exist`,
        details: {
          suggestion: "Create the bucket using RustFS console or AWS CLI",
        },
      });
    } else if (
      error.name === "Forbidden" ||
      error.$metadata?.httpStatusCode === 403
    ) {
      log({
        step: "BUCKET EXISTS",
        status: "❌ FAIL",
        message: `Access denied to bucket '${bucket}'`,
        details: {
          suggestion: "Check your access key and secret key permissions",
        },
      });
    } else {
      log({
        step: "BUCKET EXISTS",
        status: "❌ FAIL",
        message: `Failed to check bucket '${bucket}'`,
        details: {
          error: error.message,
          code: error.Code || error.code || error.$metadata?.httpStatusCode,
        },
      });
    }
  }

  // Step 5: Test Upload (small file)
  console.log("\n📤 STEP 5: Testing Upload\n");

  try {
    const testContent = Buffer.from(
      JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
        message: "Diagnostic test file",
      }),
    );

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: "diagnostic-test/test.json",
        Body: testContent,
        ContentType: "application/json",
      }),
    );

    log({
      step: "TEST UPLOAD",
      status: "✅ PASS",
      message: "Successfully uploaded test file",
      details: {
        path: `${bucket}/diagnostic-test/test.json`,
        size: testContent.length,
      },
    });
  } catch (error: any) {
    log({
      step: "TEST UPLOAD",
      status: "❌ FAIL",
      message: "Failed to upload test file",
      details: {
        error: error.message,
        code: error.Code || error.code || error.$metadata?.httpStatusCode,
        stack: error.stack,
      },
    });
  }

  // Final Summary
  console.log("\n" + "=".repeat(70));
  console.log("\n📊 DIAGNOSTIC SUMMARY\n");

  const passed = results.filter((r) => r.status === "✅ PASS").length;
  const failed = results.filter((r) => r.status === "❌ FAIL").length;
  const warnings = results.filter((r) => r.status === "⚠️ WARN").length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Warnings: ${warnings}`);

  if (failed > 0) {
    console.log("\n🔴 ISSUES FOUND - Please review the failed tests above");
  } else if (warnings > 0) {
    console.log(
      "\n🟡 ALL TESTS PASSED - But there are warnings to review",
    );
  } else {
    console.log("\n🟢 ALL TESTS PASSED - Object storage is configured correctly");
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

// Run diagnostics
diagnose().catch((error) => {
  console.error("\n💥 DIAGNOSTIC TOOL CRASHED:", error);
  process.exit(1);
});
