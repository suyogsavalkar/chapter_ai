#!/usr/bin/env node

// Detailed Composio API test
// Run with: COMPOSIO_API_KEY=your_key node scripts/test-composio-detailed.js

const https = require('https');

const API_KEY = process.env.COMPOSIO_API_KEY;
const TEST_USER_ID = 'test-user-123'; // You can replace this with a real user ID

if (!API_KEY) {
  console.error('❌ COMPOSIO_API_KEY environment variable is not set');
  process.exit(1);
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'backend.composio.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🔍 Running detailed Composio API tests...\n');

  // Test 1: List available toolkits
  console.log('1️⃣ Testing toolkit listing...');
  try {
    const result = await makeRequest('/api/v3/toolkits?limit=5');
    console.log('✅ Status:', result.status);
    if (result.status === 200) {
      console.log('📦 Available toolkits:', result.data.items?.length || 0);
      const toolkits = result.data.items?.slice(0, 3) || [];
      toolkits.forEach(toolkit => {
        console.log(`   - ${toolkit.name} (${toolkit.slug})`);
      });
    } else {
      console.log('❌ Error:', result.data);
    }
  } catch (e) {
    console.log('❌ Request failed:', e.message);
  }

  console.log('\n');

  // Test 2: Get specific toolkit (Gmail)
  console.log('2️⃣ Testing specific toolkit fetch (Gmail)...');
  try {
    const result = await makeRequest('/api/v3/toolkits/gmail');
    console.log('✅ Status:', result.status);
    if (result.status === 200) {
      console.log('📧 Gmail toolkit:', {
        name: result.data.name,
        slug: result.data.slug,
        description: result.data.meta?.description?.substring(0, 100) + '...',
        logo: result.data.meta?.logo
      });
    } else {
      console.log('❌ Error:', result.data);
    }
  } catch (e) {
    console.log('❌ Request failed:', e.message);
  }

  console.log('\n');

  // Test 3: List connected accounts for test user
  console.log('3️⃣ Testing connected accounts listing...');
  try {
    const result = await makeRequest(`/api/v3/connected_accounts?user_ids=${TEST_USER_ID}`);
    console.log('✅ Status:', result.status);
    if (result.status === 200) {
      console.log('🔗 Connected accounts:', result.data.items?.length || 0);
      if (result.data.items && result.data.items.length > 0) {
        result.data.items.forEach(account => {
          console.log(`   - ${account.toolkit?.name} (${account.status})`);
        });
      } else {
        console.log('   No connected accounts found (this is normal for new users)');
      }
    } else {
      console.log('❌ Error:', result.data);
    }
  } catch (e) {
    console.log('❌ Request failed:', e.message);
  }

  console.log('\n');

  // Test 4: Check auth configs
  console.log('4️⃣ Testing auth configs...');
  try {
    const result = await makeRequest('/api/v3/auth_configs?limit=5');
    console.log('✅ Status:', result.status);
    if (result.status === 200) {
      console.log('🔐 Auth configs:', result.data.items?.length || 0);
      if (result.data.items && result.data.items.length > 0) {
        result.data.items.forEach(config => {
          console.log(`   - ${config.toolkit} (${config.auth_scheme})`);
        });
      } else {
        console.log('   ⚠️  No auth configs found - you need to set these up in Composio dashboard');
      }
    } else {
      console.log('❌ Error:', result.data);
    }
  } catch (e) {
    console.log('❌ Request failed:', e.message);
  }

  console.log('\n✨ Test completed!');
}

runTests().catch(console.error);