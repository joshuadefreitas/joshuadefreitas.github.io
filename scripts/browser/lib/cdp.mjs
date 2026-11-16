// Minimal Chrome DevTools Protocol client used by the browser QA scenarios.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = new Map(); ws.onmessage = (event) => this.receive(JSON.parse(event.data)); }
  receive(message) { if (message.id) { const slot = this.pending.get(message.id); if (!slot) return; this.pending.delete(message.id); clearTimeout(slot.timer); message.error ? slot.reject(new Error(message.error.message)) : slot.resolve(message.result); return; } for (const listener of this.listeners.get(message.method) || []) listener(message.params || {}, message.sessionId); }
  send(method, params = {}, sessionId) { return new Promise((resolve, reject) => { const id = ++this.id; const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15_000); this.pending.set(id, { resolve, reject, timer }); this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); }); }
  on(method, listener) { const all = this.listeners.get(method) || []; all.push(listener); this.listeners.set(method, all); return () => this.listeners.set(method, all.filter((fn) => fn !== listener)); }
  async close() { for (const slot of this.pending.values()) slot.reject(new Error("CDP closed")); this.pending.clear(); this.ws.close(); }
}
export async function launch(executable) {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "site-qa-"));
  const args = ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--force-device-scale-factor=1", "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "about:blank"];
  const child = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Chromium did not expose DevTools in 15s. stderr: ${stderr}`)), 15_000);
    child.once("error", reject); child.stderr.on("data", (chunk) => { stderr += chunk; const found = stderr.match(/DevTools listening on (ws:\/\/\S+)/); if (found) { clearTimeout(timer); resolve(found[1]); } });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Chromium exited (${code}). stderr: ${stderr}`)); });
  });
  const ws = new WebSocket(endpoint); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("DevTools WebSocket connection failed")); });
  const cdp = new CDP(ws);
  return { cdp, child, userDataDir, async close() { await cdp.close().catch(() => {}); const done = new Promise((r) => child.once("exit", r)); child.kill("SIGKILL"); await Promise.race([done, new Promise((r) => setTimeout(r, 3000))]); await rm(userDataDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 }).catch(() => {}); } };
}
