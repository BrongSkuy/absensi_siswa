import { auth } from "../src/lib/auth";

interface LoginResult {
  user: {
    id: string;
  };
}

async function verify() {
  try {
    const res1 = await auth.api.signInUsername({
      body: {
        username: "192001",
        password: "192001",
      }
    });
    console.log("LOGIN 192001 AS 192001 (NIP):", res1 ? (res1 as unknown as LoginResult).user.id : "SUCCESS (No error thrown)");
  } catch(e) {
    const err = e as Error;
    console.log("Failed 192001 with NIP:", err.message);
  }

  try {
    const res2 = await auth.api.signInUsername({
      body: {
        username: "192001",
        password: "guru1234",
      }
    });
    console.log("LOGIN 192001 AS guru1234:", res2 ? (res2 as unknown as LoginResult).user.id : "SUCCESS");
  } catch(e) {
    const err = e as Error;
    console.log("Failed 192001 with guru1234:", err.message);
  }
}

verify().then(() => process.exit(0)).catch(console.error);
