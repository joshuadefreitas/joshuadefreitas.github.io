// Real-browser QA runner (no dependencies).
// Usage: node scripts/browser/run.mjs --base http://127.0.0.1:8750 [--chromium PATH]
//        [--only network,themes] [--out out/browser] [--shots]
// Serve the repository first, e.g. python3 -m http.server 8750.  The runner
// writes report.json and, with --shots, PNGs for each page/theme/viewport.
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { launch } from "./lib/cdp.mjs";
import { pages, absolute, session, destroy, navigate, media, viewport, screenshot } from "./lib/site.mjs";
import network from "./scenarios/network.mjs";
import themes from "./scenarios/themes.mjs";
import reducedmotion from "./scenarios/reducedmotion.mjs";
import plateControls from "./scenarios/plate-controls.mjs";
import keyboard from "./scenarios/keyboard.mjs";
import a11yTree from "./scenarios/a11y-tree.mjs";
import touchSmall from "./scenarios/touch-small.mjs";
import perfThrottled from "./scenarios/perf-throttled.mjs";
import fonts from "./scenarios/fonts.mjs";
import transitions from "./scenarios/transitions.mjs";
import essay from "./scenarios/essay.mjs";
import hoverPointer from "./scenarios/hover-pointer.mjs";

const scenarios = { network, themes, reducedmotion, "plate-controls": plateControls, keyboard, "a11y-tree": a11yTree, "touch-small": touchSmall, "perf-throttled": perfThrottled, fonts, transitions, essay, "hover-pointer": hoverPointer };
function args(argv) { const out = { base: "http://127.0.0.1:8750", out: "out/browser", shots: false }; for (let i = 0; i < argv.length; i++) { const key = argv[i]; if (key === "--shots") out.shots = true; else if (key.startsWith("--")) out[key.slice(2)] = argv[++i]; } return out; }
async function executable(value) { if (value) return value; for (const name of ["chromium", "chromium-browser", "google-chrome"]) { try { await access(name, constants.X_OK); return name; } catch {} for (const directory of (process.env.PATH || "").split(path.delimiter)) { try { const candidate = path.join(directory, name); await access(candidate, constants.X_OK); return candidate; } catch {} } } throw new Error("No Chromium found. Pass --chromium /absolute/path/to/chromium"); }
async function shots(ctx, out) { for (const [width,height] of [[1440,900],[820,1180],[390,844]]) for (const theme of ["light","dark"]) for (const page of pages) { const s=await session(ctx); try { await viewport(ctx,s,width,height,width<600); await media(ctx,s,{"prefers-color-scheme":theme}); await navigate(ctx,s,absolute(ctx,page)); const label=(page==="/"?"home":page.slice(1,-1).replaceAll("/","-")); await screenshot(ctx,s,path.join(out,"shots",`shots-${label}-${theme}-${width}x${height}.png`)); } finally { await destroy(ctx,s); } } }
async function main() { const options=args(process.argv.slice(2)); const selected=(options.only ? options.only.split(",") : Object.keys(scenarios)); for (const name of selected) if (!scenarios[name]) throw new Error(`Unknown scenario '${name}'. Available: ${Object.keys(scenarios).join(", ")}`); const base=new URL(options.base); const ctx={base,cdp:null}; await mkdir(options.out,{recursive:true}); let browser; const report={base:base.href,startedAt:new Date().toISOString(),results:[]}; try { browser=await launch(await executable(options.chromium)); ctx.cdp=browser.cdp; const exit=async()=>await browser?.close(); process.once("SIGINT",exit); for (const name of selected) { try { const value=await scenarios[name](ctx); report.results.push(value); } catch (error) { report.results.push({name,status:"FAIL",detail:`scenario crashed: ${error.message}`,metrics:{stack:error.stack}}); } } if(options.shots) { try { await shots(ctx,options.out); report.results.push({name:"shots",status:"PASS",detail:"screenshots written",metrics:{}}); } catch(error) { report.results.push({name:"shots",status:"FAIL",detail:error.message,metrics:{}}); } } } catch(error) { report.results.push({name:"harness",status:"FAIL",detail:error.message,metrics:{}}); } finally { report.finishedAt=new Date().toISOString(); await writeFile(path.join(options.out,"report.json"),JSON.stringify(report,null,2)+"\n"); await browser?.close(); } console.table(report.results.map(({name,status,detail})=>({scenario:name,status,detail}))); if(report.results.some(x=>x.status==="FAIL")) process.exitCode=1; }
await main();
