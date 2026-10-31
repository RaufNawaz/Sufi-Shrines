/**
 * Loads scripts/team/shell/team-crypto.js into node (31 October 2026).
 *
 * That file is the single implementation of the team edition's encryption, written as a classic
 * browser script so the service worker can importScripts() it. Node runs the same source text here
 * rather than a port of it, so encrypt-team.mjs and the round-trip test use exactly the code the
 * browser decrypts with. It needs only globals node 20 already has: crypto.subtle, TextEncoder,
 * btoa and atob.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const SHELL_DIR = join(dirname(fileURLToPath(import.meta.url)), 'shell');

const file = join(SHELL_DIR, 'team-crypto.js');
if (!globalThis.TeamCrypto) vm.runInThisContext(readFileSync(file, 'utf8'), { filename: file });

export const TeamCrypto = globalThis.TeamCrypto;
