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
var state=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget._state;
var s=state._studySources['4'];
var g=s._graphics;
out.indexesType=typeof g._indexes;
if(g._indexes&&typeof g._indexes==='object'&&g._indexes.size!==undefined){out.indexesSize=g._indexes.size}
if(g._indexes&&typeof g._indexes==='object'){out.indexesKeys=g._indexes._keys?g._indexes._keys.length:null}
out.hhistKeys=Object.keys(g._hhistsByTimePointIndex||{});
// dwglabels raw JSON
try{var coll=g._primitivesCollection.dwglabels;out.dwglabelsRaw=JSON.stringify(coll).slice(0,500)}catch(e){out.dwglabelsRawErr=e.message}
// search PINE_DATA anywhere in s (bounded)
var found=[];
try{
  function scan(o,path,depth){
    if(depth>4||!o||typeof o!=='object'||o._listeners)return;
    if(typeof o==='string'&&o.indexOf('PINE_DATA')>=0){found.push(path+':'+o.slice(0,100));return}
    var keys=Object.keys(o);
    for(var i=0;i<keys.length&&found.length<10;i++){
      try{var v=o[keys[i]];
      if(typeof v==='string'){if(v.indexOf('PINE_DATA')>=0)found.push(path+'.'+keys[i]+':'+v.slice(0,100))}
      else if(v&&typeof v==='object'){scan(v,path+'.'+keys[i],depth+1)}
      }catch(e){}
    }
  }
  scan(g,'g',0);
}catch(e){out.scanErr=e.message}
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