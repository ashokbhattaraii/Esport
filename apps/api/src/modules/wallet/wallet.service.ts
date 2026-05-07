import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IsInt, IsString, Min } from "class-validator";
import { PrismaClient, WithdrawalStatus } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import { RealtimeService } from "../../common/realtime/realtime.service";

export class WithdrawDto {
  @IsInt() @Min(100) amountNpr!: number;
  @IsString() method!: string;
  @IsString() account!: string;
}

@Injectable()
export class WalletService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private realtime: RealtimeService,
  ) {}

  async getMine(userId: string) {
    const [foundWallet, withdrawals] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { userId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 25 } },
      }),
      this.prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);
    const wallet = foundWallet ?? (await this.createMissingWallet(userId));
    return { wallet, withdrawals };
  }

  private async createMissingWallet(userId: string) {
    try {
      return await this.prisma.wallet.create({
        data: { userId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 25 } },
      });
    } catch {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 25 } },
      });
      if (!wallet) throw new NotFoundException("Wallet not found");
      return wallet;
    }
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    return this.prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException("Wallet not found");
      if (wallet.balanceNpr < dto.amountNpr)
        throw new BadRequestException("Insufficient balance");
      await tx.wallet.update({
        where: { userId },
        data: { balanceNpr: { decrement: dto.amountNpr } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          reason: "WITHDRAWAL",
          amountNpr: dto.amountNpr,
          note: `Withdrawal request via ${dto.method}`,
        },
      });
      const req = await tx.withdrawalRequest.create({
        data: {
          userId,
          amountNpr: dto.amountNpr,
          method: dto.method,
          account: dto.account,
        },
      });
      this.realtime.emitToUser(userId, "wallet_updated", {});
      return req;
    });
  }

  listWithdrawals(status?: WithdrawalStatus) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            role: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async reviewWithdrawal(
    adminId: string,
    id: string,
    status: WithdrawalStatus,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const w = await tx.withdrawalRequest.findUnique({ where: { id } });
      if (!w) throw new NotFoundException();
      if (status === "REJECTED" && w.status === "PENDING") {
        // refund
        const wallet = await tx.wallet.findUnique({
          where: { userId: w.userId },
        });
        if (wallet) {
          await tx.wallet.update({
            where: { userId: w.userId },
            data: { balanceNpr: { increment: w.amountNpr } },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: "CREDIT",
              reason: "REFUND",
              amountNpr: w.amountNpr,
              note: `Withdrawal rejected refund`,
            },
          });
        }
      }
      const updated = await tx.withdrawalRequest.update({
        where: { id },
        data: { status, note, reviewedAt: new Date() },
      });
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: `WITHDRAWAL_${status}`,
          resource: "withdrawal",
          resourceId: id,
          newValue: note ? { status, note } : { status },
        },
      });
      this.realtime.emitToUser(w.userId, "wallet_updated", {});
      return updated;
    });
  }
}
