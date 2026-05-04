
import fetch from 'node-fetch';

async function testKey() {
  const key = "AIzaSyBBCgHN2uMfey5aR_Y4CJDOeyqY_oLSFG0";
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Models available for this key:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error testing key:', err);
  }
}

testKey();
