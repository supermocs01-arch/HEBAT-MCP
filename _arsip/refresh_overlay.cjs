const http=require('http');
const fs=require('fs');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
ws.on('open',async()=>{
await send('Runtime.enable');
await send('Page.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var st=chart.getStudyById('PTdIuB');
var pw=chart._chartWidget._paneWidgets._value[0];
var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
var last=bars[bars.length-1].value[0];
out.lastTime=last;
out.setVisible=typeof st.setVisible==='function';
if(typeof st.setVisible==='function'){
  st.setVisible(false);
  out.v1='hidden';
}
out.v2=st.isVisible?st.isVisible():null;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log('step1:',r.result.value);
await sleep(1500);
const r2=await send('Runtime.evaluate',{expression:`(function(){
var out={};
try{
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var st=chart.getStudyById('PTdIuB');
if(typeof st.setVisible==='function'){st.setVisible(true);out.v='shown'}
var pw=chart._chartWidget._paneWidgets._value[0];
var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
var n=bars.length;
var last=bars[n-1].value[0];
var first=bars[Math.max(0,n-30)].value[0];
out.scroll=typeof chart.setVisibleRange==='function';
if(typeof chart.setVisibleRange==='function'){
  chart.setVisibleRange({from:first,to:last});
  out.scrolled=true;
}
out.n=n;out.last=last;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log('step2:',r2.result.value);
await sleep(3000);
const sh=await send('Page.captureScreenshot',{format:'png'});
if(sh&&sh.data){fs.writeFileSync('C:/HEBAT/shot2.png',Buffer.from(sh.data,'base64'));console.log('saved C:/HEBAT/shot2.png',Math.round(sh.data.length/1024),'KB')}
const r3=await send('Runtime.evaluate',{expression:`(function(){
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var s=chart.getStudyById('PTdIuB');
var src=s._study||s;
var g=src._graphics;
var pc=g._primitivesCollection;
function cnt(m,sub){try{return m.get(sub).get(false)._primitivesDataById.size}catch(e){return -1}}
return JSON.stringify({visible:s.isVisible? s.isVisible():null,lines:cnt(pc.dwglines,'lines'),labels:cnt(pc.dwglabels,'labels'),boxes:cnt(pc.dwgboxes,'boxes')});
})()`,returnByValue:true});
console.log('final:',r3.result.value);
      ws.close();
      process.exit(0);
    });
  });
});