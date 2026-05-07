import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @MinLength(6) password!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @MinLength(6) password!: string;
}

export class GoogleLoginDto {
  @IsString() credential!: string;
}
