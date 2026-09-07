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
var pc=g._primitivesCollection;
out.titleCache=JSON.stringify(s._titleInPartsCache).slice(0,200);
out.compileErr=JSON.stringify(s._compileErrorStatus&&s._compileErrorStatus._value);
// labels
var lbl=pc.dwglabels&&pc.dwglabels.get?pc.dwglabels.get(false):null;
out.lblType=typeof lbl;
if(lbl){out.lblKeys=Object.keys(lbl).slice(0,10);var m=lbl._primitivesDataById||lbl._items||lbl;out.lblCount=Object.keys(m).length;out.lblIds=Object.keys(m).slice(0,5)}
// boxes
var bx=pc.dwgboxes&&pc.dwgboxes.get?pc.dwgboxes.get(false):null;
if(bx){var mb=bx._primitivesDataById||bx._items||bx;out.boxCount=Object.keys(mb).length}
// lines
var ln=pc.dwglines&&pc.dwglines.get?pc.dwglines.get(false):null;
if(ln){var ml=ln._primitivesDataById||ln._items||ln;out.lineCount=Object.keys(ml).length}
// search PINE_DATA
var found=[];
try{
  function scan(o,path,depth){
    if(depth>5||!o||typeof o!=='object'||found.length>5)return;
    var ks=Object.keys(o);
    for(var i=0;i<ks.length;i++){
      try{var v=o[ks[i]];
      if(typeof v==='string'){if(v.indexOf('PINE_DATA')>=0)found.push(path+'.'+ks[i]+':'+v.slice(0,120))}
      else if(v&&typeof v==='object'&&!v._listeners){scan(v,path+'.'+ks[i],depth+1)}
      }catch(e){}
    }
  }
  scan(pc,'pc',0);
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