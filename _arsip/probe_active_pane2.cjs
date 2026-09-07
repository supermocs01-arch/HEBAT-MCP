const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var ap=wv._chartWidget._activePaneWidget;
out.apType=typeof ap;
if(!ap){out.noAP=true;return JSON.stringify(out)}
var st=ap._state;
out.apKeys=Object.keys(ap).slice(0,25);
out.studyKeys=st?Object.keys(st._studySources||{}):[];
var s=st&&st._studySources['0'];
if(s){
  out.id0=String(s._id&&s._id._value);
  out.titleCache=JSON.stringify(s._titleInPartsCache).slice(0,120);
  out.isStarted=s._isStarted;
  out.status=s._status&&s._status._value?s._status._value.type:null;
  out.compileErr=JSON.stringify(s._compileErrorStatus&&s._compileErrorStatus._value).slice(0,60);
  try{var g=s._graphics;out.ixLen=g._indexes?g._indexes.length:0;var pc=g._primitivesCollection;var dl=pc.dwglines;out.dwgMapSize=dl&&dl.size!=null?dl.size:(dl&&dl._map?dl._map.size:null)}catch(e){out.gErr=e.message}
}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});