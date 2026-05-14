declare module "cors";
declare module "cookie-parser";
declare module "morgan";

declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
    [key: string]: unknown;
  }
  export interface JwtPayload {
    [key: string]: unknown;
  }
  export function sign(payload: string | Record<string, unknown>, secretOrPrivateKey: string, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string): string | JwtPayload;
}

declare module "bcrypt" {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}
