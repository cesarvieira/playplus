import type { FastifyRequest } from 'fastify';

import type { JwtService } from '#modules/user/infra/jwt.service';

const BEARER_PREFIX = 'Bearer ';

function extractBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return undefined;
  }

  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * Gera a chave de rate limit por usuário autenticado, com fallback para IP.
 *
 * Por que verificar o token em vez de só decodificar: um JWT decodificado
 * sem checar assinatura permite que qualquer um escreva `sub: <id de outra
 * pessoa>` num token não assinado e passe a "gastar" a cota de outro
 * usuário — as requisições falsas ainda cairiam com 401 na autenticação de
 * verdade, mas já teriam consumido a cota da vítima antes disso. Verificar
 * a assinatura (HS256) fecha essa brecha: um token forjado cai no fallback
 * por IP, não na conta de outro usuário.
 *
 * `jwtService.verify` não consulta o banco (é checagem local de assinatura
 * + expiração), então isso não reintroduz o custo que o rate limit existe
 * para conter.
 */
export function createUserAwareKeyGenerator(jwtService: JwtService) {
  return (request: FastifyRequest): string => {
    const token = extractBearerToken(request);

    if (!token) {
      return `ip:${request.ip}`;
    }

    try {
      const { sub } = jwtService.verify(token);
      return `user:${sub}`;
    } catch {
      return `ip:${request.ip}`;
    }
  };
}
