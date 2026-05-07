import { Global, Module } from "@nestjs/common";
import { PrismaClient, prisma } from "@fireslot/db";

export const PRISMA = "PRISMA_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: () => prisma ?? new PrismaClient({ log: ["warn", "error"] }),
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
