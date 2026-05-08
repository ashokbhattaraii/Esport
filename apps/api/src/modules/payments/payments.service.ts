import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentStatus, PrismaClient } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import { MemoryCacheService } from "../../common/cache/memory-cache.service";
import { invalidateTournamentCaches } from "../tournaments/tournament-cache.keys";

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private cache: MemoryCacheService,
  ) {}

  async submit(
    userId: string,
    body: {
      tournamentId?: string;
      method: string;
      reference?: string;
      amountNpr: number;
    },
    fileUrl: string,
  ) {
    if (!body.tournamentId) {
      throw new BadRequestException("tournamentId required");
    }
    return this.prisma.payment.create({
      data: {
        userId,
        tournamentId: body.tournamentId,
        amountNpr: Number(body.amountNpr),
        method: body.method ?? "esewa",
        reference: body.reference,
        proofUrl: fileUrl,
        status: PaymentStatus.PENDING,
      },
    });
  }

  async deposit(
    userId: string,
    body: { method: string; reference?: string; amountNpr: number },
    fileUrl: string,
  ) {
    const amountNpr = Number(body.amountNpr);
    if (!Number.isFinite(amountNpr) || amountNpr < 50) {
      throw new BadRequestException("Deposit amount must be at least NPR 50");
    }
    return this.prisma.payment.create({
      data: {
        userId,
        amountNpr,
        method: body.method ?? "esewa",
        reference: body.reference,
        proofUrl: fileUrl,
        status: PaymentStatus.PENDING,
      },
    });
  }

  list(status?: PaymentStatus) {
    return this.prisma.payment.findMany({
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
        tournament: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  myPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { tournament: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async approve(adminId: string, paymentId: string) {
    let tournamentId: string | null = null;
    const result = await this.prisma.$transaction(async (tx: any) => {
      const p = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!p) throw new NotFoundException();
      if (p.status !== "PENDING")
        throw new BadRequestException("Already reviewed");
      tournamentId = p.tournamentId;

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "APPROVED",
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      if (p.tournamentId) {
        await tx.tournamentParticipant.update({
          where: {
            tournamentId_userId: {
              tournamentId: p.tournamentId,
              userId: p.userId,
            },
          },
          data: { paid: true },
        });
        await tx.tournament.update({
          where: { id: p.tournamentId },
          data: { filledSlots: { increment: 1 } },
        });
      }
      if (!p.tournamentId) {
        const wallet = await tx.wallet.upsert({
          where: { userId: p.userId },
          update: { balanceNpr: { increment: p.amountNpr } },
          create: { userId: p.userId, balanceNpr: p.amountNpr },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT",
            reason: "ADJUSTMENT",
            amountNpr: p.amountNpr,
            note: `Wallet deposit approved via ${p.method}`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: p.userId,
          type: "PAYMENT",
          title:
            p.tournamentId
              ? "Payment approved"
              : "Deposit approved",
          body:
            p.tournamentId
              ? "Your payment has been approved. Room details are now visible."
              : `Your wallet deposit of NPR ${p.amountNpr} has been approved.`,
        },
      });
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: "APPROVE_PAYMENT",
          resource: "payment",
          resourceId: paymentId,
        },
      });
      return { ok: true };
    });
    if (tournamentId) invalidateTournamentCaches(this.cache, tournamentId);
    return result;
  }

  async reject(adminId: string, paymentId: string, note?: string) {
    const p = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!p) throw new NotFoundException();
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: p.userId,
        type: "PAYMENT",
        title: "Payment rejected",
        body: note ?? "Your payment was rejected. Please contact support.",
      },
    });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: "REJECT_PAYMENT",
        resource: "payment",
        resourceId: paymentId,
        newValue: note ? { note } : undefined,
      },
    });
    return { ok: true };
  }
}
