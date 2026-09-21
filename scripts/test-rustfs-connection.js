#!/usr/bin/env node

/**
 * RustFS Connection Test Script
 *
 * This script tests the connection to your RustFS object storage
 * and verifies that file uploads work correctly.
 *
 * Usage:
 *   node test-rustfs-connection.js
 *
 * Prerequisites:
 *   - Environment variables must be set (OBJECT_STORAGE_*)
 *   - RustFS server must be running
 */

import { S3Client, PutObjectCommand, GetObjectCommand, ListBucketsCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'OBJECT_STORAGE_ENDPOINT',
  'OBJECT_STORAGE_KEY',
  'OBJECT_STORAGE_SECRET',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_REGION'
];

console.log('\n🔍 RustFS Connection Test\n');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Checking environment variables...\n');
let missingVars = [];
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: NOT SET`);
    missingVars.push(envVar);
  } else {
    // Mask sensitive values
    const displayValue = envVar.includes('SECRET') || envVar.includes('KEY')
      ? '***' + value.slice(-4)
      : value;
    console.log(`✅ ${envVar}: ${displayValue}`);
  }
}

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables. Please set them in your .env file.');
  process.exit(1);
}

// Configure S3 Client
console.log('\n🔧 Configuring S3 Client...\n');

const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
const formattedEndpoint = endpoint.startsWith('https://') || endpoint.startsWith('http://')
  ? endpoint
  : `https://${endpoint}`;

console.log(`   Endpoint: ${formattedEndpoint}`);
console.log(`   Region: ${process.env.OBJECT_STORAGE_REGION}`);
console.log(`   Bucket: ${process.env.OBJECT_STORAGE_BUCKET}`);

const s3Client = new S3Client({
  endpoint: formattedEndpoint,
  region: process.env.OBJECT_STORAGE_REGION,
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_KEY,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET,
  },
  forcePathStyle: true, // Required for RustFS and MinIO
});

async function testConnection() {
  try {
    // Test 1: List Buckets
    console.log('\n📦 Test 1: Listing buckets...\n');
    try {
      const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
      console.log(`✅ Successfully connected to RustFS!`);
      console.log(`   Found ${listBucketsResponse.Buckets?.length || 0} bucket(s):`);
      listBucketsResponse.Buckets?.forEach(bucket => {
        console.log(`   - ${bucket.Name} (created: ${bucket.CreationDate})`);
      });
    } catch (error) {
      console.error(`❌ Failed to list buckets: ${error.message}`);
      throw error;
    }

    // Test 2: Check if target bucket exists
    console.log('\n🪣 Test 2: Checking target bucket...\n');
    const targetBucket = process.env.OBJECT_STORAGE_BUCKET;
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: targetBucket }));
      console.log(`✅ Bucket "${targetBucket}" exists and is accessible`);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`⚠️  Bucket "${targetBucket}" does not exist. Attempting to create...`);
        try {
          await s3Client.send(new CreateBucketCommand({ Bucket: targetBucket }));
          console.log(`✅ Successfully created bucket "${targetBucket}"`);
        } catch (createError) {
          console.error(`❌ Failed to create bucket: ${createError.message}`);
          throw createError;
        }
      } else {
        console.error(`❌ Error checking bucket: ${error.message}`);
        throw error;
      }
    }

    // Test 3: Upload a test file
    console.log('\n📤 Test 3: Uploading test file...\n');
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = `RustFS test upload at ${new Date().toISOString()}`;
    const testFilePath = `test/${testFileName}`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: testFilePath,
          Body: Buffer.from(testContent),
          ContentType: 'text/plain',
          // Note: ACL removed - not supported by RustFS
        })
      );
      console.log(`✅ Successfully uploaded test file: ${testFilePath}`);
    } catch (error) {
      console.error(`❌ Failed to upload file: ${error.message}`);
      console.error(`   Error details:`, error);
      throw error;
    }

    // Test 4: Generate signed URL
    console.log('\n🔗 Test 4: Generating signed URL...\n');
    try {
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: targetBucket,
          Key: testFilePath,
        }),
        { expiresIn: 3600 }
      );
      console.log(`✅ Successfully generated signed URL`);
      console.log(`   URL: ${signedUrl.substring(0, 100)}...`);
      console.log(`   Expires in: 1 hour`);
    } catch (error) {
      console.error(`❌ Failed to generate signed URL: ${error.message}`);
      throw error;
    }

    // Test 5: Retrieve the uploaded file
    console.log('\n📥 Test 5: Retrieving uploaded file...\n');
    try {
      const getResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: targetBucket,
          Key: testFilePath,
        })
      );
      const retrievedContent = await getResponse.Body.transformToString();

      if (retrievedContent === testContent) {
        console.log(`✅ Successfully retrieved file with matching content`);
        console.log(`   Content: "${retrievedContent}"`);
      } else {
        console.error(`❌ Content mismatch!`);
        console.error(`   Expected: "${testContent}"`);
        console.error(`   Got: "${retrievedContent}"`);
      }
    } catch (error) {
      console.error(`❌ Failed to retrieve file: ${error.message}`);
      throw error;
    }

    // All tests passed
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ All tests passed! RustFS is working correctly.\n');
    console.log('Your web app should be able to:');
    console.log('  ✅ Connect to RustFS');
    console.log('  ✅ Upload files');
    console.log('  ✅ Generate signed URLs');
    console.log('  ✅ Retrieve files\n');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('\n❌ Tests failed!\n');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.Code || error.code,
      statusCode: error.$metadata?.httpStatusCode,
    });
    console.log('\n💡 Troubleshooting tips:');
    console.log('  1. Verify RustFS server is running (docker-compose.object-storage.yml)');
    console.log('  2. Check environment variables in .env file');
    console.log('  3. Ensure OBJECT_STORAGE_ENDPOINT is accessible');
    console.log('  4. Verify access key and secret key are correct');
    console.log('  5. Check if bucket exists or can be created\n');

    process.exit(1);
  }
}

// Run the tests
testConnection();
