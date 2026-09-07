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
var chartW=wv._chartWidget;
// find all pane widgets
var found=[];
function findPanes(obj,path,depth){
  if(!obj||depth>6||found.length>20)return;
  try{
    if(obj._state&&obj._state._studySources&&typeof obj._state._studySources==='object'&&Object.keys(obj._state._studySources).length>0){
      found.push({path:path,sizes:Object.keys(obj._state._studySources).length});
    }
  }catch(e){}
  if(typeof obj!=='object')return;
  var keys=Object.keys(obj);
  for(var i=0;i<keys.length;i++){
    try{
      var v=obj[keys[i]];
      if(v&&typeof v==='object'&&!/^_listeners$/.test(keys[i])){
        findPanes(v,path+'.'+keys[i],depth+1);
      }
    }catch(e){}
  }
}
findPanes(chartW,'wv',0);
out.found=found;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});