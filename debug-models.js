// Debug script to check current model configuration
// Run this in browser console to see current model state

console.log('=== MODEL DEBUG INFO ===');

// Check current cookie
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [key, value] = cookie.trim().split('=');
  acc[key] = value;
  return acc;
}, {});

console.log('Current chat-model cookie:', cookies['chat-model'] || 'Not set');

// Check if model selector is visible
const modelSelector = document.querySelector('[data-testid="model-selector"]');
console.log('Model selector found:', !!modelSelector);

// Check available models in the page
const modelOptions = document.querySelectorAll('[role="option"]');
console.log('Available model options:', Array.from(modelOptions).map(opt => opt.textContent));

// Check current page URL
console.log('Current URL:', window.location.href);

console.log('=== END DEBUG INFO ===');