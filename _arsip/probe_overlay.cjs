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
var chart=window.TradingViewApi._activeChartWidgetWV.value();
var studies=chart.getAllStudies();
out.studies=studies.map(function(s){return {name:s.name,id:s.id,visible:s.visible}});
var st=chart.getStudyById('PTdIuB');
out.hasStudy=!!st;
if(st){
  out.isVisible=st.isVisible?st.isVisible():null;
  out._visible=st._isVisible!=null?st._isVisible:st._visible;
  out.visibleProp=st.visible;
}
var pw=chart._chartWidget._paneWidgets._value[0];
out.paneCount=chart._chartWidget._paneWidgets._value.length;
out.paneVisible=pw._state._isVisible!=null?pw._state._isVisible:pw._visible;
out.studyCount=pw._state._studySources?Object.keys(pw._state._studySources).length:null;
var mon=document.querySelectorAll('.monaco-editor.pine-editor-monaco');
out.editors=mon.length;
var cw=document.querySelector('.chart-widget');
var r2=cw?cw.getBoundingClientRect():null;
out.chartWidget=r2?{x:Math.round(r2.x),y:Math.round(r2.y),w:Math.round(r2.width),h:Math.round(r2.height)}:null;
var pane=document.querySelector('.pane');
out.paneEls=pane?pane.length:document.querySelectorAll('.pane').length;
out.res=chart._chartWidget._state.m_dataSources[0]._seriesSource._resolution;
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});