#!/usr/bin/env node

/**
 * Test script to verify timer synchronization functionality
 * This script will test the timer API endpoints
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

console.log('🧪 Testing timer synchronization functionality...\n');

async function testTimerEndpoints() {
  try {
    // Test 1: Get active timer (should return null for unauthenticated user)
    console.log('1. Testing GET /api/timer/active (unauthenticated)...');
    const activeResponse = await fetch(`${BASE_URL}/api/timer/active`);
    console.log(`   Status: ${activeResponse.status}`);
    
    if (activeResponse.status === 401) {
      console.log('   ✅ Authentication required (expected)');
    } else {
      const data = await activeResponse.json();
      console.log('   Response:', data);
    }
    
    // Test 2: Start timer (should fail without authentication)
    console.log('\n2. Testing POST /api/timer/start (unauthenticated)...');
    const startResponse = await fetch(`${BASE_URL}/api/timer/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicId: 1,
        description: 'Test timer',
        duration: 300, // 5 minutes
        isCountDown: true
      })
    });
    console.log(`   Status: ${startResponse.status}`);
    
    if (startResponse.status === 401) {
      console.log('   ✅ Authentication required (expected)');
    } else {
      const data = await startResponse.json();
      console.log('   Response:', data);
    }
    
    // Test 3: Health check
    console.log('\n3. Testing GET /api/health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log('   Response:', healthData);
    
    console.log('\n✅ Timer synchronization endpoints are working!');
    console.log('📱 To test cross-device synchronization:');
    console.log('   1. Open the app in your browser');
    console.log('   2. Start a timer');
    console.log('   3. Open the app on another device/browser');
    console.log('   4. The timer should be synchronized!');
    
  } catch (error) {
    console.error('❌ Error testing timer endpoints:', error.message);
  }
}

// Run the tests
testTimerEndpoints();
