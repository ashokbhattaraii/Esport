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
import { SystemConfigService } from "../admin/system-config.service";
import { FinancialRiskService } from "../finance/financial-risk.service";

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
    private config: SystemConfigService,
    private risk: FinancialRiskService,
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

      const withdrawalFeePercent = this.config.getNumber("WITHDRAWAL_FEE_PERCENT") || 0;
      const feeAmount = Math.floor(dto.amountNpr * (withdrawalFeePercent / 100));
      const amountToDeduct = dto.amountNpr;
      const amountToReceive = dto.amountNpr - feeAmount;

      if (wallet.balanceNpr < amountToDeduct)
        throw new BadRequestException("Insufficient balance");
      await tx.wallet.update({
        where: { userId },
        data: { balanceNpr: { decrement: amountToDeduct } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEBIT",
          reason: "WITHDRAWAL",
          amountNpr: amountToDeduct,
          note: withdrawalFeePercent > 0 
            ? `Withdrawal of Rs ${amountToDeduct} (Fee: Rs ${feeAmount})`
            : `Withdrawal request via ${dto.method}`,
        },
      });
      const req = await tx.withdrawalRequest.create({
        data: {
          userId,
          amountNpr: amountToReceive,
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
      if (w.status !== "PENDING") throw new BadRequestException("Already processed");
      const profile = await this.risk.buildRiskProfile(w.userId);
      if (status === "APPROVED") {
        const check = await this.risk.checkWithdrawalRisk(w.userId, w.amountNpr);
        if (check.blockedReason) throw new BadRequestException(check.blockedReason);
        const wallet = await tx.wallet.findUnique({ where: { userId: w.userId } });
        if (!wallet) throw new NotFoundException("Wallet not found");
        if (wallet.balanceNpr < w.amountNpr) {
          throw new BadRequestException(
            `User has insufficient wallet balance. Short by NPR ${w.amountNpr - wallet.balanceNpr}`,
          );
        }
        await tx.withdrawalReview.create({
          data: {
            withdrawalId: id,
            reviewedBy: adminId,
            riskSnapshot: profile as any,
            reviewNote: note,
            decision: "APPROVED",
          },
        });
        await tx.wallet.update({
          where: { userId: w.userId },
          data: { balanceNpr: { decrement: w.amountNpr } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEBIT",
            reason: "WITHDRAWAL",
            amountNpr: w.amountNpr,
            note: `Withdrawal approved by ${adminId}`,
          },
        });
      } else if (status === "REJECTED") {
        await tx.withdrawalReview.create({
          data: {
            withdrawalId: id,
            reviewedBy: adminId,
            riskSnapshot: profile as any,
            reviewNote: note,
            decision: "REJECTED",
          },
        });
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
