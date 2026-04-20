export interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  companyId: string;
  isMaster: boolean;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
