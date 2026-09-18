/**
 * Smart Campus Management System
 * End-to-End Automated API Integration & Workflow Test Suite
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  Running Smart Campus End-to-End API Test Suite');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    process.stdout.write(`• ${desc} ... `);
    try {
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log(`FAILED ✗ (${err.message})`);
      failed++;
    }
  }

  let adminToken = '';
  let staffToken = '';
  let studentToken = '';
  let staffId = null;
  let createdIssueId = null;

  // 1. Health Check
  await assert('API Health check responds with healthy status', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    if (!res.ok || data.status !== 'healthy') throw new Error('Health check failed');
  });

  // 2. Admin Login
  await assert('Admin logs in with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartcampus.edu', password: 'Admin@123' })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) throw new Error(json.message);
    adminToken = json.data.token;
  });

  // 3. Staff Login
  await assert('Staff logs in with valid credentials', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff.it@smartcampus.edu', password: 'Staff@123' })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) throw new Error(json.message);
    staffToken = json.data.token;
    staffId = json.data.user.staff_id;
  });

  // 4. Student Registration
  const testStudentEmail = `test.student.${Date.now()}@smartcampus.edu`;
  const testRoll = `TEST-${Date.now().toString().slice(-6)}`;
  await assert('New student registers account', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Automated Test Student',
        email: testStudentEmail,
        password: 'Password@123',
        phone: '+1 555-9999',
        roll_number: testRoll,
        department: 'Computer Science & Engineering',
        semester: '5th Semester',
        hostel_block: 'Block A (Boys Hostel)',
        room_number: 'A-303'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.token) throw new Error(json.message);
    studentToken = json.data.token;
  });

  // 5. Fetch Categories
  let testCategoryId = 1;
  await assert('Fetch campus categories', async () => {
    const res = await fetch(`${BASE_URL}/categories`);
    const json = await res.json();
    if (!json.success || json.data.categories.length === 0) throw new Error('No categories returned');
    testCategoryId = json.data.categories[0].id;
  });

  // 6. Student creates an issue
  await assert('Student reports a new campus issue', async () => {
    // We send json payload
    const res = await fetch(`${BASE_URL}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Network Switch Overheating in Server Room',
        description: 'Auxiliary fan has stalled, causing thermal throttles on router switches.',
        category_id: testCategoryId,
        location: 'Server Room 101, Tech Block',
        block_area: 'Tech Block',
        priority: 'high'
      })
    });
    const json = await res.json();
    if (!json.success || !json.data.id) throw new Error(json.message);
    createdIssueId = json.data.id;
  });

  // 7. Admin assigns issue to staff
  await assert('Admin assigns issue to staff specialist', async () => {
    const res = await fetch(`${BASE_URL}/issues/${createdIssueId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ staff_id: staffId })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  });

  // 8. Staff starts work (In Progress)
  await assert('Staff updates status to In Progress', async () => {
    const res = await fetch(`${BASE_URL}/issues/${createdIssueId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        status: 'in_progress',
        remarks: 'Physical heatsink cleaned, replacing brushless DC fan'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  });

  // 9. Staff marks issue resolved
  await assert('Staff resolves issue with notes', async () => {
    const res = await fetch(`${BASE_URL}/issues/${createdIssueId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        resolution_notes: 'Installed high-RPM replacement fan. Temperature stabilized at 42°C.'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  });

  // 10. Student submits feedback
  await assert('Student submits 5-star rating for resolved issue', async () => {
    const res = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        issue_id: createdIssueId,
        rating: 5,
        comments: 'Prompt response! Switch temperatures and network speeds fully restored.'
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
  });

  // 11. Admin verifies Campus Problem Analytics
  await assert('Admin retrieves Campus Problem Analytics', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/campus-analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const json = await res.json();
    if (!json.success || !json.data.problem_matrix) throw new Error('Analytics failed');
  });

  // 12. Admin checks Audit Trail
  await assert('Admin queries governance audit logs', async () => {
    const res = await fetch(`${BASE_URL}/audit-logs?limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const json = await res.json();
    if (!json.success || json.data.logs.length === 0) throw new Error('Audit log query failed');
  });

  // 13. Notifications
  await assert('Student checks notifications and marks as read', async () => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const json = await res.json();
    if (!json.success) throw new Error('Notification fetch failed');

    const markRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const markJson = await markRes.json();
    if (!markJson.success) throw new Error('Mark read failed');
  });

  console.log('====================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
