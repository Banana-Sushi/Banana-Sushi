import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const ALG = 'HS256';

export async function signCustomerToken(payload: { customerId: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyCustomerToken(token: string): Promise<{ customerId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { customerId: string; email: string };
  } catch {
    return null;
  }
}
