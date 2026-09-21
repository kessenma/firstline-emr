// scripts/fix-malformed-patient-data.ts
// Utility script to identify and fix malformed patient data in the database
// Run with: bun run scripts/fix-malformed-patient-data.ts

import { db } from "../db";
import { patients } from "../db/schema";
import { sql } from "drizzle-orm";

type PatientData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: any;
  triagedBy: any;
  doctor: any;
  specialties: any;
};

async function checkMalformedData() {
  console.log("🔍 Scanning for malformed patient data...\n");

  const allPatients = await db
    .select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      triagedBy: patients.triagedBy,
      careTeam: patients.careTeam,
      specialties: patients.specialties,
    })
    .from(patients);

  console.log(`📊 Total patients found: ${allPatients.length}\n`);

  const issues: Array<{
    patientId: string;
    patientName: string;
    field: string;
    issue: string;
    currentValue: any;
  }> = [];

  for (const patient of allPatients) {
    const patientName =
      `${patient.firstName || ""} ${patient.lastName || ""}`.trim() ||
      patient.id;

    // Check phone field
    if (patient.phone !== null) {
      if (typeof patient.phone === "string") {
        issues.push({
          patientId: patient.id,
          patientName,
          field: "phone",
          issue: "Stored as string instead of object",
          currentValue: patient.phone,
        });
      } else if (typeof patient.phone === "object") {
        const phoneObj = patient.phone as any;
        if (!phoneObj.countryCode || !phoneObj.phoneNumber) {
          issues.push({
            patientId: patient.id,
            patientName,
            field: "phone",
            issue: "Missing required fields (countryCode or phoneNumber)",
            currentValue: patient.phone,
          });
        } else if (
          typeof phoneObj.countryCode !== "string" ||
          typeof phoneObj.phoneNumber !== "string"
        ) {
          issues.push({
            patientId: patient.id,
            patientName,
            field: "phone",
            issue: "Fields are not strings",
            currentValue: patient.phone,
          });
        } else if (
          phoneObj.countryCode.trim() === "" ||
          phoneObj.phoneNumber.trim() === ""
        ) {
          issues.push({
            patientId: patient.id,
            patientName,
            field: "phone",
            issue: "Empty countryCode or phoneNumber (should be null instead)",
            currentValue: patient.phone,
          });
        }
      }
    }

    // Check triagedBy field
    if (patient.triagedBy !== null && typeof patient.triagedBy !== "object") {
      issues.push({
        patientId: patient.id,
        patientName,
        field: "triagedBy",
        issue: "Not an object",
        currentValue: patient.triagedBy,
      });
    }

    // Check careTeam field
    if (patient.careTeam !== null && !Array.isArray(patient.careTeam)) {
      issues.push({
        patientId: patient.id,
        patientName,
        field: "careTeam",
        issue: "Not an array",
        currentValue: patient.careTeam,
      });
    }

    // Check specialties array field
    if (patient.specialties !== null) {
      if (!Array.isArray(patient.specialties)) {
        issues.push({
          patientId: patient.id,
          patientName,
          field: "specialties",
          issue: "Not an array",
          currentValue: patient.specialties,
        });
      } else if (!patient.specialties.every((s) => typeof s === "string")) {
        issues.push({
          patientId: patient.id,
          patientName,
          field: "specialties",
          issue: "Contains non-string values",
          currentValue: patient.specialties,
        });
      }
    }
  }

  if (issues.length === 0) {
    console.log("✅ No malformed data found! All patient records are valid.\n");
    return [];
  }

  console.log(`⚠️  Found ${issues.length} issues:\n`);

  // Group issues by field
  const issuesByField = issues.reduce(
    (acc, issue) => {
      if (!acc[issue.field]) {
        acc[issue.field] = [];
      }
      acc[issue.field].push(issue);
      return acc;
    },
    {} as Record<string, typeof issues>,
  );

  // Display issues grouped by field
  for (const [field, fieldIssues] of Object.entries(issuesByField)) {
    console.log(
      `\n📌 ${field.toUpperCase()} field issues (${fieldIssues.length}):`,
    );
    console.log("─".repeat(80));

    fieldIssues.forEach((issue, index) => {
      console.log(
        `\n${index + 1}. Patient: ${issue.patientName} (ID: ${issue.patientId})`,
      );
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Current value:`, JSON.stringify(issue.currentValue));
    });
  }

  return issues;
}

async function fixMalformedData(dryRun: boolean = true) {
  const issues = await checkMalformedData();

  if (issues.length === 0) {
    return;
  }

  console.log("\n" + "=".repeat(80));
  if (dryRun) {
    console.log("\n🔧 DRY RUN MODE - No changes will be made to the database");
    console.log(
      "Run with 'fix' argument to apply fixes: bun run scripts/fix-malformed-patient-data.ts fix\n",
    );
  } else {
    console.log("\n🔧 APPLYING FIXES TO DATABASE...\n");
  }

  let fixCount = 0;

  for (const issue of issues) {
    console.log(
      `\n${dryRun ? "Would fix" : "Fixing"}: ${issue.patientName} - ${issue.field}`,
    );

    if (!dryRun) {
      try {
        // Apply fix based on field type
        if (
          issue.field === "phone" ||
          issue.field === "triagedBy" ||
          issue.field === "doctor"
        ) {
          // Set JSON fields to null if malformed
          await db
            .update(patients)
            .set({ [issue.field]: null })
            .where(sql`${patients.id} = ${issue.patientId}`);

          console.log(`  ✓ Set ${issue.field} to null`);
        } else if (issue.field === "specialties") {
          // Fix specialties array
          if (!Array.isArray(issue.currentValue)) {
            await db
              .update(patients)
              .set({ specialties: null })
              .where(sql`${patients.id} = ${issue.patientId}`);
            console.log(`  ✓ Set specialties to null`);
          } else {
            // Filter out non-string values
            const filtered = issue.currentValue.filter(
              (s: any) => typeof s === "string",
            );
            await db
              .update(patients)
              .set({ specialties: filtered.length > 0 ? filtered : null })
              .where(sql`${patients.id} = ${issue.patientId}`);
            console.log(`  ✓ Filtered specialties array`);
          }
        }
        fixCount++;
      } catch (error) {
        console.error(`  ✗ Error fixing ${issue.field}:`, error);
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  if (dryRun) {
    console.log(
      `\n📋 Summary: Found ${issues.length} issues that can be fixed`,
    );
  } else {
    console.log(
      `\n✅ Summary: Fixed ${fixCount} out of ${issues.length} issues`,
    );
  }
  console.log();
}

// Main execution
const args = process.argv.slice(2);
const shouldFix = args.includes("fix") || args.includes("--fix");

fixMalformedData(!shouldFix)
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
