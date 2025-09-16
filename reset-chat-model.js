// Simple script to reset chat model to default
// Run this in browser console on your chat page to reset the model selection

// Clear the chat-model cookie
document.cookie = 'chat-model=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

// Reload the page to apply changes
window.location.reload();

console.log('Chat model cookie cleared and page reloaded. Default model will now be used.');