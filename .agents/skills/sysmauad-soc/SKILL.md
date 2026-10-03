---
name: security-hardening-ts
description: Auditoria e hardening de seguranca para sistemas Node.js/TypeScript (Express, Fastify, Nest). Use SEMPRE que o usuario falar de seguranca, rate limit, brute force, portas expostas, firewall, JWT, tokens de sessao, expiracao de login, refresh token, logout, revogacao, "ficar logado direto", revisao de vulnerabilidades ou checklist antes de ir para producao, mesmo que ele nao use a palavra "auditoria".
---

# Security Hardening (TypeScript)

Skill para revisar e corrigir tres frentes: **rate limit**, **portas expostas** e **tokens com expiracao**. Depois, um checklist geral.

## Fluxo de trabalho

1. Ler o codigo (entry point, middlewares, rotas de auth, `.env.example`, docker-compose, nginx).
2. Rodar `scripts/audit-ports.sh` no servidor (ou pedir a saida de `ss -tlnp` e `ufw status`).
3. Verificar cada secao abaixo e listar achados por severidade: **Critico / Alto / Medio / Baixo**.
4. Propor o patch em TypeScript, aplicando so o necessario e seguindo o estilo do projeto.
5. Entregar relatorio curto: achado, risco, correcao, como testar.

Nunca imprimir segredos reais (JWT_SECRET, senhas de banco) no relatorio; mascarar.

---

## 1. Rate limit

Regras:
- **Global** moderado (ex.: 300 req/15 min por IP) + **estrito nas rotas sensiveis**: login (5-10/15 min), registro, reset de senha, geracao de pagamento, webhooks publicos, endpoints que enviam WhatsApp/SMS/email.
- Atras de proxy (nginx/Traefik): `app.set('trust proxy', 1)`, senao todos os clientes parecem ter o IP do proxy e o limite pega todo mundo junto.
- Chave de login = **IP + identificador** (email/CPF), para frear brute force distribuido e credential stuffing sem bloquear um escritorio inteiro atras do mesmo NAT.
- Varias instancias (PM2 cluster, varios containers) exigem store compartilhado (Redis). Store em memoria so serve para instancia unica.
- Responder `429` com `Retry-After`. Nao revelar se o usuario existe (mesma mensagem para usuario inexistente e senha errada).
- Lockout progressivo apos N falhas (atraso crescente), registrado em log.

```ts
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis'; // opcional, para multi-instancia

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

// app.use(globalLimiter);
// app.post('/api/auth/login', loginLimiter, loginHandler);
```

Verificar: `trust proxy` configurado? Limiter montado ANTES das rotas? Webhooks tem limite proprio (e validacao de assinatura)? Em multi-tenant, considerar limite por `empresa_id` alem do IP.

Teste rapido: `for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST $URL/api/auth/login -H 'content-type: application/json' -d '{"email":"a@a.com","password":"x"}'; done` deve passar a devolver 429.

---

## 2. Portas expostas

Principio: so **80/443** (e SSH restrito) publicos. Backend (3001), banco (3306), Redis (6379), paineis (wg-easy 51821, Docker API 2375) ficam em `127.0.0.1` ou rede privada/VPN.

Verificar:
- `ss -tlnp` e `ss -ulnp`: quem escuta em `0.0.0.0` / `::` em vez de `127.0.0.1`.
- `ufw status verbose` (ou iptables/nftables). Politica padrao `deny incoming`.
- **Docker ignora o UFW** para portas publicadas (`-p 3306:3306` fica aberto mesmo com UFW bloqueando). Publicar como `127.0.0.1:3306:3306` no compose.
- App Node: `app.listen(PORT, '127.0.0.1')` quando ha reverse proxy.
- MySQL: `bind-address = 127.0.0.1`, usuario da aplicacao sem acesso remoto (`'user'@'localhost'`).
- Servicos que precisam ser publicos por natureza (ex.: RADIUS 1812/1813/udp, CoA 3799/udp, WireGuard 51820/udp) devem ser restritos por IP de origem no firewall, nunca abertos ao mundo.
- Painel administrativo (ex.: 51821) so via VPN/tunel SSH ou atras de auth + allowlist de IP.
- SSH: liberar a porta SSH no firewall **antes** de `ufw enable`; chave publica, `PasswordAuthentication no`, `PermitRootLogin no`.
- Scan externo (de outra maquina): `nmap -Pn -p- <ip>` para confirmar o que a internet realmente ve.

