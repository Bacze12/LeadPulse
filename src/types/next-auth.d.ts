import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustChangePassword?: boolean;
  }
}