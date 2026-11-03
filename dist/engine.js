export const SAVE_KEY = 'bubu-garden-v1';
export const initialState = () => ({ version:1, stage:0, evidence:[], stamps:[], staff:false, timelineSolved:false, wardLocated:false, backedUp:false, stopped:false, ending:null, hints:{}, notes:'', sound:false });
export const normalize = value => String(value).normalize('NFKC').replace(/[\s\-:：/]/g,'').toUpperCase();
export const evidenceIds = ['letter','calendar','membership','friends','tape','memo','ledger','route','consent','truth','timeline','ward'];
export function restoreState(raw) {
  const fresh = initialState();
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.evidence)) return fresh;
    const evidence = [...new Set(s.evidence.filter(x=>evidenceIds.includes(x)))];
    let stage = 0;
    if(evidence.includes('letter')) stage=1;
    if(stage===1 && evidence.includes('membership')) stage=2;
    if(stage===2 && evidence.includes('tape')) stage=3;
    const staff = stage===3 && s.staff===true;
    if(staff) stage=4;
    if(stage===4 && ['ledger','route','consent','truth'].every(x=>evidence.includes(x))) stage=5;
    if(stage===5 && s.stage>=6) stage=6;
    const ending=stage===6&&['dawn','echo','sunny'].includes(s.ending)?s.ending:null;
    // Preserve checkpoints already passed by saves from the first release.
    const timelineSolved=staff&&(s.timelineSolved===true||(!('timelineSolved' in s)&&stage>=5));
    const wardLocated=stage===6&&(s.wardLocated===true||(!('wardLocated' in s)&&!!ending));
    return {...fresh,stage,evidence,staff,timelineSolved,wardLocated,stamps:Array.isArray(s.stamps)?[...new Set(s.stamps.filter(x=>['bubu','mian','lu','man'].includes(x)))]:[],backedUp:stage===6&&s.backedUp===true,stopped:stage===6&&s.stopped===true,ending,hints:s.hints&&typeof s.hints==='object'?s.hints:{},notes:typeof s.notes==='string'?s.notes.slice(0,3000):'',sound:s.sound===true};
  } catch { return fresh; }
}
export function collect(s,id) { if(evidenceIds.includes(id)&&!s.evidence.includes(id)) s.evidence.push(id); }
export function begin(s) { collect(s,'letter'); s.stage=Math.max(s.stage,1); }
export function solveMembership(s,answer) {
  if(s.stage<1) return {ok:false,message:'先看看花园里的那封匿名来信。'};
  if(normalize(answer)!=='0614') return {ok:false,message:'日期不对。会员卡没有回应。'};
  collect(s,'membership'); s.stage=Math.max(s.stage,2); return {ok:true};
}
export function solveSequence(s,sequence) {
  if(s.stage<2) return {ok:false,message:'先领取花园会员卡，再来参加小课堂。'};
  if(sequence.join(',')!=='sun,cloud,rain,moon') return {ok:false,message:'顺序不对。播放列表无法拼接。'};
  collect(s,'tape'); s.stage=Math.max(s.stage,3); return {ok:true};
}
export function solveStaff(s,id,password) {
  if(s.stage<3) return {ok:false,message:'需要先找到旧动画的异常片段。'};
  if(normalize(id)!=='M17'||normalize(password)!=='0427') return {ok:false,message:'凭据不匹配。连接被拒绝。'};
  s.staff=true;s.stage=Math.max(s.stage,4);collect(s,'memo');return {ok:true};
}
export function solveVault(s,answer) {
  if(!s.staff||!['ledger','route','consent'].every(id=>s.evidence.includes(id))) return {ok:false,message:'先阅读账单、转运单与授权书，凑齐完整证据。'};
  if(!s.timelineSolved) return {ok:false,message:'时间记录存在矛盾。封存索引需要先完成档案校对。'};
  if(normalize(answer)!=='071623') return {ok:false,message:'编号错误。未找到对应的封存记录。'};
  collect(s,'truth');s.stage=Math.max(s.stage,5);return {ok:true};
}
export function solveDeduction(s,answers) {
  if(s.stage<5) return {ok:false,message:'还没有取得封存档案。'};
  if(answers.join(',')!=='families,screening,ward') return {ok:false,message:'这条推理仍有矛盾。对照原始账单、授权书和小满的档案再看看。'};
  s.stage=6;return {ok:true};
}
export function finish(s,choice) {
  if(s.stage<6) return {ok:false,message:'先完成调查推理。'};
  if(!s.wardLocated) return {ok:false,message:'还没有确认小满的具体位置。'};
  if(!['publish','leave'].includes(choice)) return {ok:false,message:'未知选择。'};
  s.ending=choice==='leave'?'sunny':s.backedUp&&s.stopped?'dawn':'echo';return {ok:true,ending:s.ending};
}
export function solveTimeline(s,order,conclusion){
  if(!s.staff||!['ledger','route','consent'].every(id=>s.evidence.includes(id)))return {ok:false,message:'原始文件不完整，暂时无法建立时间线。'};
  if(order.join(',')!=='checkup,authorization,graduation,transfer')return {ok:false,message:'事件顺序与原始记录不一致。'};
  if(conclusion!=='still-inside')return {ok:false,message:'这个结论无法解释两份记录的时间差。'};
  s.timelineSolved=true;collect(s,'timeline');return {ok:true};
}
export function locateWard(s,room){
  if(s.stage<6||!s.evidence.includes('truth'))return {ok:false,message:'需要先还原事件真相。'};
  if(normalize(room)!=='B202')return {ok:false,message:'这个房间与交班记录不符。'};
  s.wardLocated=true;collect(s,'ward');return {ok:true};
}
