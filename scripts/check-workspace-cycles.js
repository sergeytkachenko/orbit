#!/usr/bin/env node
/*
 * Detects circular `workspace:*` dependencies between packages in the
 * monorepo. madge catches TS import cycles inside a package; this
 * catches cycles at the package-graph level (e.g. @orbit/common
 * declaring @orbit/transport-grpc which in turn declares @orbit/common).
 *
 * Reads every package.json under apps/* and libs/** (skipping
 * node_modules), collects its workspace:* deps, and runs Tarjan-style
 * cycle detection. Exits non-zero if any cycle is found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const roots = [path.join(repoRoot, 'apps'), path.join(repoRoot, 'libs')];

const graph = {}; // name -> Set<name>
const owners = {}; // name -> relative path

for (const root of roots) {
  walk(root);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const pkgPath = path.join(full, 'package.json');
      if (fs.existsSync(pkgPath)) registerPackage(pkgPath);
      walk(full);
    }
  }
}

function registerPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.name) return;
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const workspaceDeps = Object.entries(deps)
    .filter(([, spec]) => typeof spec === 'string' && spec.startsWith('workspace:'))
    .map(([name]) => name);
  graph[pkg.name] = new Set(workspaceDeps);
  owners[pkg.name] = path.relative(repoRoot, path.dirname(pkgPath));
}

// Tarjan's strongly connected components. Any SCC with > 1 node — or a
// single-node SCC with a self-loop — is a cycle.
const cycles = findCycles(graph);

if (cycles.length === 0) {
  console.log(`OK No workspace dependency cycles among ${Object.keys(graph).length} packages.`);
  process.exit(0);
}

console.error(`FAIL Found ${cycles.length} workspace dependency cycle(s):\n`);
for (const cycle of cycles) {
  console.error('  ' + cycle.map((n) => `${n} (${owners[n]})`).join('\n    -> '));
  console.error('    -> ' + cycle[0]);
  console.error('');
}
process.exit(1);

function findCycles(g) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const lowlink = new Map();
  const result = [];

  for (const v of Object.keys(g)) {
    if (!indices.has(v)) strongconnect(v);
  }
  return result;

  function strongconnect(v) {
    indices.set(v, index);
    lowlink.set(v, index);
    index += 1;
    stack.push(v);
    onStack.add(v);

    for (const w of g[v] ?? []) {
      if (!indices.has(w)) {
        if (!(w in g)) continue; // external dep, not part of the graph
        strongconnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      const isCycle = scc.length > 1 || (g[v] && g[v].has(v));
      if (isCycle) result.push(scc);
    }
  }
}
