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
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var st=chart.getStudyById('PTdIuB');
var src=st._study||st;
var pc=src._graphics._primitivesCollection;
out.pcTypes={};
for(var k in pc){out.pcTypes[k]=typeof pc[k]}
var lm=pc.dwglabels.get('labels');var data=lm.get(false);
var first=null;var n=0;
data._primitivesDataById.forEach(function(l){if(n===0){first=l}n++});
out.cnt=n;
out.firstKeys=first?Object.keys(first):null;
out.first=first;
var linesD=pc.dwglines.get('lines').get(false);
var lbn=0;var firstLine=null;
linesD._primitivesDataById.forEach(function(l){if(!firstLine)firstLine=l;lbn++});
out.linesCount=lbn;
out.firstLineKeys=firstLine?Object.keys(firstLine):null;
out.firstLine=firstLine;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
const v=r.result.value||'';
console.log(v.slice(0,4000));
      ws.close();
      process.exit(0);
    });
  });
});