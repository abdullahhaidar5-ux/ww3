// Free robot checks (PLAN-SAT D0e): node orch/lint.mjs  -> "LINT PASS" / "LINT FAIL". No browser, runs in seconds.
// 1 no </script in src  2 no new external hosts  3 banned real-leader/organisation names
import fs from 'fs';
const files = fs.readdirSync('src').filter(f => f.endsWith('.js')).sort();
const errs = [];
const HOSTS = ['ww3-servers.abdullah-haidar5.workers.dev', 'ww3-servers.', 'claude.ai', 'creativecommons.org', 'github.com', 'abdullahhaidar5-ux.github.io', 'ww3.abdullah-haidar5.workers.dev', 'www.w3.org'];
const BANNED = /hezbollah|hizbullah|hizballah|nasrallah|khamenei|khomeini|soleimani|kim jong[- ]?un|putin|trump|biden|netanyahu|erdogan|xi jinping/i;
for (const f of files) {
  const lines = fs.readFileSync('src/' + f, 'utf8').split('\n');
  let inBlock = false;
  lines.forEach((ln, i) => {
    const at = `src/${f}:${i + 1}`;
    if (/<\/script/i.test(ln)) errs.push(`${at} contains </script (escape as <\\/script)`);
    // strip comments for the code-only checks
    let code = ln;
    if (inBlock) { const e = code.indexOf('*/'); if (e < 0) return; code = code.slice(e + 2); inBlock = false; }
    code = code.replace(/\/\*.*?\*\//g, '');
    const b = code.indexOf('/*'); if (b >= 0) { code = code.slice(0, b); inBlock = true; }
    const full = code; // keep // inside strings (urls) — only strip full-line comments
    if (/^\s*\/\//.test(full)) return;
    for (const m of full.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) if (!HOSTS.some(h => m[1] === h || m[1].startsWith(h) || m[1].endsWith(h))) errs.push(`${at} new external host ${m[1]} (add to HOSTS in orch/lint.mjs only if Abdullah-approved)`);
    if (BANNED.test(full) && !/lint-ok/.test(ln)) errs.push(`${at} banned real-person/organisation name: ${full.match(BANNED)[0]}`);
  });
}
if (errs.length) { console.log(errs.slice(0, 40).join('\n')); console.log(`LINT FAIL (${errs.length})`); process.exit(1); }
console.log(`LINT PASS (${files.length} files)`);
