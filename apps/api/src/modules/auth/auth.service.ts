import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { PrismaClient, Role } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";
import { GoogleLoginDto, LoginDto, RegisterDto } from "./dto";
import { jwtSecret } from "./jwt-secret";

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client(this.googleClientId);

  constructor(
    @Inject(PRISMA) private prisma: PrismaClient,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    this.assertReady();
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException("Email already registered");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone?.trim() || undefined,
        passwordHash,
        wallet: { create: {} },
      },
    });
    return this.issueToken(user.id, user.email, user.role, {
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  async login(dto: LoginDto) {
    this.assertReady();
    if (!dto?.email || !dto?.password)
      throw new UnauthorizedException("Invalid credentials");
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (user.isBanned) throw new UnauthorizedException("Account banned");
    if (!user.passwordHash) {
      throw new UnauthorizedException("This account uses Google sign-in");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueToken(user.id, user.email, user.role, {
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  async googleLogin(dto: GoogleLoginDto) {
    this.assertReady();
    const clientId = this.googleClientId;
    if (!clientId)
      throw new InternalServerErrorException("Google OAuth is not configured");
    if (!dto?.credential)
      throw new UnauthorizedException("Missing Google credential");

    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const googleId = payload?.sub;
    if (!email || !googleId || payload.email_verified === false) {
      throw new UnauthorizedException("Google account could not be verified");
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { googleId }] },
    });
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            email,
            googleId,
            name: payload.name,
            avatarUrl: payload.picture,
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            googleId,
            name: payload.name,
            avatarUrl: payload.picture,
            wallet: { create: {} },
          },
        });

    if (user.isBanned) throw new UnauthorizedException("Account banned");
    await this.prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    await this.ensureUserRole(user.id, user.email, user.roleId);

    return this.issueToken(user.id, user.email, user.role, {
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
  }

  private async ensureUserRole(userId: string, email: string, currentRoleId: string | null) {
    const isSuperAdmin = email.toLowerCase() === "bhattaraiashok101@gmail.com";
    if (isSuperAdmin) {
      const su = await this.prisma.userRole.findUnique({ where: { name: "SUPER_ADMIN" } });
      if (su && currentRoleId !== su.id) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { roleId: su.id, role: "ADMIN" },
        });
      }
      return;
    }
    if (!currentRoleId) {
      const player = await this.prisma.userRole.findUnique({ where: { name: "PLAYER" } });
      if (player) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { roleId: player.id },
        });
      }
    }
  }

  async me(userId: string) {
    this.assertReady();
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isBanned: true,
        createdAt: true,
        profile: true,
        wallet: true,
      },
    });
  }

  private async issueToken(
    sub: string,
    email: string,
    role: Role | string,
    extra?: { name?: string | null; avatarUrl?: string | null },
  ) {
    const token = await this.jwt.signAsync(
      { sub, email, role },
      { secret: jwtSecret() },
    );
    return { token, user: { id: sub, email, role, ...extra } };
  }

  private assertReady() {
    if (!this.prisma?.user) {
      throw new InternalServerErrorException(
        "Database client is not available",
      );
    }
  }

  private get googleClientId() {
    return (
      process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    );
  }
}
