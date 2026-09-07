const http=require('http');
http.get('http://127.0.0.1:9222/json',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{
const t=JSON.parse(d).find(x=>x.url&&x.url.includes('/chart/'));
const ws=new (require('ws'))(t.webSocketDebuggerUrl);let id=1;
function send(m,p){return new Promise(r=>{const mid=id++;const h=raw=>{const j=JSON.parse(raw.toString());if(j.id===mid){ws.removeListener('message',h);r(j.result)}};ws.on('message',h);ws.send(JSON.stringify({id:mid,method:m,params:p||{}}))})}
ws.on('open',async()=>{
await send('Runtime.enable');
const r=await send('Runtime.evaluate',{expression:`(function(){
var wv=window.TradingViewApi._activeChartWidgetWV.value();
var st=null;
try{var s=wv.getStudyById('PTdIuB');var src=s._study||s;var g=src._graphics||(src._source&&src._source._graphics);var pc=g._primitivesCollection;var col=pc.dwglabels.get('labels').get(false)._primitivesDataById;col.forEach(function(l){if(l.t&&l.t.indexOf('PINE_DATA')===0)st=l.t});}catch(e){}
var pw=wv._chartWidget._paneWidgets._value[0];
var bars=pw._state.m_dataSources[0]._seriesSource._data.m_bars._items;
var last=bars[bars.length-1].value;
return JSON.stringify({pine:st,price:last[4],n:bars.length});
})()`,returnByValue:true});
const v=JSON.parse(r.result.value);
const pd=v.pine?v.pine.split('|'):null;
const atr=pd?parseFloat(pd[5]):null;
console.log('harga='+v.price+' ATR_M15='+atr);
if(atr){
  const entry=4084;
  const sl=Math.round((entry-atr)*2)/2;
  const risk=entry-sl;
  const tp1=Math.round((entry+risk*3)*2)/2;
  const tp2=Math.round((entry+risk*3.5)*2)/2;
  const tp3=Math.round((entry+risk*4.9)*2)/2;
  console.log('entry='+entry);
  console.log('SL='+sl+' risk='+risk.toFixed(2));
  console.log('TP1='+tp1+' reward='+(tp1-entry).toFixed(2)+' RR=1:3.0');
  console.log('TP2='+tp2+' reward='+(tp2-entry).toFixed(2)+' RR=1:3.5');
  console.log('TP3='+tp3+' reward='+(tp3-entry).toFixed(2)+' RR=1:4.9');
}
ws.close();process.exit(0);});});}).on('error', e => console.log(e.message));