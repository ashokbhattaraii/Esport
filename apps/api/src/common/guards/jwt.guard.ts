import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { jwtSecret } from "../../modules/auth/jwt-secret";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer "))
      throw new UnauthorizedException("Missing token");
    try {
      const payload = await this.jwt.verifyAsync(auth.slice(7), {
        secret: jwtSecret(),
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
