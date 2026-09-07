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
var cw=wv._chartWidget;
out.url=location.href;
try{out.replay=cw._replayData?true:false}catch(e){}
try{out.seriesSource=cw._series._source}catch(e){}
try{
var ssrc=cw._series._source;
out.records=ssrc._records?ssrc._records.length:null;
out.cursorIndex=ssrc._cursorIndex;
out.index=ssrc._index;
out.replayIndex=ssrc._replayIndex;
out.isReplay=ssrc._isReplayMode||null;
out.seriesBarState=ssrc._seriesBarState;
}catch(e){out.ssrcErr=e.message}
try{
var dataSource=cw._series._dataSource;
out.dsKeys=Object.keys(dataSource).filter(function(k){return /replay|pause/i.test(k)});
}catch(e){out.dsErr=e.message}
try{out.symbol=cw._symbol&&cw._symbol._symbol?cw._symbol._symbol:null}catch(e){}
try{out.timeframe=cw._timeframe?cw._timeframe:null}catch(e){}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});