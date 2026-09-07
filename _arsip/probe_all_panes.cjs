const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={panes:[]};
try{
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var chartW=wv._chartWidget;
var nav=chartW._controlBarNavigation;
var pane=nav._targetPaneWidget;
var st=pane._state;
out.paneCount=st._paneCount!==undefined?st._paneCount:null;
out.panesStateKeys=Object.keys(st).filter(function(k){return /pane/i.test(k)});
try{
var panes=st._panes||st._panesById||null;
if(panes&&typeof panes==='object'){
  var arr=Array.isArray(panes)?panes:Object.values(panes);
  for(var i=0;i<arr.length&&i<12;i++){
    var p=arr[i];
    var ent={i:i};
    try{ent.stateKeys=p._state?Object.keys(p._state).filter(function(k){return /study/i.test(k)}):null}catch(e){}
    try{
      var ss=p._state&&p._state._studySources;
      var ids=ss?Object.keys(ss):[];
      ent.studies=ids;
      var titles=[];
      for(var j=0;j<ids.length;j++){
        try{var s2=ss[ids[j]];var tc=s2._titleInPartsCache;var str=JSON.stringify(tc).slice(0,80);titles.push(ids[j]+'='+str)}catch(e){titles.push(ids[j]+'=ERR')}
      }
      ent.titles=titles;
    }catch(e){ent.studiesErr=e.message}
    out.panes.push(ent);
  }
} else {out.panesInfo='no panes arr: '+typeof panes}
}catch(e){out.panesErr=e.message}
}catch(e){out.err=e.message}
return JSON.stringify(out);
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});