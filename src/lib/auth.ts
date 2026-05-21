import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { admin } from "better-auth/plugins";
import { db } from "@/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),

  trustedOrigins: [
    "http://localhost:3000",
    "https://absensi-siswa-smk.vercel.app",
    "https://absensi-siswa-mu.vercel.app",
    "https://absensi-siswa-git-main-brongskuys-projects.vercel.app",
    process.env.BETTER_AUTH_URL || "",
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4, // relaxed for NIS default passwords
  },

  plugins: [
    username({
      usernameValidator: () => true,
    }), // login via NIP/NIS as username
    admin({
      defaultRole: "user", // default role, admin sets roles via admin plugin
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // update session every 24 hours
  },

  user: {
    additionalFields: {
      appRole: {
        type: "string",
        required: false,
        defaultValue: "SISWA",
        input: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
