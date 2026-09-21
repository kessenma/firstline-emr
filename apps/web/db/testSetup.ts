// db/testSetup.ts
import { db, testConnection } from './connection';
import { users, admins, patients, notes, visits } from './schema';
import { eq, count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function testDatabaseSetup() {
  console.log('\n🧪 Testing PostgreSQL Database Setup\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Connection
    console.log('\n1️⃣ Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Test 2: Count existing records
    console.log('\n2️⃣ Checking existing records...');
    const [{ count: userCount }] = await db.select({ count: count() }).from(users);
    const [{ count: patientCount }] = await db.select({ count: count() }).from(patients);
    const [{ count: noteCount }] = await db.select({ count: count() }).from(notes);

    console.log(`   📊 Users: ${userCount}`);
    console.log(`   📊 Patients: ${patientCount}`);
    console.log(`   📊 Notes: ${noteCount}`);

    // Test 3: Create a test user
    console.log('\n3️⃣ Testing user creation...');
    const testEmail = `test.user.${Date.now()}@example.com`;
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const [newUser] = await db.insert(users).values({
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      accountType: 'Doctor',
      password: hashedPassword,
      authorized: true,
      doctorSpecialty: ['General Medicine'],
      languages: ['English'],
      countries: ['United States'],
    }).returning();

    console.log(`   ✅ Created user: ${newUser.firstName} ${newUser.lastName} (${newUser.email})`);
    console.log(`   🆔 User ID: ${newUser.id}`);

    // Test 4: Create test patient
    console.log('\n4️⃣ Testing patient creation...');
    const [newPatient] = await db.insert(patients).values({
      firstName: 'John',
      lastName: 'Doe',
      email: `patient.${Date.now()}@example.com`,
      gender: 'Male',
      status: 'Pre-Op / Not Cleared',
      coordinatorId: newUser.id,
      phone: {
        countryCode: '+1',
        phoneNumber: '5555551234',
      },
    }).returning();

    console.log(`   ✅ Created patient: ${newPatient.firstName} ${newPatient.lastName}`);
    console.log(`   🆔 Patient ID: ${newPatient.id}`);

    // Test 5: Create a note for the patient
    console.log('\n5️⃣ Testing note creation...');
    const [newNote] = await db.insert(notes).values({
      patientId: newPatient.id,
      email: newPatient.email!,
      noteType: 'blank',
      authorName: `${newUser.firstName} ${newUser.lastName}`,
      authorId: newUser.id,
      content: {
        noteField: 'This is a test note created during setup verification.',
      },
      draft: false,
    }).returning();

    console.log(`   ✅ Created note: ${newNote.noteType} (ID: ${newNote.id})`);

    // Test 6: Query with relations
    console.log('\n6️⃣ Testing relational queries...');
    const patientWithData = await db.query.patients.findFirst({
      where: (patients, { eq }) => eq(patients.id, newPatient.id),
      with: {
        coordinator: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        notes: true,
      },
    });

    if (patientWithData) {
      console.log(`   ✅ Found patient with coordinator: ${patientWithData.coordinator?.firstName} ${patientWithData.coordinator?.lastName}`);
      console.log(`   ✅ Patient has ${patientWithData.notes.length} note(s)`);
    }

    // Test 7: Update operations
    console.log('\n7️⃣ Testing update operations...');
    await db
      .update(patients)
      .set({
        status: 'Pre-Op / Cleared',
        updatedAt: new Date(),
      })
      .where(eq(patients.id, newPatient.id));

    const updatedPatient = await db.query.patients.findFirst({
      where: (patients, { eq }) => eq(patients.id, newPatient.id),
    });

    console.log(`   ✅ Updated patient status: ${updatedPatient?.status}`);

    // Test 8: Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');

    // Delete note (will cascade from patient delete, but being explicit)
    await db.delete(notes).where(eq(notes.id, newNote.id));
    console.log(`   🗑️  Deleted test note`);

    // Delete patient
    await db.delete(patients).where(eq(patients.id, newPatient.id));
    console.log(`   🗑️  Deleted test patient`);

    // Delete user
    await db.delete(users).where(eq(users.id, newUser.id));
    console.log(`   🗑️  Deleted test user`);

    // Final report
    console.log('\n' + '='.repeat(50));
    console.log('\n✅ All tests passed successfully!\n');
    console.log('Your PostgreSQL database is ready to use.');
    console.log('\nNext steps:');
    console.log('  1. Run "pnpm db:studio" to explore your database visually');
    console.log('  2. Start migrating data from MongoDB');
    console.log('  3. Update your API routes to use the new schema');
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nPlease check:');
    console.error('  1. Database connection string is correct');
    console.error('  2. Migrations have been applied (pnpm db:migrate)');
    console.error('  3. PostgreSQL server is running and accessible\n');
    process.exit(1);
  }
}

// Run tests
runTests();

async function runTests() {
  try {
    await testDatabaseSetup();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}
