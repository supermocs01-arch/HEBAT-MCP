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
var tvapi=window.TradingViewApi;
out.apiKeys=Object.keys(tvapi).slice(0,40);
out.wvType=typeof tvapi._activeChartWidgetWV.value;
if(tvapi._activeChartWidgetWV){
  var wv=tvapi._activeChartWidgetWV.value();
  out.wvKeys=Object.keys(wv).slice(0,30);
  out.wvSymbol=wv.symbol&&wv.symbol();
  var cw=wv._chartWidget;
  out.cwKeys=Object.keys(cw).slice(0,40);
  out.multi=cw._isMultipleLayout;
  out.chartsArr=!!cw._chartWidgets?cw._chartWidgets.length:null;
  out.activeIdx=cw._activeChartIndex;
  if(cw._chartWidgets){
    out.tabsInfo=[];
    for(var i=0;i<cw._chartWidgets.length;i++){
      var w=cw._chartWidgets[i];
      var ch=w._chartWidget||w;
      var sym=null,res=null;
      try{sym=ch.symbol?ch.symbol():null}catch(e){}
      try{res=ch._resolution}catch(e){}
      var domEl=ch._rootElement||ch.root||null;
      var rect=null;
      if(domEl){try{var r2=domEl.getBoundingClientRect();rect={x:Math.round(r2.x),y:Math.round(r2.y),w:Math.round(r2.width),h:Math.round(r2.height)}}catch(e){}}
      var studies=null;
      try{studies=ch.getAllStudies?ch.getAllStudies().map(function(s){return s.name}):null}catch(e){}
      out.tabsInfo.push({i:i,sym:sym,res:res,rect:rect,studies:studies});
    }
  }
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