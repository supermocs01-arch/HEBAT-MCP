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
var pc=s._graphics._primitivesCollection;
var dl=pc.dwglines;
out.dwglinesType=typeof dl;
out.dwglinesKeys=Object.keys(dl||{});
out.dwglinesCtor=dl&&dl.constructor?dl.constructor.name:null;
// try get('labels')
try{var lm=dl.get('labels');out.lmType=typeof lm;if(lm){out.lmKeys=Object.keys(lm).slice(0,10);var m=lm._primitivesDataById||lm._items||lm;out.lmCount=Object.keys(m).length;var ids=Object.keys(m).slice(0,5);out.lmIds=ids;if(ids.length){var first=m[ids[0]];out.firstKeys=Object.keys(first).slice(0,15)}}}catch(e){out.labelsErr=e.message}
try{var ln=dl.get('lines');out.linesType=typeof ln;if(ln){var m2=ln._primitivesDataById||ln._items||ln;out.linesCount=Object.keys(m2).length}}catch(e){out.linesErr=e.message}
// dwgboxes
try{var bx=pc.dwgboxes;out.boxesKeys=Object.keys(bx||{});var bm=bx.get?bx.get(false):null;if(bm){var m3=bm._primitivesDataById||bm._items||bm;out.boxesCount=Object.keys(m3).length}}catch(e){out.boxesErr=e.message}
// dwglabels
try{var lbl=pc.dwglabels;out.lblKeys=Object.keys(lbl||{});var l2=lbl.get?lbl.get(false):null;if(l2){var m4=l2._primitivesDataById||l2._items||l2;out.lblCount=Object.keys(m4).length}}catch(e){out.lblErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});