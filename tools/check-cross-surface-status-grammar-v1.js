const fs=require("fs");
const REPORT="_acceptance/panel-runtime-browser/report.json";
const failures=[];
const checks={};
let report=null;
try{report=JSON.parse(fs.readFileSync(REPORT,"utf8"));checks.reportShape=!!report&&typeof report==="object"&&!!report.checks;}catch(error){failures.push("runtime-report-unreadable");}
const witnesses=[];
function walk(value,path){
  if(!value||typeof value!=="object")return;
  if(value.runtimeToolbar&&value.surface&&value.scenario&&value.risk)witnesses.push({path:path.join("."),...value});
  for(const [key,child] of Object.entries(value))walk(child,path.concat(key));
}
if(report)walk(report,[]);
function pick(surface,toolbar,suffix){
  return witnesses.find((entry)=>entry.surface===surface&&entry.runtimeToolbar===toolbar&&entry.scenario==="single"&&entry.risk==="none"&&entry.path.endsWith("."+suffix));
}
const mobile=pick("mobile","mobile","normal390");
const desktop=pick("desktop","desktop","normal1366");
const mobileBoundary=pick("mobile","mobile","normal1199");
const desktopBoundary=pick("desktop","desktop","normal1200");
const value=(entry,key)=>entry?entry[key]:null;
const keys=(entry)=>Array.isArray(entry?.proofKeys)?[...new Set(entry.proofKeys)].sort():[];
checks.mobileWitness=!!mobile;
checks.desktopWitness=!!desktop;
checks.boundaryWitnesses=!!mobileBoundary&&!!desktopBoundary;
if(!mobile)failures.push("mobile-normal390-witness-missing");
if(!desktop)failures.push("desktop-normal1366-witness-missing");
if(!checks.boundaryWitnesses)failures.push("1199-1200-boundary-witness-missing");
checks.sameDecisionContext=!!mobile&&!!desktop&&mobile.scenario===desktop.scenario&&mobile.risk===desktop.risk;
if(!checks.sameDecisionContext)failures.push("decision-context-diverges");
checks.sameProofKeys=!!mobile&&!!desktop&&JSON.stringify(keys(mobile))===JSON.stringify(keys(desktop))&&keys(mobile).length>0;
if(!checks.sameProofKeys)failures.push("proof-keys-diverge-or-missing");
checks.mobileStatusOwner=!!mobile&&value(mobile,"verdictTitlePx")===20&&value(mobile,"verdictRadiusPx")===0&&value(mobile,"verdictBorderPx")===0;
if(!checks.mobileStatusOwner)failures.push("mobile-status-owner-not-flat-20px");
checks.desktopStatusOwner=!!desktop&&value(desktop,"verdictTitlePx")<=20&&value(desktop,"verdictRadiusPx")===0&&value(desktop,"verdictBorderPx")===0;
if(!checks.desktopStatusOwner)failures.push("desktop-status-owner-not-flat-20px");
checks.boundaryStatusOwners=!!mobileBoundary&&!!desktopBoundary&&[mobileBoundary,desktopBoundary].every((entry)=>value(entry,"verdictTitlePx")===20&&value(entry,"verdictRadiusPx")===0&&value(entry,"verdictBorderPx")===0);
if(!checks.boundaryStatusOwners)failures.push("1199-1200-boundary-status-owner-diverges");
const result={pass:failures.length===0,contract:"cross-surface-status-grammar-v1",implementationState:failures.length===0?"focused-green":"expected-red",checks,observed:{mobile:mobile?{path:mobile.path,title:mobile.verdictTitlePx,radius:mobile.verdictRadiusPx,border:mobile.verdictBorderPx,proofKeys:keys(mobile)}:null,desktop:desktop?{path:desktop.path,title:desktop.verdictTitlePx,radius:desktop.verdictRadiusPx,border:desktop.verdictBorderPx,proofKeys:keys(desktop)}:null,
    mobileBoundary:mobileBoundary?{path:mobileBoundary.path,title:mobileBoundary.verdictTitlePx,radius:mobileBoundary.verdictRadiusPx,border:mobileBoundary.verdictBorderPx}:null,
    desktopBoundary:desktopBoundary?{path:desktopBoundary.path,title:desktopBoundary.verdictTitlePx,radius:desktopBoundary.verdictRadiusPx,border:desktopBoundary.verdictBorderPx}:null},failures};
console.log(JSON.stringify(result,null,2));
process.exitCode=result.pass?0:1;