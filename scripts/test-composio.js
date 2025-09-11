#!/usr/bin/env node

// Simple script to test Composio API connectivity
// Run with: node scripts/test-composio.js

const https = require('https');

const API_KEY = process.env.COMPOSIO_API_KEY;

if (!API_KEY) {
  console.error('❌ COMPOSIO_API_KEY environment variable is not set');
  process.exit(1);
}

console.log('🔍 Testing Composio API connectivity...');
console.log('📋 API Key:', API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('📏 API Key Length:', API_KEY.length);

// Test basic API connectivity
const options = {
  hostname: 'backend.composio.dev',
  port: 443,
  path: '/api/v3/toolkits?limit=1',
  method: 'GET',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  console.log('📡 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (res.statusCode === 200) {
        console.log('✅ API Connection Successful!');
        console.log('📦 Available Toolkits:', parsed.items?.length || 0);
        if (parsed.items && parsed.items.length > 0) {
          console.log('🔧 Sample Toolkit:', parsed.items[0].name);
        }
      } else {
        console.log('❌ API Error:', parsed);
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.end();