Rode `scripts/audit-ports.sh` para o diagnostico automatico.

---

## 3. Tokens com expiracao (nao ficar logado para sempre)

Modelo recomendado: **access token curto + refresh token rotativo**.

| Item | Regra |
|---|---|
| Access token (JWT) | 10-15 min, `exp`, `iat`, `sub`, `jti`; algoritmo fixado na verificacao |
| Refresh token | string aleatoria opaca (32+ bytes), **nao JWT**, validade 7-30 dias, guardada **como hash** (SHA-256) no banco |
| Rotacao | cada refresh gera um novo par e invalida o anterior |
| Reuse detection | se um refresh ja usado reaparecer, revogar toda a familia (sessao roubada) |
| Idle timeout | opcional: expira se ficar X dias sem uso (`last_used_at`) |
| Logout | revoga o refresh token da sessao; "sair de todos" revoga a familia inteira |
| Troca de senha / 2FA / desativar usuario | revoga todas as sessoes |
| Armazenamento no browser | refresh em cookie `httpOnly; Secure; SameSite=Strict` (ou Lax); access em memoria. Evitar `localStorage` (XSS le o token) |
| Segredo | `JWT_SECRET` com 32+ bytes aleatorios, fora do repositorio; falhar o boot se ausente |

Tabela sugerida (MySQL):

```sql
CREATE TABLE refresh_tokens (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  empresa_id    INT NOT NULL,
  family_id     CHAR(36) NOT NULL,
  token_hash    CHAR(64) NOT NULL UNIQUE,
  expires_at    DATETIME NOT NULL,
  last_used_at  DATETIME NULL,
  revoked_at    DATETIME NULL,
  replaced_by   BIGINT NULL,
  ip            VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_family (family_id)
);
```

Implementacao de referencia: ver `references/token-auth.ts` (emitir, verificar, rotacionar, revogar).

Verificar no codigo existente:
- JWT com expiracao longa (ex.: 24h-30d) sem refresh? Reduzir e adicionar refresh.
- `jwt.verify` sem `algorithms: ['HS256']`? Corrigir (previne `alg: none`/confusao de algoritmo).
- Token em `localStorage`? Migrar refresh para cookie httpOnly.
- Existe revogacao? Sem ela, token roubado vale ate expirar.
- Multi-tenant: `empresa_id` vem do token validado, nunca de header/body fornecido pelo cliente (excecao documentada, ex.: super admin).

---

## 4. Checklist geral (rapido)

- `helmet()` ativo; CORS com allowlist de origens (nunca `*` com credenciais).
- Validacao de entrada com Zod/Joi em toda rota; limite de body (`express.json({ limit: '100kb' })`).
- SQL sempre parametrizado (`?`), nunca concatenado.
- Senhas com bcrypt/argon2 (custo >= 12). **Nada de senha em texto puro** no banco; se o protocolo exigir (ex.: RADIUS Cleartext-Password), isolar, restringir acesso ao banco e documentar o risco.
- Upload: validar tipo/tamanho, nome aleatorio, fora do diretorio publico.
- Webhooks: validar assinatura (HMAC) e idempotencia.
- Autorizacao por papel (RBAC) em cada rota, e checagem de dono/tenant em cada recurso (IDOR).
- Erros: nao vazar stack trace em producao; log sem senhas/tokens/CPF completo.
- Dependencias: `npm audit --omit=dev`, lockfile versionado, atualizar pacotes com CVE.
- Segredos fora do git (`.env` no `.gitignore`), rotacionar se ja vazaram em commit/log.
- HTTPS obrigatorio, HSTS, cookies `Secure`.
- Backups do banco testados e fora do servidor.

## Formato do relatorio

```
## Resumo
<2-3 linhas>

## Achados
1. [Critico] <titulo>
   - Onde: arquivo:linha
   - Risco: ...
   - Correcao: ... (patch)
   - Teste: ...

## O que ja esta bom
```
