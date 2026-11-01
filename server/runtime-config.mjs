// Fail closed in production, but report every configuration problem at once.
// Never include secret values in errors or logs.
export function runtimeConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const token = env.WORKSPACE_ACCESS_TOKEN || '';
  const secureCookies = env.SECURE_COOKIES === undefined ? production : env.SECURE_COOKIES === 'true';
  const port = Number(env.PORT || 3000);
  const proxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  const problems = [];
  const tokenLength = token.trim().length;
  if (production && tokenLength < 24) problems.push(tokenLength === 0
    ? 'WORKSPACE_ACCESS_TOKEN is missing or empty in the runtime environment. Set it in the hosting environment and redeploy.'
    : `WORKSPACE_ACCESS_TOKEN is too short (received ${tokenLength} characters; minimum 24). Replace it with a stronger secret and redeploy.`);
  if (production && !secureCookies) problems.push('SECURE_COOKIES must be true in production (HTTPS).');
  if (!Number.isInteger(port) || port < 1 || port > 65535) problems.push('PORT must be an integer from 1 to 65535.');
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 10) problems.push('TRUST_PROXY_HOPS must be an integer from 0 to 10.');
  let publicOrigin = env.PUBLIC_ORIGIN || '';
  if (!publicOrigin && env.RENDER_EXTERNAL_URL) {
    try { publicOrigin = new URL(env.RENDER_EXTERNAL_URL).origin; } catch { problems.push('RENDER_EXTERNAL_URL is not a valid URL.'); }
  }
  if (publicOrigin) {
    try { const url = new URL(publicOrigin); if (!['http:', 'https:'].includes(url.protocol) || url.origin !== publicOrigin) throw new Error('origin'); }
    catch { problems.push('PUBLIC_ORIGIN must be an exact http(s) origin without a path or trailing slash.'); }
  }
  return { production, token, secureCookies, port, host: env.HOST || '0.0.0.0', dataDir: env.DATA_DIR || './data', publicOrigin, proxyHops, problems };
}
export function configurationError(problems) {
  return new Error(`Production/runtime configuration incomplete:\n- ${problems.join('\n- ')}\nSet these in your hosting environment (Render: Service → Environment), save, then redeploy. If the variable already exists in Render, confirm it belongs to this service/environment and that the deploy started after the save. See docs/RENDER.md. Secret values are never logged.`);
}
