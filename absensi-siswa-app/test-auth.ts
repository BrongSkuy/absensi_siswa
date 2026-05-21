import { auth } from "./src/lib/auth";

console.log(Object.keys(auth.api).filter(k => typeof auth.api[k as keyof typeof auth.api] === "function" || typeof auth.api[k as keyof typeof auth.api] === "object"));
