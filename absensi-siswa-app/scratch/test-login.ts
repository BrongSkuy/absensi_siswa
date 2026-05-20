import { createAuthClient } from "better-auth/client";
import { usernameClient } from "better-auth/client/plugins";
import fetch from "node-fetch";

// Polyfill fetch for Node.js
global.fetch = fetch as unknown as typeof global.fetch;

const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [usernameClient()],
});

async function main() {
  const result = await authClient.signIn.username({
    username: "199005202012",
    password: "199005202012",
  });
  console.log("Login with username 199005202012:", result);
}
main();
