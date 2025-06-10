import { createClient } from '@base44/sdk';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6801309791850cc36c8c709c", 
  requiresAuth: false // Enable authentication for all operations
});