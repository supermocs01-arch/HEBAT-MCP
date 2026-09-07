// catat.cjs - Pencatat trade & update tracker mingguan (manual)
// Leverage 1:2000 | Standard Cent (XAUUSD) | Spread dimasukkan
// 
// GUNANYA:
//   node catat.cjs status                      -> lihat progress
//   node catat.cjs bukitp1 <entry> <tp> <lot>  -> win TP1
//   node catat.cjs bukitp2 <entry> <tp2> <lot> -> win TP2
//   node catat.cjs loss <entry> <sl> <lot>     -> loss SL
//   node catat.cjs profit <nilai_usc>          -> input profit manual
//   node catat.cjs reset                       -> reset progress 0
//
// ====== CONFIG - SESUAIKAN AKUN KAMU (REAL CENT $12) ======
const TARGET = 12000;            // target USC: saldo $12 -> $120 (milestone pertama)
const LOT_BASE = 0.01;           // lot acuan kalibrasi
const USC_PER_POINT = 100;        // USC per 1 pips (1.0 harga) utk LOT_BASE 0.01 -> 1 oz x 1.0 = $1 = 100 USC
const SPREAD_POINTS = 0.30;       // spread XAUUSD cent = 0.3 pips (dipotong tiap trade, leverage 1:2000)
// ========================================
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const PROGRESS_FILE = path.join(__dirname, 'progress.txt');

function readProgress() { try { return parseFloat(fs.readFileSync(PROGRESS_FILE,'utf8'))||0; } catch(e){ return 0; } }
function writeProgress(v){ fs.writeFileSync(PROGRESS_FILE,String(v)); try{ execSync('node C:\\HEBAT\\tracker.cjs '+TARGET+' '+v,{stdio:'ignore'});}catch(e){} }

const cmd = process.argv[2];
if (!cmd) { console.log('Perintah? Lihat komentar bagian atas.'); process.exit(1); }

let progress = readProgress();
let newP = progress;
const dir = __dirname;

function perLot(uscPerPointForBase, lot) { return uscPerPointForBase * (lot / LOT_BASE); }

if (cmd === 'bukitp1' || cmd === 'bukitp2' || cmd === 'loss' || cmd === 'bukitp') {
  const entry = parseFloat(process.argv[3]);
  const sl = parseFloat(process.argv[4]);
  const lot = parseFloat(process.argv[5]) || 0.1;
  const isP2 = (cmd === 'bukitp2');
  const isLoss = (cmd === 'loss');
  if(isNaN(entry)||isNaN(sl)){ console.log('Format: node catat.cjs '+cmd+' <entry> <tp|sl> <lot>'); process.exit(1); }
  const grossDist = Math.abs(sl - entry);            // point bruto
  const perPt = USC_PER_POINT * (lot / LOT_BASE);
  let netUsc, label;
  if (isLoss) {
    netUsc = -1 * (grossDist * perPt + SPREAD_POINTS * perPt); // SL + spread
    label = 'LOSS';
  } else {
    netUsc = grossDist * perPt - SPREAD_POINTS * perPt;         // win - spread
    label = 'WIN ' + (isP2 ? 'TP2' : 'TP1');
  }
  newP = progress + netUsc;
  console.log(label + ': ' + (netUsc>=0?'+':'') + netUsc.toFixed(2) + ' USC');
  console.log('  Kasar'+grossDist.toFixed(2)+'pt | spread '+SPREAD_POINTS.toFixed(2)+'pt | lot '+lot);
  console.log('  Progress: '+progress.toFixed(2)+' -> '+newP.toFixed(2));
  writeProgress(newP);
} else if (cmd === 'profit') {
  const val = parseFloat(process.argv[3]);
  if(isNaN(val)){ console.log('Format: node catat.cjs profit <usc>'); process.exit(1); }
  newP = progress + val;
  console.log('+'+val+' USC -> '+newP.toFixed(2));
  writeProgress(newP);
} else if (cmd === 'status') {
  console.log('Progress: '+progress.toFixed(2)+' / '+TARGET+' USC');
  console.log('Sisa: '+(TARGET-progress).toFixed(2)+' USC');
} else { console.log('Perintah tak dikenal: '+cmd); }

if (newP !== progress) console.log('──────────────\nSisa target: '+(TARGET-newP).toFixed(2)+' USC');