# Security Vulnerability Fixes

## Overview
This document tracks the security vulnerabilities found and fixed in the Qshop project.

## Date: 2026-08-12

### Critical Fixes Applied

#### 1. Clear-Text Logging of Sensitive Information (HIGH)
**Status:** ✅ FIXED

**Issues Found:**
- M-Pesa API consumer keys and secrets logged in plain text
- Access tokens exposed in logs
- Password hashes logged during generation
- Full API request/response data with credentials

**Files Affected:**
- `backend/utils/mpesaAuth.js` (lines 36, 41, 52, 60, 92, 127)
- `backend/controllers/mpesaController.js` (lines 53, 92-93)

**Solution:**
- Created `backend/utils/secureLogger.js` utility
- Implemented credential masking functions
- Replaced all sensitive console.log() with secureLog methods
- Tokens now shown as masked: `abc123...xyz789` instead of full value
- API keys only show character count, not actual values

#### 2. Insecure Helmet Security Middleware Configuration (HIGH)
**Status:** ✅ FIXED

**Issues Found:**
- Helmet middleware had minimal configuration
- Missing critical security headers
- CSP was completely disabled

**Files Affected:**
- `backend/server.js` (line 25)

**Solution:**
- Implemented comprehensive Helmet configuration with:
  - Content Security Policy (CSP) with strict directives
  - Cross-Origin Embedder Policy (COEP)
  - Cross-Origin Opener Policy (COOP)
  - Frame protection (deny)
  - XSS Filter enabled
  - DNS Prefetch Control disabled
  - NoSniff enabled
  - Permissions Policy configured
  - HSTS with 2-year max age and preload

### Dependency Vulnerabilities (37 Total)

**Status:** ✅ `npm audit` clean locally on both packages

#### Package Overrides Added:

**Frontend (package.json):**
- `nanoid`: ^3.3.8 (fixes infinite loop DoS)
- `ip-address`: ^10.0.1 (no-op in practice: express-rate-limit already requires ^10.2.0)
- `postcss`: ^8.4.49 (fixes path traversal)
- `react-router`: ^7.5.2 (fixes DoS and XSS)
- `react-router-dom`: ^7.5.2
- `@remix-run/router`: ^1.28.0
- `axios`: ^1.18.0 (fixes proxy inheritance, DoS, prototype pollution)
- `path-to-regexp`: ^0.1.13 (patched ReDoS release for the 0.1.x line Express 4 requires)
- `shell-quote`: ^1.8.4 (fixes DoS)

**Backend (backend/package.json):**
- `express`: ^4.21.2 (latest security patches)
- `helmet`: ^8.0.0
- `axios`: ^1.18.0
- `nanoid`: ^3.3.8
- `ip-address`: ^10.0.1
- `path-to-regexp`: ^0.1.13 (patched release; see note below)

#### Known Vulnerabilities Addressed:

1. **React Router** - Unauthenticated DoS via inefficient route matching
2. **shell-quote** - Quadratic-complexity DoS in `parse()`
3. **nanoid** - Non-secure generators loop indefinitely with negative size
4. **Axios** - HTTP adapter proxy inheritance
5. **brace-expansion** - DoS via exponential-time expansion
6. **ip-address** - IPv4-mapped/NAT64 addresses bypass SSRF checks
7. **js-yaml** - CPU consumption in !omap resolution (CVE-2026-59870)
8. **PostCSS** - Path traversal in source map auto-loading

### Testing Recommendations

1. **Run Security Audit:**
   ```bash
   npm audit
   cd backend && npm audit
   ```

2. **Test M-Pesa Integration:**
   - Verify STK Push still works
   - Check callback processing
   - Ensure logs don't expose credentials

3. **Test API Endpoints:**
   - Verify Helmet headers are present
   - Check CORS configuration
   - Test rate limiting

4. **Monitor Logs:**
   - Confirm no sensitive data in production logs
   - Verify error handling doesn't leak stack traces

### Scope Limits — Read Before Assuming Coverage

- **Only 5 of the 11 open code scanning alerts were reviewed.** Alerts #7–#11 were
  visible and addressed. Alerts #1–#6 were never inspected and are **not** covered
  by this work. Expect code scanning to still report findings after merge.
- **`npm audit` clean ≠ GitHub alerts cleared.** Both packages audit clean locally,
  but Dependabot evaluates the default branch. Its counts only move once this is
  merged into `main`.
- **The M-Pesa payment flow has not been exercised end to end.** These changes sit
  directly in that path. A sandbox STK Push is still outstanding.

### Regression Introduced and Fixed During This Work

An earlier revision of this branch forced `path-to-regexp` to `^8.0.0` in both
package.json files. Express 4 calls that module as a plain function; v8 exports
named functions instead, so the backend crashed at startup with
`TypeError: pathRegexp is not a function` before binding a port — a total outage,
not a degradation. The pre-existing `^0.1.13` pin was already the patched release
for the ReDoS advisory on the 0.1.x line, so reverting lost no security coverage.

Caught by booting the server locally and curling it. Worth repeating for any future
override bump: **a version bump that silences an advisory can still break the
runtime, and `npm audit` will not tell you.**

### Verification Actually Performed

Backend booted locally with placeholder credentials:

- `/api/health` returns 200 with valid JSON
- Response carries CSP, COEP, COOP, CORP, HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`
- CORS preflight from `https://unihive.shop` returns 204 with expected allow-headers
- `secureLogger` fed synthetic secrets; confirmed neither token body nor key value
  appears in output
- `grep` over `backend/**/*.js` shows no remaining raw-secret logging in `mpesaAuth.js`

Note on COEP: `require-corp` constrains what a *document* may embed. This server
returns JSON, and `Cross-Origin-Resource-Policy: cross-origin` is set alongside, so
the Vercel frontend is unaffected.

---

## Security Best Practices Going Forward

1. **Never log sensitive data** - Use secureLogger utility for all M-Pesa and payment-related logging
2. **Keep dependencies updated** - Run `npm audit` regularly
3. **Review security headers** - Ensure Helmet configuration remains strict
4. **Validate all inputs** - Especially for payment amounts and phone numbers
5. **Use environment variables** - Never hardcode credentials
6. **Monitor security advisories** - Subscribe to GitHub security alerts
7. **Regular security reviews** - Quarterly code reviews focusing on security

---

**Generated by:** Claude Code
