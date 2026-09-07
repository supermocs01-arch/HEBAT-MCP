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
var pw=wv._chartWidget._paneWidgets._value[0];
var s=pw._state._studySources['0'];
// dump status wrapper full
var st=s._status;
out.statusKeys=st?Object.keys(st):null;
out.statusVal=st&&st._value?JSON.stringify(st._value):null;
// look for any error fields on study
var errFields={};
var keys=Object.keys(s);
for(var i=0;i<keys.length;i++){
  var k=keys[i];
  if(/error|fault|fail|warn/i.test(k)){
    try{
      var v=s[k];
      if(v&&typeof v==='object'&&v._value!==undefined){errFields[k]=JSON.stringify(v._value).slice(0,150)}
      else if(typeof v==='boolean'||v===null){errFields[k]=String(v)}
    }catch(e){errFields[k]='E'}
  }
}
out.errFields=errFields;
// runtime error via hhist or last values
try{out.lastVal=s._lastValues?JSON.stringify(s._lastValues).slice(0,200):null}catch(e){}
try{out.studyStats=s._stats?JSON.stringify(s._stats).slice(0,200):null}catch(e){}
// check inputs loaded
try{out.inputValues=s._inputValues?JSON.stringify(s._inputValues).slice(0,300):null}catch(e){out.inErr=e.message}
return JSON.stringify(out);
}catch(e){out.err=e.message;return JSON.stringify(out)}
})()`,returnByValue:true});
console.log(r.result.value||JSON.stringify(r.result));
      ws.close();
      process.exit(0);
    });
  });
});