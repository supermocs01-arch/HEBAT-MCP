const http=require('http');
const fs=require('fs');
const pine=fs.readFileSync('C:/HEBAT/tradingview-mcp/scripts/current.pine','utf8');
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
var pw=wv._chartWidget._paneWidgets._value[0];
var s=pw._state._studySources['0'];
var src=s._source;
out.srcType=typeof src;
out.srcLen=typeof src==='string'?src.length:-1;
out.srcHead=typeof src==='string'?src.slice(0,300):null;
out.srcTail=typeof src==='string'?src.slice(-200):null;
out.pp=!!s._pineProgram;
if(s._pineProgram){
  var p=s._pineProgram;
  out.ppKeys=Object.keys(p).slice(0,20);
  var st=p._sourceText||p.source||p._originalSourceText;
  out.ppSrc=typeof st==='string'?st.length:-1;
  out.ppSrcHead=typeof st==='string'?st.slice(0,300):null;
  out.ppSrcTail=typeof st==='string'?st.slice(-200):null;
}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
const v=r.result.value||'';
console.log('=== STUDY 0 SOURCE ===');
console.log(v);
console.log('=== CURRENT.PINE (len '+pine.length+') head ===');
console.log(pine.slice(0,300));
console.log('=== tail ===');
console.log(pine.slice(-200));
      ws.close();
      process.exit(0);
    });
  });
});