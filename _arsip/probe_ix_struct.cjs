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
var pane=window.TradingViewApi._activeChartWidgetWV.value()._chartWidget._controlBarNavigation._targetPaneWidget;
var s=pane._state._studySources['0'];
var g=s._graphics;
var ix=g._indexes;
out.ixLen=ix.length;
out.ixSample=ix.slice(0,8);
// find primitives storage: look at _hhistsByTimePointIndex usage & hhists
var pc=g._primitivesCollection;
// try hhists
var hh=pc.hhists&&pc.hhists.get?pc.hhists.get(false):null;
if(hh){var mh=hh._primitivesDataById||hh._items||hh;out.hhCount=Object.keys(mh).length}
// maybe primitives live under _graphics._primitives or separate
out.gKeys=Object.keys(g);
// search any object containing strings "PINE_DATA" or "BOS" in whole study (bounded, path printed)
var found=[];
function scan(o,path,depth){
  if(depth>6||!o||typeof o!=='object'||found.length>8)return;
  if(o._listeners)return;
  var ks=Object.keys(o);
  for(var i=0;i<ks.length;i++){
    try{var v=o[ks[i]];
    if(typeof v==='string'){
      if(v.indexOf('PINE_DATA')>=0||v.indexOf('BOS')>=0||v.indexOf('CHOCH')>=0){found.push(path+'.'+ks[i]+'='+v.slice(0,100))}
    } else if(v&&typeof v==='object'&&v!==o){scan(v,path+'.'+ks[i],depth+1)}
    }catch(e){}
  }
}
scan(g,'g',0);
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