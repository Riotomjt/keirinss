import React, { useState, useEffect, useRef } from "react";
/* ==============================================================
   SSケイリン 〜目指せSS 漢の中の漢道〜 v3
   ============================================================== */

// ─── 車番カラー ────────────────────────────────────────────────
const CAR_COLORS = [null,
  {bg:"#f0f0f0",fg:"#111",name:"白"},{bg:"#1b1b1b",fg:"#fff",name:"黒"},
  {bg:"#e23a2e",fg:"#fff",name:"赤"},{bg:"#1d6fe0",fg:"#fff",name:"青"},
  {bg:"#f2d022",fg:"#222",name:"黄"},{bg:"#1d9e4f",fg:"#fff",name:"緑"},
  {bg:"#f07e1d",fg:"#fff",name:"橙"},{bg:"#f06fae",fg:"#fff",name:"桃"},
  {bg:"#8a5cd6",fg:"#fff",name:"紫"},
];

// ─── 級班 ────────────────────────────────────────────────────
const RANKS=["A3","A2","A1","S2","S1","SS"];
const RANK_LABEL={A3:"A級3班",A2:"A級2班",A1:"A級1班",S2:"S級2班",S1:"S級1班",SS:"S級S班"};
const RANK_REQ={A3:360,A2:720,A1:1260,S2:1950,S1:2850}; // SSへの道は3倍険しい
const RANK_MULT={A3:1,A2:1.2,A1:1.5,S2:1.9,S1:2.4,SS:3};
const GRADE_LABEL={A3:"F2戦",A2:"F2戦",A1:"F1戦",S2:"G3戦",S1:"G1戦",SS:"KEIRINグランプリ"};
// グランプリは一度きり。制覇後のSS級本番レースは「ハードモード」に切り替わる（アーケードモードのみ）
const isHardMode=career=>career&&career.mode!=="real"&&career.rank==="SS"&&(career.rec&&career.rec.gp||0)>=1;
// レース種別の表示ラベル。リアルモードはctx.realGrade（実際に選ばれたグレード）を優先表示する。
// ctx.realEventName/realRoundLabelがあれば開催名＋ラウンド（例：「日本選手権競輪（ダービー）・予選」）を表示（P2）。
const raceGradeLabel=(career,ctx)=>{
  if(career&&career.mode==="real"&&ctx&&ctx.realGrade){
    const base=ctx.realEventName||REAL_GRADE_LABEL[ctx.realGrade]||ctx.realGrade;
    return ctx.realRoundLabel?base+"・"+ctx.realRoundLabel:base;
  }
  return isHardMode(career)?"👿 ハードモード":GRADE_LABEL[career.rank];
};
// ─── 昇級ボス（各班の門番ライバル）────────────────────────────
// 規定ポイント到達 or 9連勝で挑戦権。倒さない限り昇級できない。
// skill: ボス固有スキル（プレイヤーへの妨害）。type別の効果：
//   nerf : 残りat(m)で発動。dur秒間プレイヤー最高速×power（減速デバフ）
//   bind : 残りat(m)で発動。dur秒間プレイヤーの連打(スパート踏み込み)が無効
//   block: プレイヤーが真横に並ぶと発動。dur秒間急失速（uses回まで/クールダウンあり）
const BOSSES={
  A3:{name:"荒鷲 竜二",  icon:"🦅",style:"nige",  region:"北日本", stats:{pow:99, spd:85, sta:94, tec:72},  title:"A級2班の門番",   quote:"ルーキー狩りが俺の朝メシだ。",       reward:120,
    skill:{name:"鷲掴み",icon:"🦅",type:"nerf",at:450,power:0.93,dur:4,uses:1,
      desc:"残り450mで発動。4秒間あなたの最高速-7%",counter:"効果中は無理に踏まずスタミナ温存。切れた瞬間に全開だ"}},
  A2:{name:"鉄馬 剛",    icon:"🐴",style:"makuri",region:"中部",   stats:{pow:179,spd:197,sta:168,tec:159}, title:"A級1班の門番",   quote:"この壁、越えられるもんなら越えてみな。", reward:200,
    skill:{name:"鉄蹄圧",icon:"🐴",type:"bind",at:420,power:1,dur:2.5,uses:1,
      desc:"残り420mで発動。2.5秒間あなたの連打が無効（踏めない）",counter:"発動前に早めに仕掛けるか、解除後の末脚に賭けろ"}},
  A1:{name:"疾風 隼人",  icon:"🌪",style:"sashi", region:"南関東", stats:{pow:264,spd:293,sta:258,tec:300}, title:"S級2班の門番",   quote:"S級の風は、お前が思うより冷たいぜ。",   reward:350,
    skill:{name:"向かい風",icon:"🌪",type:"nerf",at:400,power:0.90,dur:5,uses:1,
      desc:"残り400mで発動。5秒間あなたの最高速-10%",counter:"風よけで脚を溜め、効果切れの残り200m前後で差し返せ"}},
  S2:{name:"雷帝 五郎丸",icon:"⚡",style:"nige",  region:"近畿",   stats:{pow:394,spd:367,sta:385,tec:336}, title:"S級1班の門番",   quote:"雷は二度、同じ場所には落ちん。俺は毎回落とす。", reward:600,
    skill:{name:"雷落とし",icon:"⚡",type:"block",at:0,power:1,dur:0.5,uses:2,
      desc:"真横に並ぶと発動。0.5秒間あなたは急失速（2回まで）",counter:"真横に長居は禁物。一気に抜き去るか、内外を大きく変えろ"}},
  S1:{name:"不動 王蔵",  icon:"👹",style:"makuri",region:"九州",   stats:{pow:490,spd:486,sta:480,tec:474}, title:"S級S班 最後の門番", quote:"SSの椅子は9つ。お前の席は…ない。",  reward:1200,
    skill:{name:"不動金縛り",icon:"👹",type:"bind",at:350,power:1,dur:3,uses:1,
      desc:"残り350mで発動。3秒間あなたの連打が無効（踏めない）",counter:"350mより前に勝負を決めておくか、解除後の一瞬に全てを込めろ"}},
};

const RANK_BAND={A3:[24,62],A2:[78,140],A1:[148,220],S2:[228,300],S1:[308,380],SS:[398,470]};
const PLACE_PTS=[32,26,21,17,14,-6,-10,-14,-18]; // 6位以下は競走得点マイナス
const PLACE_MONEY=[70,42,30,22,16,12,9,7,5];

// ─── 脚質 ──────────────────────────────────────────────────
const STYLES={
  nige:{label:"逃げ",b:{pow:10,spd:3,sta:7,tec:0},desc:"先頭を駆ける自力型。風を受けても押し切るパワーとスタミナが武器。"},
  makuri:{label:"捲り",b:{pow:7,spd:9,sta:2,tec:2},desc:"中団に構え、終盤に一気に外から襲いかかるスピード型。"},
  sashi:{label:"差し",b:{pow:2,spd:6,sta:2,tec:10},desc:"前の選手の風よけを利用して脚を溜め、最後の直線で差し切る技巧派。"},
};

// ─── キャラクター（主人公）＋固有スキル ──────────────────────
// 各キャラは脚質と固有スキルを1つ持つ。スキルはレース中の「一時速度バフ」で、
// stepSim内の1箇所(skillMul)にのみ作用する。恒久ステ加算はせず経済を壊さない。
//   trigger: "manual"      … スパート解禁後、プレイヤーがボタンで任意発動
//           "auto_bell"    … ジャン(残り600m)到達で自動発動
//           "auto_last"    … 最終直線(残り200m)到達で自動発動
//   power  : 最高速に乗る倍率（1.12 = +12%）
//   dur    : 効果継続秒数
//   uses   : 1レースあたりの発動回数
const CHARACTERS=[
  {id:"kaze", name:"疾風 迅",  icon:"🌪", style:"nige",  color:"#7ee0ff",
    catch:"風になれ。",
    skill:{id:"kamikaze",name:"神風",icon:"🌀",trigger:"manual",power:1.14,dur:5.0,uses:1,
      desc:"発動から5秒間、最高速+14%。逃げ切りの切り札。",
      short:"5秒間 最高速+14%"}},
  {id:"honoo",name:"炎尾 剛", icon:"🔥", style:"makuri",color:"#ff8a4d",
    catch:"根性で捲る。",
    skill:{id:"bakushin",name:"爆進",icon:"💥",trigger:"manual",power:1.16,dur:4.0,uses:1,
      desc:"発動から4秒間、最高速+16%。中団から一気に外を捲る。",
      short:"4秒間 最高速+16%"}},
  {id:"shizuku",name:"雫 静流",icon:"❄️", style:"sashi", color:"#ba93f5",
    catch:"最後に、差す。",
    skill:{id:"kessen",name:"月影の差し",icon:"🌙",trigger:"auto_last",power:1.18,dur:3.2,uses:1,
      desc:"最終直線で自動発動。3.2秒間、最高速+18%。ゴール前の一閃。",
      short:"最終直線で自動発動 最高速+18%"}},
];
const charById=id=>CHARACTERS.find(c=>c.id===id)||null;
// セーブのcharIdから脚質を解決（旧データはstyleフィールドを尊重）
function careerStyle(career){
  const ch=charById(career.charId);
  return ch?ch.style:career.style;
}
// ─── 獲得スキル（ボス撃破・GP制覇の報酬）──────────────────────
// ボスを倒すとそのボスのスキルを「自分の必殺技」として獲得できる。
// 自分が使う場合は相手への妨害技に反転する。kind別の効果：
//   opp_nerf : dur秒間、敵全員の最高速×mul（全体減速）
//   opp_stun : 直前を走る敵1人を dur秒 急失速させる
//   ouja     : 王者の風格。dur秒間 自分+15% ＆ 敵スキル無効＋被デバフ即解除
const ACQUIRED_SKILLS={
  washizukami:{id:"washizukami",name:"鷲掴み",icon:"🦅",trigger:"manual",kind:"opp_nerf",mul:0.93,dur:4,uses:1,power:1,fromBoss:"A3",
    short:"4秒間 敵全員の最高速-7%",desc:"荒鷲竜二から奪った技。4秒間、敵全員を-7%減速させる"},
  tettei:{id:"tettei",name:"鉄蹄圧",icon:"🐴",trigger:"manual",kind:"opp_nerf",mul:0.90,dur:2.5,uses:1,power:1,fromBoss:"A2",
    short:"2.5秒間 敵全員の最高速-10%",desc:"鉄馬剛から奪った技。2.5秒間、敵全員を-10%減速させる"},
  mukaikaze:{id:"mukaikaze",name:"向かい風",icon:"🌪",trigger:"manual",kind:"opp_nerf",mul:0.90,dur:5,uses:1,power:1,fromBoss:"A1",
    short:"5秒間 敵全員の最高速-10%",desc:"疾風隼人から奪った技。5秒間、敵全員に向かい風を浴びせる"},
  kaminari:{id:"kaminari",name:"雷落とし",icon:"⚡",trigger:"manual",kind:"opp_stun",mul:1,dur:1.2,uses:2,power:1,fromBoss:"S2",
    short:"直前の敵1人を1.2秒急失速（2回）",desc:"雷帝五郎丸から奪った技。直前を走る敵に雷を落とし急失速させる"},
  fudo:{id:"fudo",name:"不動金縛り",icon:"👹",trigger:"manual",kind:"opp_nerf",mul:0.88,dur:3,uses:1,power:1,fromBoss:"S1",
    short:"3秒間 敵全員の最高速-12%",desc:"不動王蔵から奪った技。3秒間、敵全員を金縛りで縛り上げる"},
  ouja:{id:"ouja",name:"王者の風格",icon:"👑",trigger:"manual",kind:"ouja",mul:1,dur:3,uses:1,power:1.15,
    short:"3秒間 スピード+15%＆他スキル無効",desc:"KEIRINグランプリ制覇の証。3秒間スピード+15%、敵スキルを無効化し受けているデバフも払う"},
  // ── ハードモード周回報酬スキル ──
  hard100:{id:"hard100",name:"スタミナブレイク",icon:"💔",trigger:"manual",kind:"opp_sta_cut",mul:2/3,dur:0.5,uses:1,power:1,
    short:"敵全員の残りスタミナを2/3に削る",desc:"ハードモード100勝の証。発動した瞬間、敵全員の残りスタミナを3分の2に削り取る"},
  hard200:{id:"hard200",name:"オーバードライブ",icon:"🚀",trigger:"manual",kind:"self",mul:1,dur:2,uses:1,power:2.0,
    short:"2秒間 スピード+100%",desc:"ハードモード200勝の証。2秒間だけ限界の2倍で異次元の加速をする"},
  hard300:{id:"hard300",name:"時間停止",icon:"⏱",trigger:"manual",kind:"opp_stun3",mul:1,dur:2,uses:1,power:1,
    short:"ランダムな敵3人を2秒間停止",desc:"ハードモード300勝の証。ランダムに選んだ敵3人の時を2秒間止める"},
};
// ハード勝利数 → 獲得スキルのマイルストーン
const HARD_SKILL_MILESTONES={100:"hard100",200:"hard200",300:"hard300"};

// ─── ハードモード周回報酬：特別アイテム（10勝ごと・全30種）──────
// 装備画面の「特別アイテム」枠に1つだけ装着できる。効果はレース中のみ。
//   type "start": 号砲で必ず最前列スタート（位置取り最優先＋前受け）
//   type "opp"  : 敵全員の指定ステータスを v 下げる
//   type "self" : 自分の指定ステータスを v 上げる（"all"は全ステ）
//   type "regen": スタミナ回復速度が v 倍
//   type "draft": 風よけ効率が v ぶん向上（消費がさらに減る）
const HARD_REWARDS=[
  {id:"h10", at:10, name:"ロケットスタータ",   icon:"🚀",type:"start",           desc:"号砲と同時に必ず最前列スタートを取れる"},
  {id:"h20", at:20, name:"威圧のゼッケン",     icon:"😤",type:"opp",stat:"pow",v:30,desc:"敵全員のパワー-30"},
  {id:"h30", at:30, name:"剛脚サポーター",     icon:"💪",type:"self",stat:"pow",v:20,desc:"自分のパワー+20"},
  {id:"h40", at:40, name:"回復の呼吸法",       icon:"🫁",type:"regen",v:1.3,       desc:"スタミナ回復速度1.3倍"},
  {id:"h50", at:50, name:"乱気流ホイール",     icon:"🌀",type:"opp",stat:"spd",v:30,desc:"敵全員のスピード-30"},
  {id:"h60", at:60, name:"風読みの眼",         icon:"🌬",type:"draft",v:0.08,      desc:"風よけの消費軽減がさらに向上"},
  {id:"h70", at:70, name:"神速インソール",     icon:"⚡",type:"self",stat:"spd",v:20,desc:"自分のスピード+20"},
  {id:"h80", at:80, name:"消耗の重圧",         icon:"🥵",type:"opp",stat:"sta",v:40,desc:"敵全員のスタミナ-40"},
  {id:"h90", at:90, name:"温泉の心得",         icon:"♨️",type:"regen",v:1.5,       desc:"スタミナ回復速度1.5倍"},
  {id:"h100",at:100,name:"鉄人ベルト",         icon:"🛡",type:"self",stat:"sta",v:30,desc:"自分のスタミナ+30"},
  {id:"h110",at:110,name:"幻惑ライン",         icon:"🧠",type:"opp",stat:"tec",v:40,desc:"敵全員のテクニック-40"},
  {id:"h120",at:120,name:"完全無風の型",       icon:"🌪",type:"draft",v:0.12,      desc:"風よけの消費軽減が大きく向上"},
  {id:"h130",at:130,name:"千里眼ゴーグル",     icon:"🎯",type:"self",stat:"tec",v:30,desc:"自分のテクニック+30"},
  {id:"h140",at:140,name:"王者の眼光",         icon:"💢",type:"opp",stat:"pow",v:50,desc:"敵全員のパワー-50"},
  {id:"h150",at:150,name:"超ロケットスタータ", icon:"🛸",type:"start",             desc:"最前列スタート＋序盤の主導権を完全掌握"},
  {id:"h160",at:160,name:"業火ペダル",         icon:"🔥",type:"self",stat:"pow",v:35,desc:"自分のパワー+35"},
  {id:"h170",at:170,name:"氷結スポーク",       icon:"🧊",type:"opp",stat:"spd",v:50,desc:"敵全員のスピード-50"},
  {id:"h180",at:180,name:"不死鳥の心肺",       icon:"🫀",type:"regen",v:1.8,       desc:"スタミナ回復速度1.8倍"},
  {id:"h190",at:190,name:"支配者の風下",       icon:"👁",type:"draft",v:0.16,      desc:"風よけがほぼ無消費レベルに"},
  {id:"h200",at:200,name:"流星クリート",       icon:"✨",type:"self",stat:"spd",v:35,desc:"自分のスピード+35"},
  {id:"h210",at:210,name:"鉛の呪縛",           icon:"⛓",type:"opp",stat:"sta",v:60,desc:"敵全員のスタミナ-60"},
  {id:"h220",at:220,name:"不動のコア",         icon:"🗿",type:"self",stat:"sta",v:45,desc:"自分のスタミナ+45"},
  {id:"h230",at:230,name:"死角の魔術",         icon:"🕳",type:"opp",stat:"tec",v:60,desc:"敵全員のテクニック-60"},
  {id:"h240",at:240,name:"完璧な展開図",       icon:"🧭",type:"self",stat:"tec",v:45,desc:"自分のテクニック+45"},
  {id:"h250",at:250,name:"覇王の重圧",         icon:"🌋",type:"opp",stat:"pow",v:70,desc:"敵全員のパワー-70"},
  {id:"h260",at:260,name:"津波ドラフト",       icon:"🌊",type:"draft",v:0.20,      desc:"風よけ効率が極限まで向上"},
  {id:"h270",at:270,name:"超回復遺伝子",       icon:"🧬",type:"regen",v:2.2,       desc:"スタミナ回復速度2.2倍"},
  {id:"h280",at:280,name:"彗星の脚",           icon:"☄️",type:"self",stat:"spd",v:50,desc:"自分のスピード+50"},
  {id:"h290",at:290,name:"蜘蛛の糸",           icon:"🕸",type:"opp",stat:"spd",v:70,desc:"敵全員のスピード-70"},
  {id:"h300",at:300,name:"三百勝の勲章",       icon:"👑",type:"self",stat:"all",v:25,desc:"自分の全ステータス+25。三百戦の王の証"},
];
// 装着中の特別アイテムを解決（未所持・未装着ならnull）
function hardItemOf(career){
  if(!career||!career.hardItemUse)return null;
  if(!(career.hardItems||[]).includes(career.hardItemUse))return null;
  return HARD_REWARDS.find(i=>i.id===career.hardItemUse)||null;
}
const acquiredById=id=>ACQUIRED_SKILLS[id]||null;
// ボスのランクキー → 獲得スキルID
const BOSS_SKILL_REWARD={A3:"washizukami",A2:"tettei",A1:"mukaikaze",S2:"kaminari",S1:"fudo"};

// セーブから「現在装備中の必殺技」を解決。
// useSkill(獲得スキルID)が設定されていればそれを、無ければキャラ固有スキルを使う。
// リアルモード（career.mode==="real"）は架空の必殺スキルを一切持たない。
function careerSkill(career){
  if(career&&career.mode==="real")return null;
  if(career&&career.useSkill&&(career.skills||[]).includes(career.useSkill)){
    const aq=acquiredById(career.useSkill);
    if(aq)return aq;
  }
  const ch=charById(career&&career.charId);
  return ch?ch.skill:null;
}
// キャラ解放ルール：最初に選んだキャラは常時所持。残りは班が上がるごとに1人ずつ解放。
// 解放に必要なランクのインデックス（RANKS内の位置）を、初期キャラ以外に若い順で割り当てる。
// 例）初期キャラ=炎尾なら、残り(疾風・雫)はそれぞれ A2到達・A1到達 で解放。
function charUnlockRankIndex(career,charId){
  if(!career||career.charId===charId)return 0; // 初期キャラは最初(A3)から所持
  const others=CHARACTERS.filter(c=>c.id!==career.charId).map(c=>c.id);
  const pos=others.indexOf(charId);           // 0,1,... の順
  return pos<0?99:pos+1;                        // A2(index1), A1(index2)...で解放
}
function isCharUnlocked(career,charId){
  const need=charUnlockRankIndex(career,charId);
  return RANKS.indexOf(career.rank)>=need;
}
// 現在解放済みのキャラID一覧
function unlockedCharIds(career){
  return CHARACTERS.filter(c=>isCharUnlocked(career,c.id)).map(c=>c.id);
}

// ─── 作戦 ──────────────────────────────────────────────────
const STRATS=[
  {id:"senko",label:"先行勝負",pref:1,slot:0,hint:"ジャン前後で早めにスパート！",desc:"ラインの先頭で風を受けながら押し切る王道自力戦。"},
  {id:"bante",label:"番手戦",pref:2,slot:1,hint:"残り250〜350mでスパート！",desc:"味方の逃げ選手の直後＝風よけ特等席。脚を溜めて最後に差す。"},
  {id:"makuri",label:"捲り狙い",pref:5,slot:-1,hint:"残り350〜450mで外を踏む！",desc:"中団単騎で構え、終盤に外からまとめて抜き去る。"},
  {id:"oikomi",label:"追い込み",pref:7,slot:-1,hint:"残り250mまで我慢して直線一気！",desc:"後方で温存し、ゴール前の末脚にすべてを賭ける。"},
];

// ─── 練習 ──────────────────────────────────────────────────
const TRAININGS=[
  {id:"pow",name:"もがき練習",icon:"💥",stat:"pow",fat:24,desc:"全力ダッシュ反復。パワーが上がる"},
  {id:"spd",name:"バンク走行",icon:"⚡",stat:"spd",fat:24,desc:"実戦バンクで高速巡航。スピードが上がる"},
  {id:"sta",name:"街道練習",icon:"🛣",stat:"sta",fat:24,desc:"長距離走り込み。スタミナが上がる"},
  {id:"tec",name:"競走訓練",icon:"🧠",stat:"tec",fat:24,desc:"位置取りと風よけの技術が上がる"},
  {id:"rest",name:"完全休養",icon:"🛌",stat:null,fat:-45,desc:"疲労をしっかり回復。体調を整える"},
];
const STAT_LABEL={pow:"パワー",spd:"スピード",sta:"スタミナ",tec:"テクニック"};
// 練習の上昇量はランクで変動（n=通常 / c=大成功）。初期A3は通常3・大成功5
const TRAIN_GAIN={A3:{n:3,c:5},A2:{n:5,c:8},A1:{n:8,c:13},S2:{n:12,c:20},S1:{n:16,c:27},SS:{n:20,c:34}};

// ─── ショップ ────────────────────────────────────────────────
// slot付きアイテム＝装備品。購入後「装備」画面で着脱でき、装備中のみ効果を発揮する。
const EQUIP_SLOTS=[
  {id:"frame", label:"フレーム",   icon:"🚲"},
  {id:"wheel", label:"ホイール",   icon:"🛞"},
  {id:"tire",  label:"タイヤ",     icon:"⭕"},
  {id:"handle",label:"ハンドル",   icon:"🔧"},
  {id:"saddle",label:"サドル",     icon:"🪑"},
  {id:"drive", label:"駆動系",     icon:"⚙️"},
  {id:"shoes", label:"シューズ",   icon:"👟"},
  {id:"acc",   label:"アクセサリ", icon:"🎽"},
];

// ─── シリーズ（セット効果）────────────────────────────────────
// 同じシリーズのパーツを複数装備すると追加ボーナスが発動する
const SERIES_DEF={
  aero:  {label:"エアロの系譜", color:"#7ee0ff", steps:[[2,{spd:8}],[4,{spd:20}]]},
  power: {label:"剛脚の証",     color:"#f06a6a", steps:[[2,{pow:8}],[4,{pow:20}]]},
  iron:  {label:"鉄人の構え",   color:"#7ee08a", steps:[[2,{sta:8}],[4,{sta:20}]]},
  craft: {label:"職人の魂",     color:"#ba93f5", steps:[[2,{tec:8}],[4,{tec:20}]]},
  legend:{label:"GP決戦モデル", color:"#ffd34d", steps:[[3,{pow:8,spd:8,sta:8,tec:8}],[5,{pow:16,spd:16,sta:16,tec:16}]]},
};
const SHOP_ITEMS=[
  // ── フレーム ──
  {id:"cromo_frame", cat:"parts",slot:"frame", tier:1,series:"iron",  name:"クロモリフレーム",      icon:"🚲",price:40,  desc:"しなやかな鋼の定番。長持ちする相棒",stat:"sta",bonus:8},
  {id:"alu_frame",   cat:"parts",slot:"frame", tier:1,               name:"軽量アルミフレーム",    icon:"🔩",price:45,  desc:"手頃で軽い。最初の一本に最適",stat:"spd",bonus:8},
  {id:"stiff_frame", cat:"parts",slot:"frame", tier:2,series:"power",name:"剛性マスプロフレーム",  icon:"🏗",price:200, desc:"踏んだ力を一切逃さない硬派な一本",stat:"pow",bonus:12,stat2:"sta",bonus2:4},
  {id:"carbon_frame",cat:"parts",slot:"frame", tier:2,series:"aero", name:"カーボンフレーム",      icon:"⚫",price:180, desc:"超軽量・高剛性フレーム",stat:"spd",bonus:12,stat2:"sta",bonus2:8},
  {id:"aero_frame",  cat:"parts",slot:"frame", tier:3,series:"aero", name:"エアロカーボンフレーム",icon:"🌀",price:650, desc:"風洞開発の空力形状。異次元の伸び",stat:"spd",bonus:20,stat2:"pow",bonus2:8},
  {id:"gp_frame",    cat:"parts",slot:"frame", tier:4,series:"legend",name:"GP決戦フレーム",       icon:"👑",price:2600,desc:"グランプリ決戦専用の一点物",stat:"spd",bonus:24,stat2:"pow",bonus2:16},
  // ── ホイール ──
  {id:"light_wheel", cat:"parts",slot:"wheel", tier:1,               name:"軽量ホイール",          icon:"🔵",price:50,  desc:"空気抵抗を削る超軽量ホイール",stat:"spd",bonus:12},
  {id:"tough_wheel", cat:"parts",slot:"wheel", tier:1,series:"iron", name:"耐久鍛錬ホイール",      icon:"🛞",price:55,  desc:"重いが脚が鍛わる。粘りの源",stat:"sta",bonus:8,stat2:"pow",bonus2:4},
  {id:"disc_wheel",  cat:"parts",slot:"wheel", tier:2,series:"aero", name:"ディスクホイール",      icon:"💿",price:320, desc:"円盤状のリアで直線が伸びる",stat:"spd",bonus:16,stat2:"pow",bonus2:8},
  {id:"deep_wheel",  cat:"parts",slot:"wheel", tier:3,series:"aero", name:"カーボンディープリム",  icon:"🌪",price:950, desc:"高速巡航の切り札。風を切り裂く",stat:"spd",bonus:24,stat2:"tec",bonus2:8},
  {id:"gp_wheel",    cat:"parts",slot:"wheel", tier:4,series:"legend",name:"GP決戦ホイール",       icon:"🌟",price:2800,desc:"決戦の朝にだけ組まれる勝負ホイール",stat:"spd",bonus:28,stat2:"pow",bonus2:12},
  // ── タイヤ ──
  {id:"train_tire",  cat:"parts",slot:"tire",  tier:1,series:"iron", name:"耐パンクタイヤ",        icon:"⭕",price:35,  desc:"何百キロ走っても裂けない練習の友",stat:"sta",bonus:8},
  {id:"race_tire",   cat:"parts",slot:"tire",  tier:2,series:"aero", name:"決戦用チューブラー",    icon:"⚡",price:280, desc:"路面に吸い付く決戦用の細身",stat:"spd",bonus:12,stat2:"tec",bonus2:4},
  {id:"silk_tire",   cat:"parts",slot:"tire",  tier:3,series:"craft",name:"絹巻きチューブラー",    icon:"🎗",price:900, desc:"絹糸で巻いた極上品。転がりが違う",stat:"spd",bonus:16,stat2:"tec",bonus2:12},
  {id:"gp_tire",     cat:"parts",slot:"tire",  tier:4,series:"legend",name:"GP決戦タイヤ",         icon:"💫",price:2400,desc:"一本のレースのためだけに存在する",stat:"spd",bonus:20,stat2:"pow",bonus2:12},
  // ── ハンドル ──
  {id:"aero_bar",    cat:"parts",slot:"handle",tier:1,series:"aero", name:"エアロハンドル",        icon:"🔧",price:60,  desc:"空力ポジションで差し込みが鋭く",stat:"tec",bonus:8},
  {id:"bull_bar",    cat:"parts",slot:"handle",tier:2,series:"iron", name:"鉄人ブルホーン",        icon:"🐂",price:240, desc:"どっしり構えて消耗を抑える",stat:"sta",bonus:12,stat2:"tec",bonus2:4},
  {id:"carbon_bar",  cat:"parts",slot:"handle",tier:2,               name:"カーボンハンドル",      icon:"🖤",price:260, desc:"路面の振動を吸収し操作が正確に",stat:"tec",bonus:16},
  {id:"craft_bar",   cat:"parts",slot:"handle",tier:3,series:"craft",name:"職人曲げハンドル",      icon:"🛠",price:820, desc:"名工が体格に合わせて曲げた特注品",stat:"tec",bonus:20,stat2:"spd",bonus2:8},
  {id:"gp_bar",      cat:"parts",slot:"handle",tier:4,series:"legend",name:"GP決戦ハンドル",       icon:"✴️",price:2400,desc:"握った瞬間に勝ちを確信する形",stat:"tec",bonus:24,stat2:"pow",bonus2:12},
  // ── サドル ──
  {id:"gel_saddle",  cat:"parts",slot:"saddle",tier:1,series:"iron", name:"ジェルサドル",          icon:"🪑",price:40,  desc:"長丁場でも尻が痛まない。消耗減",stat:"sta",bonus:8},
  {id:"carbon_saddle",cat:"parts",slot:"saddle",tier:2,series:"aero",name:"カーボンサドル",        icon:"🖤",price:250, desc:"羽根のように軽い一枚モノ",stat:"spd",bonus:8,stat2:"tec",bonus2:8},
  {id:"craft_saddle",cat:"parts",slot:"saddle",tier:3,series:"craft",name:"職人手縫いサドル",      icon:"🧵",price:780, desc:"革を手縫いした逸品。腰が決まる",stat:"tec",bonus:16,stat2:"sta",bonus2:8},
  {id:"gp_saddle",   cat:"parts",slot:"saddle",tier:4,series:"legend",name:"GP決戦サドル",         icon:"💺",price:2300,desc:"王者の座は一つしかない",stat:"tec",bonus:20,stat2:"sta",bonus2:16},
  // ── 駆動系 ──
  {id:"pro_crank",   cat:"parts",slot:"drive", tier:1,               name:"プロ仕様クランク",      icon:"⚙️",price:75,  desc:"踏み込みの力を推進力に直結",stat:"pow",bonus:12},
  {id:"ceramic_bb",  cat:"parts",slot:"drive", tier:2,series:"craft",name:"セラミックBB",          icon:"⚪",price:300, desc:"回転の抵抗が消える精密ベアリング",stat:"spd",bonus:12,stat2:"tec",bonus2:8},
  {id:"ti_gear",     cat:"parts",slot:"drive", tier:2,series:"power",name:"チタンギア",            icon:"🔩",price:340, desc:"軽く硬い。かかりが別物になる",stat:"pow",bonus:16,stat2:"spd",bonus2:8},
  {id:"big_gear",    cat:"parts",slot:"drive", tier:3,series:"power",name:"特注ビッグギア",        icon:"💪",price:1050,desc:"踏める者だけが許される大ギア",stat:"pow",bonus:24,stat2:"tec",bonus2:8},
  {id:"gp_drive",    cat:"parts",slot:"drive", tier:4,series:"legend",name:"GP決戦ドライブ",       icon:"🔥",price:2700,desc:"一踏みで会場がどよめく",stat:"pow",bonus:28,stat2:"spd",bonus2:12},
  // ── シューズ ──
  {id:"race_shoes",  cat:"parts",slot:"shoes", tier:1,               name:"レーシングシューズ",    icon:"👟",price:45,  desc:"足とペダルを一体化する固定シューズ",stat:"pow",bonus:8},
  {id:"iron_shoes",  cat:"parts",slot:"shoes", tier:1,series:"iron", name:"鍛錬の重りシューズ",    icon:"🥾",price:60,  desc:"重い。だが履き続けた脚は裏切らない",stat:"sta",bonus:12},
  {id:"carbon_shoes",cat:"parts",slot:"shoes", tier:2,series:"power",name:"カーボンソールシューズ",icon:"🥿",price:290, desc:"たわまないソールで力が逃げない",stat:"pow",bonus:12,stat2:"tec",bonus2:8},
  {id:"order_shoes", cat:"parts",slot:"shoes", tier:3,series:"craft",name:"フルオーダーシューズ",  icon:"✨",price:880, desc:"足型から起こした完全特注品",stat:"pow",bonus:16,stat2:"spd",bonus2:12},
  {id:"gp_shoes",    cat:"parts",slot:"shoes", tier:4,series:"legend",name:"GP決戦シューズ",       icon:"👑",price:2500,desc:"頂点を踏むための一足",stat:"pow",bonus:20,stat2:"spd",bonus2:16},
  // ── アクセサリ ──
  {id:"hr_monitor",  cat:"parts",slot:"acc",   tier:1,               name:"心拍計",                icon:"⌚",price:35,  desc:"ペース配分が科学的に。無駄がなくなる",stat:"sta",bonus:8},
  {id:"aero_helmet", cat:"parts",slot:"acc",   tier:2,series:"aero", name:"エアロヘルメット",      icon:"🪖",price:160, desc:"頭から風を切る流線型",stat:"spd",bonus:8,stat2:"tec",bonus2:4},
  {id:"power_meter", cat:"parts",slot:"acc",   tier:2,series:"power",name:"パワーメーター",        icon:"📟",price:380, desc:"出力を数値で管理。踏みの質が変わる",stat:"pow",bonus:8,stat2:"tec",bonus2:8},
  {id:"alti_mask",   cat:"parts",slot:"acc",   tier:3,series:"iron", name:"高地トレマスク",        icon:"😤",price:420, desc:"心肺を極限まで鍛える呼吸負荷マスク",stat:"sta",bonus:16},
  {id:"hachimaki",   cat:"parts",slot:"acc",   tier:4,series:"legend",name:"勝負の鉢巻",           icon:"🔥",price:777, desc:"漢の魂が宿る。全能力が底上げされる気がする",stat:"pow",bonus:8,stat2:"sta",bonus2:8,stat3:"spd",bonus3:8,stat4:"tec",bonus4:8},

  {id:"katsudon",    cat:"supply",name:"勝負メシ カツ丼",     icon:"🍜",price:55, desc:"験担ぎの定番。疲労 -20 & 練習 +1",use:{fatigue:-20,train:1}},
  {id:"protein",     cat:"supply",name:"プロテイン",         icon:"🥤",price:15, desc:"トレーニング後の回復に。疲労 -15",use:{fatigue:-15}},
  {id:"massage",     cat:"supply",name:"スポーツマッサージ", icon:"💆",price:35, desc:"プロの施術で脚が軽くなる。疲労 -35",use:{fatigue:-35}},
  {id:"onsen",       cat:"supply",name:"温泉旅行",           icon:"♨️",price:90, desc:"心も体も完全リフレッシュ。疲労 全回復",use:{fatigue:-100}},
  {id:"energy",      cat:"supply",name:"エナジードリンク",   icon:"⚡",price:60, desc:"もうひと踏ん張り！練習回数 +1",use:{train:1}},
  {id:"camp",        cat:"supply",name:"強化合宿チケット",   icon:"🏕",price:150,desc:"集中特訓！練習回数 +2（疲労 +10）",use:{train:2,fatigue:10}},
  // ── ファッション ──
  {id:"train_wear",  cat:"fashion",name:"練習ウェア",         icon:"👕",price:10,  desc:"毎日の練習に欠かせない一着",perkFatigue:2},
  {id:"team_cap",    cat:"fashion",name:"チームキャップ",     icon:"🧢",price:18,  desc:"地元チームのロゴ入り。応援が増える",perkFatigue:1},
  {id:"race_jersey", cat:"fashion",name:"レーシングジャージ", icon:"🧥",price:30,  desc:"本格レース仕様。気合が入る",perkFatigue:2},
  {id:"sunglasses",  cat:"fashion",name:"スポーツサングラス", icon:"🕶",price:55,  desc:"眼光を隠す勝負師の顔",perkMoney:0.02},
  {id:"brand_suit",  cat:"fashion",name:"ブランドスーツ",     icon:"🤵",price:120, desc:"表彰式に映える高級スーツ",perkMoney:0.03},
  {id:"gold_watch",  cat:"fashion",name:"高級腕時計",         icon:"⌚",price:800, desc:"成功者の証。重みが違う",perkMoney:0.05},
  {id:"full_order",  cat:"fashion",name:"フルオーダーウェア", icon:"✨",price:350, desc:"一点物の職人仕上げ。もはやアート",perkMoney:0.05},
  // ── 乗り物 ──
  {id:"kei_car",     cat:"car",name:"中古軽自動車",       icon:"🚗",price:30,   desc:"競輪選手として初めての愛車！",perkTrain:1},
  {id:"minivan",     cat:"car",name:"ファミリーミニバン", icon:"🚐",price:150,  desc:"家族と遠征に行ける実用の一台",perkFatigue:3},
  {id:"sports_car",  cat:"car",name:"国産スポーツカー",   icon:"🏎",price:350,  desc:"勝ち進む選手にふさわしい一台",perkTrain:1,perkMoney:0.05},
  {id:"import_car",  cat:"car",name:"欧州輸入高級車",     icon:"🚘",price:1200, desc:"成功を手に入れた証",perkMoney:0.10},
  {id:"cruiser",     cat:"car",name:"大型クルーザー",     icon:"🛥",price:3800, desc:"海の上でオフを過ごす贅沢",perkFatigue:6},
  {id:"super_car",   cat:"car",name:"スーパーカー",       icon:"💥",price:5000, desc:"SS班の選手にしか買えない夢の車",perkTrain:2,perkMoney:0.10},
  {id:"hyper_car",   cat:"car",name:"億超えハイパーカー", icon:"💎",price:15000,desc:"グランプリ制覇記念の究極の一台",perkTrain:2,perkMoney:0.20},
];
const itemById=id=>SHOP_ITEMS.find(i=>i.id===id);
// 所持アイテムの永続特典を集計（練習+は最大値、賞金/疲労は合算上限つき）
function careerPerks(career){
  const owned=career.owned||[];
  let train=0,money=0,fat=0;
  for(const id of owned){
    const it=itemById(id);if(!it)continue;
    if(it.perkTrain)train=Math.max(train,it.perkTrain);
    if(it.perkMoney)money+=it.perkMoney;
    if(it.perkFatigue)fat+=it.perkFatigue;
  }
  return{train,money:Math.min(money,0.35),fatigue:Math.min(fat,12)};
}
function perkText(it){
  const p=[];
  if(it.perkTrain)p.push("練習回数 +"+it.perkTrain+"（永続）");
  if(it.perkMoney)p.push("賞金 +"+Math.round(it.perkMoney*100)+"%");
  if(it.perkFatigue)p.push("レース疲労 -"+it.perkFatigue);
  return p.join(" / ");
}
// 装備パーツの解放ランク（昇級すると上位パーツがショップに並ぶ）
const TIER_UNLOCK={1:"A3",2:"A2",3:"S2",4:"S1"};
function itemUnlockRank(it){
  if(it.cat!=="parts")return "A3";
  if(it.id.indexOf("gp_")===0)return "SS"; // GP決戦モデルは頂点の証
  return TIER_UNLOCK[it.tier||1]||"A3";
}
const rankGte=(a,b)=>RANKS.indexOf(a)>=RANKS.indexOf(b);
// アイテム単体の生ボーナス
function itemRawBonus(it){
  const b={pow:0,spd:0,sta:0,tec:0};
  if(!it)return b;
  if(it.stat)b[it.stat]+=it.bonus;
  if(it.stat2)b[it.stat2]+=it.bonus2;
  if(it.stat3)b[it.stat3]+=it.bonus3;
  if(it.stat4)b[it.stat4]+=it.bonus4;
  return b;
}
const itemTotal=it=>{const b=itemRawBonus(it);return b.pow+b.spd+b.sta+b.tec;};
// 装備中のシリーズ集計とセット効果の発動状況
function equipSets(career){
  const eq=career.equipped||{};const cnt={};
  for(const slot of Object.keys(eq)){
    const it=itemById(eq[slot]);
    if(it&&it.series)cnt[it.series]=(cnt[it.series]||0)+1;
  }
  const out=[];
  for(const sid of Object.keys(SERIES_DEF)){
    const def=SERIES_DEF[sid];const n=cnt[sid]||0;
    let active=null;
    for(const[need,b]of def.steps){if(n>=need)active={need,b};}
    out.push({id:sid,label:def.label,color:def.color,count:n,steps:def.steps,active});
  }
  return out;
}
// 装備中アイテムの合計ボーナス（セット効果込み）
function equipBonus(career){
  const b={pow:0,spd:0,sta:0,tec:0};
  const eq=career.equipped||{};
  for(const slot of Object.keys(eq)){
    const rb=itemRawBonus(itemById(eq[slot]));
    b.pow+=rb.pow;b.spd+=rb.spd;b.sta+=rb.sta;b.tec+=rb.tec;
  }
  for(const s of equipSets(career)){
    if(s.active){for(const k of Object.keys(s.active.b))b[k]+=s.active.b[k];}
  }
  return b;
}
// 所持パーツからスロットごとに最強を選ぶ（おまかせ装備）
function buildBestEquip(career){
  const owned=career.owned||[];const map={};
  for(const slot of EQUIP_SLOTS){
    let best=null;
    for(const it of SHOP_ITEMS){
      if(it.slot!==slot.id||!owned.includes(it.id))continue;
      if(!best||itemTotal(it)>itemTotal(best))best=it;
    }
    if(best)map[slot.id]=best.id;
  }
  return map;
}
// 素のステータス + 装備ボーナス = 実戦ステータス
function effStats(career){
  const b=equipBonus(career);
  return{pow:clamp(career.stats.pow+b.pow,0,500),spd:clamp(career.stats.spd+b.spd,0,500),
    sta:clamp(career.stats.sta+b.sta,0,500),tec:clamp(career.stats.tec+b.tec,0,500)};
}

// ─── Google AdSense 設定 ─────────────────────────────────────
const ADSENSE_CLIENT           = "ca-pub-5021031352922084";
const ADSENSE_SLOT_BANNER      = "9079432179";   // レース中バナー
const ADSENSE_SLOT_INTERSTITIAL= "8915780643";   // レース後インタースティシャル

// ─── 広告スペース（競輪場バックボード用看板テキスト）────────────
const ADS=[
  {text:"Google Ads",        bg:"#1a73e8",fg:"#fff"},
  {text:"Powered by AdSense",bg:"#34a853",fg:"#fff"},
  {text:"SSケイリン",        bg:"#f2d022",fg:"#222"},
  {text:"広告掲載中",        bg:"#ea4335",fg:"#fff"},
  {text:"AD",                bg:"#f07e1d",fg:"#fff"},
  {text:"競輪を、漢の道へ",  bg:"#8a5cd6",fg:"#fff"},
];

// ─── 日替わりショップ ────────────────────────────────────────
function daySeed(){return Math.floor(Date.now()/86400000);}
function hashId(s,seed){let h=(seed*2654435761)>>>0;for(let i=0;i<s.length;i++){h=((h^s.charCodeAt(i))*16777619)>>>0;}return h>>>0;}
function shopToday(seed){
  const stock={};
  const dealIdx=seed%SHOP_ITEMS.length;
  SHOP_ITEMS.forEach((it,idx)=>{stock[it.id]={inStock:(hashId(it.id,seed)%10)<7,deal:idx===dealIdx};});
  ["parts","fashion","car"].forEach(cat=>{
    const cheapest=SHOP_ITEMS.filter(i=>i.cat===cat).sort((a,b)=>a.price-b.price)[0];
    if(cheapest)stock[cheapest.id].inStock=true;
  });
  const dealItem=SHOP_ITEMS[dealIdx];if(dealItem)stock[dealItem.id].inStock=true;
  return stock;
}
function dealPrice(item,today){return today[item.id]&&today[item.id].deal?Math.round(item.price*0.8):item.price;}

// ─── 競輪場 ───────────────────────────────────────────────────
const VENUES=[
  {id:"north",name:"北輪スタジアム",loc:"北日本",sky:["#0a1326","#102844"],crowd:"#34507e",accent:"#62b6ff"},
  {id:"east",name:"東輪ドローム",loc:"南関東",sky:["#191023","#2a1838"],crowd:"#4a3a64",accent:"#ff8a65"},
  {id:"naniwa",name:"浪速バンク",loc:"近畿",sky:["#1a1608","#2e2410"],crowd:"#5a4a28",accent:"#ffd54f"},
  {id:"kyushu",name:"九州メモリアル",loc:"九州",sky:["#08160e","#10261a"],crowd:"#2a4a38",accent:"#5bd08a"},
  {id:"central",name:"中京ベロドローム",loc:"中部",sky:["#0e1420","#1c2636"],crowd:"#3a4656",accent:"#81c784"},
  {id:"seto",name:"瀬戸内アリーナ",loc:"四国",sky:["#101820","#1a2c34"],crowd:"#2e4a52",accent:"#4dd0e1"},
];

// ─── インタビューQ&A ─────────────────────────────────────────
const WIN_QA=[
  {q:"今日のレースを振り返って、いかがでしたか？",opts:[
    {t:"完璧でした！作戦通りの走りができました",sm:"smug",st:"ほう、余裕があるじゃねえか。…その自信、いつまでも持ち続けろ。"},
    {t:"キツかったですが、絶対に負けたくなかった！",sm:"happy",st:"その気持ちだよ！苦しい時こそ、本物の強さが出る！"},
    {t:"ライバルが強くて最後まで焦りました…",sm:"calm",st:"正直に話せるのも強さだ。次はもっと余裕を持って走れ。"},
  ]},
  {q:"ライバル選手にひとことどうぞ！",opts:[
    {t:"次は絶対に勝ちます！悔しがってください！",sm:"happy",st:"それでいい！宣戦布告は堂々とやれ！！"},
    {t:"皆さんのおかげで本当に成長できています",sm:"calm",st:"謙虚さも大事だが…ちっとは吠えろ（笑）。"},
    {t:"SS班で待っています！",sm:"smug",st:"…いいタンカだ。その言葉を嘘にするなよ。"},
  ]},
  {q:"勝因はずばり何でしたか？",opts:[
    {t:"日々の練習がすべてです。嘘はつきません",sm:"happy",st:"練習は裏切らねえ。お前はそれを証明したんだ。"},
    {t:"風よけをうまく使えたのが大きいです",sm:"smug",st:"位置取りが分かってきたな。それが競輪の頭脳ってやつだ。"},
    {t:"最後は気合と根性です！",sm:"angry",st:"ガハハ！結局そこよ！漢はハートで走るんだ！"},
  ]},
  {q:"沿道のファンに向けてメッセージを！",opts:[
    {t:"声援が背中を押してくれました。感謝です！",sm:"calm",st:"ファンあっての競輪だ。その気持ち、忘れんなよ。"},
    {t:"これからも応援、よろしくお願いします！",sm:"happy",st:"いい顔だ。ファンサービスも一流選手の仕事だぜ。"},
    {t:"次も勝つので賭けてください！",sm:"shock",st:"おいおい、車券の宣伝はほどほどにしとけ（笑）。"},
  ]},
  {q:"自分の走りに点数をつけるなら？",opts:[
    {t:"100点満点です！文句なしです",sm:"angry",st:"満点だと？上には上がいる。天狗になった奴から落ちていくんだ。"},
    {t:"80点。まだ伸びしろがあります",sm:"smug",st:"その冷静さ、悪くねえ。伸びしろを自覚できる奴は強くなる。"},
    {t:"勝てたので合格点でいいかなと",sm:"calm",st:"勝ちにこだわるのはいいことだ。だが内容も見直しとけ。"},
  ]},
  {q:"次の目標を聞かせてください！",opts:[
    {t:"もちろん全国制覇、SS班です！",sm:"happy",st:"でけえ目標は漢の証だ。その背中、追わせてもらうぜ。"},
    {t:"一戦一戦を大事に積み重ねます",sm:"smug",st:"足元を見れる奴は強い。コツコツが一番こええんだ。"},
    {t:"上がりタイムの記録更新を狙います",sm:"calm",st:"タイムを意識するか。プロの目線になってきたじゃねえか。"},
  ]},
  {q:"ご自身の脚質について手応えは？",opts:[
    {t:"自分の武器を出し切れました",sm:"happy",st:"自分の型を持ってる奴は強い。それを磨き続けろ。"},
    {t:"まだ別の脚質も練習中です",sm:"smug",st:"オールラウンダー狙いか。欲張りだが…嫌いじゃねえ。"},
    {t:"先輩の教え通りに走っただけです",sm:"calm",st:"…おう。だが勝ったのはお前の脚だ。胸を張れ。"},
  ]},
];

// ─── 先輩 ────────────────────────────────────────────────────
const SENPAI_NAME="轟 鉄平";
const SENPAI_MOOD={angry:"😠",smug:"😏",happy:"😁",shock:"😳",calm:"🤨"};
const SENPAI_TRAIN=[
  {m:"angry",t:"フォームが硬えぞ！肩の力を抜け！"},
  {m:"smug",t:"おう、サボってないか見に来たぜ。…ちゃんとやってんな。"},
  {m:"happy",t:"いい汗だ。その一踏みが本番の武器になる。"},
  {m:"calm",t:"メシと睡眠も練習のうちだ。疲労を溜めすぎるなよ。"},
  {m:"angry",t:"声が小せえ！気合入れていけ！！"},
  {m:"calm",t:"バンクは正直だ。やった分しか速くならねえ。"},
  {m:"happy",t:"おっ、今の踏み込みは良かったぞ。体が覚えてきたな。"},
  {m:"smug",t:"汗の量は嘘つかねえ。…まあ、悪くねえ追い込みだ。"},
  {m:"angry",t:"ペダルを撫でるな、踏み潰せ！もっと体重を乗せろ！"},
  {m:"calm",t:"焦んなくていい。強え選手ほど、地味な反復を大事にする。"},
  {m:"happy",t:"その目つきになってきたな。漢の顔だ。"},
  {m:"smug",t:"昔の俺を見てるようだぜ。…まだまだ足りねえけどな。"},
  {m:"angry",t:"休むな、と言いてえとこだが…無理は禁物だ。加減を覚えろ。"},
  {m:"calm",t:"練習は裏切らねえ。今日の一本が、半年後のお前を作る。"},
];
function senpaiFeedback(tele,place){
  const pct=Math.round(tele.runSec>1?tele.draftSec/tele.runSec*100:0);
  if(place===1&&!tele.tired) return {m:"happy",t:"完璧な勝ち方だ！…って調子に乗るなよ？次も同じ走りができて本物だ。"};
  if(place===1) return {m:"smug",t:"勝ちは勝ちだ！だが最後タレてたな。スタミナ配分まで含めて完璧を目指せ。"};
  if(tele.tired&&tele.spurtRem!==null&&tele.spurtRem>520) return {m:"angry",t:"ジャンと同時に全開たぁ猪かお前は！早駆けで押し切りてえならスタミナを鍛え直せ！"};
  if(tele.tired) return {m:"angry",t:"踏みっぱなしじゃ脚が保たねえ！連打を少し休んで脚を溜める『勇気』も覚えろ！"};
  if(pct<35&&place>=4) return {m:"angry",t:`ずっと一人で風を受けてただろ（風よけ率${pct}%）！前の奴のケツにピタッと付く、それが風よけだ！`};
  if(tele.spurtRem!==null&&tele.spurtRem<160&&place>=4) return {m:"shock",t:"仕掛けが遅すぎる！残り300mを過ぎたら勝負を意識しろ！"};
  if(place<=3&&pct>55) return {m:"smug",t:`風よけ率${pct}%、使い方が様になってきたじゃねえか。脚を溜めて最後に出る…競輪の基本だ。`};
  if(place<=3) return {m:"smug",t:"悪くねえ走りだ。だが上にはまだ化け物がいるぞ。"};
  if(place>=7) return {m:"angry",t:"話にならねえ！…まあ、誰でも最初はそんなもんだ。位置取りと風よけ、基本からやり直しだ！"};
  return {m:"calm",t:"中位か。展開を読んで、もう一列前で勝負してみな。"};
}

// ─── 図鑑 ────────────────────────────────────────────────────
const ZUKAN=[
  {id:"keirin",t:"競輪とは",icon:"🚴",body:"9人の選手が自転車でバンク5周・約2000mを走り、着順を競うプロスポーツ。時速70km近い高速戦だが、ただ速いだけでは勝てない。風よけ・ライン・仕掛けのタイミングといった駆け引きが勝敗を分ける「走るボードゲーム」だ。"},
  {id:"pacer",t:"誘導員",icon:"🚲",body:"レース前半、選手たちの先頭を走るペースメーカー。選手は誘導員より前に出てはいけないルール。残り2周ほどで走路の外へ退避し、そこから本当の勝負が始まる。"},
  {id:"jan",t:"ジャン（打鐘）",icon:"🔔",body:"残り1周半の地点で打ち鳴らされる鐘。「仕掛けどころ」を知らせる合図で、ここからレースが一気に動き出す。競輪場ごとに鐘の音色が違うのも名物。"},
  {id:"line",t:"ライン",icon:"🤝",body:"同じ地区の選手が前後一列に組む即席チーム。先頭の自力型が風を受けて引っ張り、後ろの選手は守ってもらいながら脚を溜める。ただし最後の直線では仲間でも容赦なく勝負する、競輪独特の文化。"},
  {id:"bante",t:"番手",icon:"✌️",body:"ラインの先頭のすぐ後ろの位置。風よけの恩恵を最大限に受けられる特等席で、脚を溜めて最後に差し切るチャンスが最も大きい。番手を巡る駆け引きは競輪の華。"},
  {id:"kyakushitsu",t:"脚質",icon:"💪",body:"選手の戦い方のタイプ。先頭を駆ける「逃げ」、中団から一気に行く「捲り」、最後の直線で抜く「差し」が代表的。"},
  {id:"draft",t:"風よけ",icon:"🌬",body:"前の選手の真後ろにつくと空気抵抗が大きく減り、スタミナ消費を3〜5割も節約できる現象。時速60〜70kmで走る競輪ではこれがすべてといっても過言ではない。"},
  {id:"kyuhan",t:"級班制度",icon:"🏅",body:"選手はデビュー後A級3班からスタートし、成績によってA級2班→A級1班→S級2班→S級1班と昇格していく。頂点はわずか9名だけの「S級S班」。"},
  {id:"pts",t:"競走得点",icon:"📈",body:"レースの着順に応じてもらえる得点。グレードの高いレースほど高得点。この平均点が昇格・降格や、ビッグレースへの出場資格を決める「選手の通信簿」だ。"},
  {id:"car",t:"車番と色",icon:"🎨",body:"1白・2黒・3赤・4青・5黄・6緑・7橙・8桃・9紫。全国どの競輪場でも共通のユニフォーム色で、観客はこの色を頼りに高速の展開を追いかける。"},
  {id:"bank",t:"バンク",icon:"🏟",body:"競輪場のすり鉢状に傾いた専用走路。1周333m・400m・500mなどの種類があり、カーブの傾斜（カント）は最大30度以上。"},
  {id:"gp",t:"グランプリ",icon:"👑",body:"毎年末に行われる賞金王決定戦「KEIRINグランプリ」。その年の選ばれし9人だけが出場できる一発勝負。優勝賞金は1億円を超える。"},
];

// ─── チュートリアル ──────────────────────────────────────────
const TUT_STEPS={
  start:{t:"競輪レース、スタート！",body:"9人でバンク5周・約2000m。号砲で一斉にスタートしたら、まずは誘導員のペースで周回。同じ地区の仲間と「ライン」を組んで隊列を作ります。",unlock:["keirin","pacer"]},
  position:{t:"風よけが超重要！",body:"前の選手の真後ろにつくと空気抵抗が減り、スタミナ消費を大きく節約できます（風よけ）。▲▼ボタンで隊列の位置を調整してみよう。",unlock:["draft","bante"]},
  pacerOut:{t:"誘導員 退避！",body:"残り2周で誘導員がコースを外れました。ここからペースが一気に上がります。各ラインの先頭が仕掛けどころを探る、緊張の時間です。",unlock:[]},
  jan:{t:"ジャン！（打鐘）",body:"残り1周半を知らせる鐘＝ジャンが鳴りました！「逃げ」の選手はここから仕掛けます。スパートボタンも解禁。押すタイミングが勝負の分かれ目！",unlock:["jan"]},
  spurt:{t:"スパート！！",body:"ここからは連打でペダルを踏み込め！選手があなたの連打に合わせてもがきます。ただしスタミナ切れ（タレ）に注意！",unlock:[]},
};

// ─── 名前・地区 ─────────────────────────────────────────────
const SURNAMES=["佐藤","鈴木","高橋","田中","伊藤","渡辺","山本","中村","小林","加藤","吉田","山田","松本","井上","木村","清水","山口","森田","池田","橋本","阿部","石川","山崎","中島","前田","藤田","後藤","岡田","長谷川","村上","近藤","坂本","遠藤","青木","西村","福田","太田","三浦","岡本","松田"];
const GIVENS=["翔太","健太","大輔","拓也","直樹","亮","誠","剛","学","浩二","雅人","俊介","竜也","光","海斗","蓮","大地","勇人","慎吾","哲也","一馬","隼人","和真","昇","武","啓太","良平","達也","純","克己"];
const REGIONS=["北日本","関東","南関東","中部","近畿","中国","四国","九州"];
const REGION_COLORS={"北日本":"#62b6ff","関東":"#ff8a65","南関東":"#ffd54f","中部":"#81c784","近畿":"#ba93f5","中国":"#4dd0e1","四国":"#f48fb1","九州":"#ff7043"};

// ─── 上がりタイム（ラスト200m）の算出 ──────────────────────────
function computeAgari(tele,stats){
  const draftPct=tele.runSec>1?clamp(tele.draftSec/tele.runSec,0,1):0;
  const mash=tele.mashTicks>0?clamp(tele.mashSum/tele.mashTicks,0,1):0.4;
  const ideal=300;
  const timing=tele.spurtRem!=null?clamp(1-Math.abs(tele.spurtRem-ideal)/300,0,1):0.4;
  const statContrib=(stats.spd-200)/480*1.15+(stats.pow-200)/480*0.75+(stats.sta-200)/480*0.55+(stats.tec-200)/480*0.35;
  const playContrib=draftPct*0.5+timing*0.6+mash*0.8;
  let agari=8.9-statContrib-playContrib;
  if(tele.tired)agari+=0.7;
  return{time:Math.round(agari*100)/100,draftPct,mash,timing};
}
function rankInList(entries,best){if(best==null)return null;let r=1;for(const e of entries)if(e.time<best)r++;return r;}
function versusAgari(timingScore,mashScore){return Math.round((8.6-timingScore*1.0-mashScore*1.1)*100)/100;}
function buildBoard(entries,myUid,myCareer){
  const map={};
  for(const e of entries){if(e.key&&e.key.indexOf(myUid)>=0)continue;map[e.key||e.name+e.time]=e;}
  const list=Object.values(map).map(e=>({name:e.name,region:e.region,time:e.time,rank:e.rank,isP:false}));
  if(myCareer&&myCareer.bestAgari!=null)list.push({name:myCareer.name,region:myCareer.region,time:myCareer.bestAgari,rank:myCareer.rank,isP:true});
  list.sort((a,b)=>a.time-b.time);
  return list;
}

const INTRO_SLIDES=[
  {icon:"🚴",t:"競輪ってなんだ？",b:"9人の選手が自転車でバンク（専用走路）を5周・約2000m走り、着順を競うプロスポーツ。時速70km近い世界だ。"},
  {icon:"🤝",t:"ただ速いだけじゃ勝てない",b:"前の選手の真後ろは空気抵抗が減る「風よけ」ポジション。仲間で「ライン」を組み、前が風を受け、後ろが脚を溜める駆け引きが勝負を分ける。"},
  {icon:"🔔",t:"仕掛けどころ",b:"残り1周半で鳴る鐘＝「ジャン」からレースが一気に動く。どこで踏み出すか、タイミングがすべてだ。"},
  {icon:"🔥",t:"目指すは頂点・SS班",b:"A級3班からスタートし、勝って得点を稼げば昇格。たった9人の「S級S班」、そしてグランプリの頂へ。さあ、漢の中の漢道を駆け上がれ！"},
];

// ─── ユーティリティ ──────────────────────────────────────────
const rnd=(a,b)=>a+Math.random()*(b-a);
const irnd=(a,b)=>Math.floor(rnd(a,b+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
function shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function conditionInfo(f){
  if(f<=25) return{label:"絶好調",mult:1.05,color:"#ffd34d",icon:"🔥"};
  if(f<=45) return{label:"好調",mult:1.02,color:"#7ee08a",icon:"😊"};
  if(f<=70) return{label:"普通",mult:1.0,color:"#9fb0d0",icon:"😐"};
  if(f<=85) return{label:"不調",mult:0.96,color:"#f0a05a",icon:"😟"};
  return{label:"絶不調",mult:0.91,color:"#f06a6a",icon:"🥵"};
}
function starsOf(stats){return clamp(Math.round((stats.pow+stats.spd+stats.sta+stats.tec-60)/380),1,5);}

// ─── セーブ ──────────────────────────────────────────────────
const SAVE_KEY="keirin-ss-v3";
async function saveGame(c){try{if(window.storage)await window.storage.set(SAVE_KEY,JSON.stringify(c));}catch(e){}}
async function loadGame(){try{if(window.storage){const r=await window.storage.get(SAVE_KEY);if(r?.value)return JSON.parse(r.value);}}catch(e){}return null;}
async function deleteSave(){try{if(window.storage)await window.storage.delete(SAVE_KEY);}catch(e){}}

// ═══════════════════════════════════════════════════════════════
// ─── リアルモード（P1）：実制度に沿った級班・期・競走得点 ─────────
// アーケードモードとは完全に別セーブ・別進行。架空の必殺スキル等は
// 一切使わない（careerSkillはmode==="real"でnullを返す）。
// ═══════════════════════════════════════════════════════════════

// P1では「期＝24週」の簡易カレンダーで実装する（1年=前期24週+後期24週）。
// 本物の競輪の「前期(1-6月)/後期(7-12月)」区分と対応させ、週→月表示に変換する。
const REAL_GRADE_LABEL={F2:"F2競走",F1:"F1競走",G3:"G3競走(記念)",G2:"G2競走",G1:"G1競走",GP:"KEIRINグランプリ"};

// 級班ごとに出場しうるグレード（レース開始時にここから抽選する）
const RANK_GRADES={A3:["F2"],A2:["F2","F1"],A1:["F1","G3"],S2:["G3","G2"],S1:["G2","G1"],SS:["G1","GP"]};

// グレード別・着順別の競走得点（実制度の相対序列を簡易再現：GP>G1>G2>G3>F1>F2）
const RACE_POINTS={
  F2:[65,60,55,50,45,40,35,30,25],
  F1:[80,74,68,62,56,50,44,38,32],
  G3:[95,88,81,74,67,60,53,46,39],
  G2:[104,96,88,80,72,64,56,48,40],
  G1:[112,103,94,85,76,67,58,49,40],
  GP:[125,115,105,95,85,75,65,55,45],
};
const RACE_MONEY={F2:[8,5,3,2,1,1,0,0,0],F1:[20,12,8,5,3,2,1,0,0],G3:[60,35,22,14,8,5,3,0,0],
  G2:[150,80,50,30,18,10,5,0,0],G1:[400,220,140,90,55,30,15,0,0],GP:[10000,4000,2000,1000,500,300,150,0,0]};

// 期末審査の基準点（直近走行の平均競走得点がこれ以上/未満で昇班・降班）
// A3は最下級なので降班なし、SSは最上級なので昇班なし（簡易モデル）
const TERM_REVIEW_THRESH={
  A3:{up:50, down:null},
  A2:{up:65, down:38},
  A1:{up:80, down:50},
  S2:{up:95, down:63},
  S1:{up:108,down:76},
  SS:{up:null,down:92},
};

function realCalendarInit(){return{year:2026,term:1,week:1};} // term 1=前期(1-6月) 2=後期(7-12月)
// カレンダーを1週進める。週24を超えたら期が切り替わり、後期→前期の折り返しで年が進む
function advanceRealWeek(cal){
  let{year,term,week}=cal;week++;
  if(week>24){week=1;if(term===1)term=2;else{term=1;year++;}}
  return{year,term,week};
}
// 表示用の月ラベル（週番号から概算の月を割り出す。4週=1ヶ月換算）
function realCalendarLabel(cal){
  const monthsInTerm=cal.term===1?[1,2,3,4,5,6]:[7,8,9,10,11,12];
  const idx=clamp(Math.floor((cal.week-1)/4),0,5);
  return cal.year+"年"+monthsInTerm[idx]+"月（"+(cal.term===1?"前期":"後期")+" 第"+cal.week+"週）";
}

// 直近12走の平均競走得点を算出（実制度の「平均競走得点」の簡易再現）
function computeAvgPts(ptsHistory){
  const hist=(ptsHistory||[]).slice(-12);
  if(!hist.length)return 0;
  return Math.round((hist.reduce((s,h)=>s+h.pts,0)/hist.length)*10)/10;
}
// レース結果を記録し、平均競走得点を更新した新しいcareerを返す（非破壊）
// mul: 敗者戦(順位決定戦)で確定した順位は本線より価値が低いため得点・賞金を減額する倍率
// raceStats: そのレースでのB/H/S（省略時は集計をスキップ＝後方互換）
function recordRealRaceResult(career,grade,place,mul,raceStats){
  if(mul==null)mul=1;
  const pts=Math.round((RACE_POINTS[grade]||RACE_POINTS.F2)[clamp(place-1,0,8)]*mul);
  const money=Math.round((RACE_MONEY[grade]||RACE_MONEY.F2)[clamp(place-1,0,8)]*mul);
  const entry={year:career.calendar.year,term:career.calendar.term,week:career.calendar.week,grade,place,pts};
  const ptsHistory=[...(career.ptsHistory||[]),entry].slice(-48); // 直近48走分を保持
  const b0=career.bhs||{b:0,h:0,s:0};
  const bhs={b:b0.b+(raceStats?.b||0),h:b0.h+(raceStats?.h||0),s:b0.s+(raceStats?.s||0)};
  const k0=career.kimarite||{nige:0,makuri:0,sashi:0,mark:0};
  const kkey=classifyKimarite(raceStats,place);
  const kimarite=kkey?{...k0,[kkey]:(k0[kkey]||0)+1}:k0;
  return{...career,ptsHistory,avgPts:computeAvgPts(ptsHistory),money:(career.money||0)+money,bhs,kimarite,
    rec:{races:(career.rec.races||0)+1,wins:(career.rec.wins||0)+(place===1?1:0),podium:(career.rec.podium||0)+(place<=3?1:0)}};
}
// 決まり手判定（P3）：記録されたB/H/Sから逃げ/捲り/差し/マークを簡易判定する。
// 実際の審判判定の完全再現ではなく、チェックポイント通過データに基づく簡易モデル。
//   逃げ：最終ホーム線(残り1周)を先頭で通過→そのまま押し切り
//   捲り：ホーム線では先頭でなかったが、バック線(残り半周)で先頭を奪って1着
//   差し：どちらの線でも先頭に立たず直線で交わして1着
//   マーク：差しきれず2着（決まり手の記録対象は1・2着のみ＝実制度準拠）
function classifyKimarite(raceStats,place){
  if(place>2||!raceStats)return null;
  if(raceStats.h>0)return"nige";
  if(raceStats.b>0&&place===1)return"makuri";
  if(place===1)return"sashi";
  return"mark";
}

// 期末審査：直近の平均競走得点で昇班/降班/現状維持を判定する
function termReview(career){
  const rank=career.rank;const th=TERM_REVIEW_THRESH[rank]||{up:null,down:null};
  const avg=career.avgPts||0;
  let result="stay";
  if(th.up!=null&&avg>=th.up&&rank!=="SS")result="up";
  else if(th.down!=null&&avg<th.down&&rank!=="A3")result="down";
  const idx=RANKS.indexOf(rank);
  const newRank=result==="up"?RANKS[Math.min(RANKS.length-1,idx+1)]:result==="down"?RANKS[Math.max(0,idx-1)]:rank;
  return{result,prevRank:rank,newRank,avgAtReview:avg};
}

// ═══════════════════════════════════════════════════════════════
// ─── リアルモード（P5）：代謝（登録消除）────────────────────────
// A級3班のまま基準得点未満が2期連続すると「登録消除勧告」＝引退となる。
// 1期目は警告のみ（lowStreak=1）、2期連続で引退（lowStreak>=2）。
// A3級以外に昇班した時点でlowStreakは0にリセットされる（review側で処理）。
// ═══════════════════════════════════════════════════════════════
const A3_RETIRE_THRESH=25; // A3級でこれ未満が2期連続すると登録消除
function checkRetirement(career,review){
  if(review.newRank!=="A3")return{lowStreak:0,warned:false,retiring:false};
  const below=review.avgAtReview<A3_RETIRE_THRESH;
  const lowStreak=below?(career.lowStreak||0)+1:0;
  return{lowStreak,warned:lowStreak===1,retiring:lowStreak>=2};
}

// ═══════════════════════════════════════════════════════════════
// ─── リアルモード（P2）：開催シリーズ（勝ち上がり）＋斡旋 ────────
// 単発レースを廃し、実際の「開催」＝複数ラウンドの勝ち上がりに置換する。
// グレードが高いほどラウンド数が多い（F2/F1/G3=予選→決勝の2日制、
// G1/G2=予選→準決勝→決勝の3日制、GP=一発の決勝のみ）。
// ═══════════════════════════════════════════════════════════════

// 実際のG1年間開催（6大会）を月に固定配置。該当月にS1/SS到達していれば
// その大会名で開催が斡旋される（実制度のグレードカレンダーを簡易再現）。
const G1_CALENDAR=[
  {month:2, name:"全日本選抜競輪"},
  {month:3, name:"日本選手権競輪（ダービー）"},
  {month:5, name:"高松宮記念杯競輪"},
  {month:7, name:"オールスター競輪"},
  {month:9, name:"寛仁親王牌・世界選手権記念競輪"},
  {month:11,name:"競輪祭"},
];
const GP_MONTH=12; // KEIRINグランプリは年末・一発勝負

// グレードごとの勝ち上がりラウンド構成（実際の開催日数を簡易再現）
const GRADE_ROUNDS={GP:["final"],G1:["qualify","semifinal","final"],G2:["qualify","semifinal","final"],
  G3:["qualify","final"],F1:["qualify","final"],F2:["qualify","final"]};
const ROUND_LABEL={qualify:"予選",semifinal:"準決勝",final:"決勝"};

// 現在のカレンダーから「今月」を割り出す（P1の週→月換算をそのまま流用）
function realCurrentMonth(cal){
  const monthsInTerm=cal.term===1?[1,2,3,4,5,6]:[7,8,9,10,11,12];
  return monthsInTerm[clamp(Math.floor((cal.week-1)/4),0,5)];
}

// 斡旋：今月・現在の級班から出場できる開催を1つ提示する（純関数・非破壊）。
// G1カレンダーに一致する月でS1/SS級なら実開催名を、GP月でSS級ならグランプリを、
// それ以外はP1のRANK_GRADESプールから抽選する。
function offerEvent(career){
  const month=realCurrentMonth(career.calendar);
  const grades=RANK_GRADES[career.rank]||["F2"];
  const g1=G1_CALENDAR.find(g=>g.month===month);
  if(g1&&grades.includes("G1"))return{grade:"G1",gradeName:g1.name,rounds:[...GRADE_ROUNDS.G1]};
  if(month===GP_MONTH&&grades.includes("GP"))return{grade:"GP",gradeName:REAL_GRADE_LABEL.GP,rounds:[...GRADE_ROUNDS.GP]};
  const pool=grades.filter(g=>g!=="G1"&&g!=="GP");
  const grade=pick(pool.length?pool:["F2"]);
  return{grade,gradeName:REAL_GRADE_LABEL[grade],rounds:[...GRADE_ROUNDS[grade]]};
}
// 斡旋を受諾 → 開催イベントを開始する
function startEventFromOffer(offer){
  return{grade:offer.grade,gradeName:offer.gradeName,rounds:offer.rounds,roundIdx:0,consolation:false,done:false};
}
// 1ラウンドの着順を受け取り、開催イベントの次状態を返す（純関数）。
//   最終ラウンド（GPの決勝のみ、またはF2/G1等の決勝）：着順がそのまま最終順位として確定
//   最終ラウンド以外で1〜3着：勝ち上がり／4〜9着：本線敗退→敗者戦(順位決定戦)へ
//   敗者戦の着順は、その回でそのまま最終順位として確定
function nextEventStep(event,place){
  if(event.consolation)return{...event,done:true,finalPlace:place};
  const isLastRound=event.roundIdx>=event.rounds.length-1;
  if(isLastRound)return{...event,done:true,finalPlace:place,consolation:false};
  if(place<=3)return{...event,roundIdx:event.roundIdx+1};
  return{...event,consolation:true}; // 本線敗退（次のレースがそのラウンドになる）
}
// 開催イベントの最終順位が確定したときの得点・賞金（敗者戦は本線の半分に減額）
function eventFinalReward(grade,finalPlace,consolation){
  const mul=consolation?0.5:1;
  return{
    pts:Math.round((RACE_POINTS[grade]||RACE_POINTS.F2)[clamp(finalPlace-1,0,8)]*mul),
    money:Math.round((RACE_MONEY[grade]||RACE_MONEY.F2)[clamp(finalPlace-1,0,8)]*mul),
    mul,
  };
}

// 斡旋への応諾・欠場（非破壊）。欠場が3回連続すると斡旋停止（強制出場）になる。
function acceptEvent(career){return{...career,skipStreak:0,suspended:false};}
function declineEvent(career){
  const skipStreak=(career.skipStreak||0)+1;
  return{...career,skipStreak,suspended:skipStreak>=3};
}
// 現在イベントも保留中の斡旋も無ければ、新しい斡旋を生成して持たせる
function ensureOffer(career){
  if(!career||career.currentEvent||career.pendingOffer)return career;
  return{...career,pendingOffer:offerEvent(career)};
}

// ═══════════════════════════════════════════════════════════════
// ─── リアルモード（P6）：ギア倍数・車券（疑似）・ガールズケイリン枠 ─
// ═══════════════════════════════════════════════════════════════

// ギア倍数（実制度の3.57〜3.92相当）。大ギア＝最高速↑加速↓、小ギア＝逆のトレードオフ
const GEAR_OPTIONS=[
  {id:"g357",label:"3.57（軽め）",desc:"加速に優れるが伸びはやや控えめ。先行・捲りで踏み出しを重視するなら",accMul:1.06,vMul:0.965},
  {id:"g370",label:"3.70（標準）",desc:"バランス型。迷ったらこれ",accMul:1.0,vMul:1.0},
  {id:"g382",label:"3.82（やや重め）",desc:"最高速がやや伸びる。差し・マークで直線勝負を狙うなら",accMul:0.96,vMul:1.02},
  {id:"g392",label:"3.92（重め）",desc:"最高速に全振り。立ち上がりは遅いが伸びが鋭い",accMul:0.92,vMul:1.035},
];
function gearById(id){return GEAR_OPTIONS.find(g=>g.id===id)||GEAR_OPTIONS[1];}

// ─── 車券（疑似・仮想コインのみ）───────────────────────────────
// 実通貨・換金は一切扱わない。money(賞金)とは完全に別勘定のcoinsで完結する。
const BET_TYPES=[
  {id:"nisyatan", label:"2車単",  picks:2, ordered:true,  desc:"1・2着を車番の順序どおりに的中"},
  {id:"nisyafuku",label:"2車複",  picks:2, ordered:false, desc:"1・2着に入る2台を順不同で的中"},
  {id:"wide",     label:"ワイド", picks:2, ordered:false, desc:"3着以内に入る2台の組合せを的中"},
  {id:"nikutan",  label:"2枠単",  picks:2, ordered:true,  waku:true, desc:"1・2着の枠番を順序どおりに的中"},
  {id:"nikufuku", label:"2枠複",  picks:2, ordered:false, waku:true, desc:"1・2着に入る2枠を順不同で的中"},
  {id:"sanrentan", label:"3連単", picks:3, ordered:true,  desc:"1・2・3着を車番の順序どおりに的中"},
  {id:"sanrenpuku",label:"3連複", picks:3, ordered:false, desc:"1・2・3着に入る3台を順不同で的中"},
];
function betTypeById(id){return BET_TYPES.find(b=>b.id===id)||null;}

// 選手の強さスコア（ステータス平均＋競走得点の簡易加重）→ 勝率推定に使う
function riderStrength(r){
  const st=r.stats||{pow:0,spd:0,sta:0,tec:0};
  return(st.pow+st.spd+st.sta+st.tec)/4+((r.points||0)*0.08)+1;
}
// 出走9人（または指定人数）の1着確率を推定（強さの2乗に比例＝差がつきやすいよう強調）
function winProbabilities(riders){
  const sq=riders.map(r=>Math.pow(riderStrength(r),2));
  const total=sq.reduce((a,b)=>a+b,0)||1;
  return riders.map((r,i)=>({car:r.car,frame:r.car,p:sq[i]/total}));
}
// Harville法（競馬・競輪で広く使われる順序付き確率の簡易推定）で
// 「p1が1着→p2が2着→p3が3着」の同時確率を推定する
function harvilleSeq(ps){ // ps: [p1,p2,p3,...] 各選手の単勝確率（合計1）
  let remain=1,prob=1;
  for(const p of ps){prob*=p/remain;remain-=p;if(remain<=0)break;}
  return Math.max(prob,0);
}
// 賭式・選択車番から的中確率を推定し、オッズ（控除率25%を反映した簡易オッズ）を返す
function estimateOdds(riders,betId,picks){
  const bt=betTypeById(betId);if(!bt)return null;
  const wp=winProbabilities(riders);const pOf=car=>{const f=wp.find(x=>x.car===car);return f?f.p:0.001;};
  // 枠番賭け（2枠単・2枠複）は、その枠に属する車番の勝率を合算して「枠の勝率」とする
  const pOfKey=bt.waku?(waku=>riders.filter(r=>wakuOf(r.car)===waku).reduce((s,r)=>s+pOf(r.car),0)):pOf;
  let prob=0;
  if(bt.picks===2&&bt.ordered){ // 2車単・2枠単：順序どおり2者
    prob=harvilleSeq([pOfKey(picks[0]),pOfKey(picks[1])]);
  }else if(bt.picks===2&&!bt.ordered&&bt.id!=="wide"){ // 2車複・2枠複：順不同2者
    prob=harvilleSeq([pOfKey(picks[0]),pOfKey(picks[1])])+harvilleSeq([pOfKey(picks[1]),pOfKey(picks[0])]);
  }else if(bt.id==="wide"){ // ワイド：3着以内に2者とも入る（近似：上位3通りの並びを合算）
    const others=riders.map(r=>r.car).filter(c=>c!==picks[0]&&c!==picks[1]);
    let sum=0;
    // 2者の着順(1-2,1-3,2-3の位置関係)×残り1枠を他の誰が埋めるかで概算
    const combos=[[picks[0],picks[1]],[picks[1],picks[0]]];
    for(const[a,b] of combos){
      sum+=harvilleSeq([pOf(a),pOf(b)]); // 1-2着両取り
      for(const o of others){sum+=harvilleSeq([pOf(a),pOf(o),pOf(b)]);sum+=harvilleSeq([pOf(o),pOf(a),pOf(b)]);}
    }
    prob=Math.min(sum,0.92);
  }else if(bt.picks===3&&bt.ordered){ // 3連単
    prob=harvilleSeq([pOf(picks[0]),pOf(picks[1]),pOf(picks[2])]);
  }else if(bt.picks===3&&!bt.ordered){ // 3連複：3者の順列6通りを合算
    const[a,b,c]=picks;const perms=[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
    prob=perms.reduce((s,p)=>s+harvilleSeq([pOf(p[0]),pOf(p[1]),pOf(p[2])]),0);
  }
  prob=clamp(prob,0.0008,0.95);
  const fairOdds=1/prob;
  const odds=Math.max(1.1,Math.round(fairOdds*0.75*10)/10); // 控除率25%を反映した簡易オッズ
  return{prob,odds};
}
// 枠番＝車番を2台1組にまとめた慣例（実制度の枠番割り当てを簡易再現：1-2,3-4,5-6,7-8,9単独）
function wakuOf(car){return Math.ceil(car/2);}

// 車券の的中判定（決着後の着順resultsから）。
// bet.picksは「選択肢と同じ空間」の値（通常賭けは車番、枠番賭けは枠番そのもの）。
// 着順の車番だけを枠番へ変換して照合する（picksを二重変換しないよう注意）。
function judgeBet(bet,results){
  const bt=betTypeById(bet.betId);if(!bt)return false;
  const byPlace=n=>{const r=results.find(x=>x.place===n);return r?r.car:null;};
  const top=[byPlace(1),byPlace(2),byPlace(3)];
  const toKey=car=>bt.waku?wakuOf(car):car;
  const picks=bet.picks;
  if(bt.id==="wide"){
    const top3=top.slice(0,3).map(toKey);
    return picks.every(p=>top3.includes(p));
  }
  const relevant=top.slice(0,bt.picks).map(toKey);
  if(bt.ordered)return picks.every((p,i)=>p===relevant[i]);
  return picks.slice().sort().join(",")===relevant.slice().sort().join(",");
}

// ─── ガールズケイリン拡張枠（データ構造のみ・本フェーズでは未接続）─────
// 実制度準拠：L級1班・7車立て・ライン結成なしの個人戦・カーボン製自転車。
// 将来フェーズで別のレース形式として本格実装する際の土台として先に定義しておく。
const GIRLS_KEIRIN_SCAFFOLD={rank:"L1",label:"L級1班",fieldSize:7,lineRule:"none",bikeMaterial:"carbon"};

// ─── 観戦モード（P6）───────────────────────────────────────────
// 自分が走らない開催を観戦し、車券の疑似体験ができる。フルの物理シミュレーションは
// 使わず、選手の強さ（ステータス平均＋競走得点）に確率的なブレを加えた抽選で
// 着順を決定する軽量な実装（観戦専用。実際のレース画面とは独立）。
function generateWatchField(grade){
  const band=RANK_BAND[({F2:"A3",F1:"A1",G3:"S2",G2:"S1",G1:"S1",GP:"SS"})[grade]||"A1"]||[150,260];
  const usedNames=new Set();
  const cars=shuffle([1,2,3,4,5,6,7,8,9]);
  const regions=shuffle(REGIONS);
  return cars.map((car,i)=>{
    const r=mkAIRider(car,regions[i%regions.length],pick(["nige","sashi","makuri"]),band,usedNames);
    r.points=irnd(30,120); // 表示用の簡易競走得点（オッズ計算にのみ使用）
    return r;
  });
}
// 強さ＋ランダムなブレで着順を抽選する（番狂わせも起こる軽量シミュレーション）
function drawWatchRaceResult(riders){
  const pool=riders.map(r=>({car:r.car,w:Math.pow(riderStrength(r),2)*(0.6+Math.random()*1.2)}));
  return pool.slice().sort((a,b)=>b.w-a.w).map((p,i)=>({car:p.car,place:i+1}));
}
// 車券の購入・清算（非破壊。coinsを増減した新しいcareerを返す）
function placeBet(career,bet){
  if(!career||(career.coins||0)<bet.amount)return career;
  return{...career,coins:career.coins-bet.amount};
}
function settleBet(career,bet,results){
  const hit=judgeBet(bet,results);
  const payout=hit?Math.round(bet.amount*bet.odds):0;
  return{career:hit?{...career,coins:(career.coins||0)+payout}:career,hit,payout};
}

const REAL_SAVE_KEY="keirin-ss-real-v1";
async function saveRealGame(c){try{if(window.storage)await window.storage.set(REAL_SAVE_KEY,JSON.stringify(c));}catch(e){}}
async function loadRealGame(){try{if(window.storage){const r=await window.storage.get(REAL_SAVE_KEY);if(r?.value)return migrateRealCareer(JSON.parse(r.value));}}catch(e){}return null;}
async function deleteRealSave(){try{if(window.storage)await window.storage.delete(REAL_SAVE_KEY);}catch(e){}}

// リアルモードの新規キャリア作成。equipped/owned/skillsは空で持たせ、
// アーケード共通関数(effStats/careerPerks/careerSkill等)と型互換を保つ。
function newRealCareer(name,style,region,charId){
  const uid="r"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
  return{v:5,mode:"real",uid,name,charId:charId||null,style:style||"nige",region,
    rank:"A3",bestRank:"A3",calendar:realCalendarInit(),ptsHistory:[],avgPts:0,
    stats:{pow:10,spd:10,sta:10,tec:10},fatigue:0,trainLeft:3,
    money:0,owned:[],equipped:{},skills:[],useSkill:null,
    currentEvent:null,pendingOffer:null,skipStreak:0,suspended:false,
    bhs:{b:0,h:0,s:0},kimarite:{nige:0,makuri:0,sashi:0,mark:0}, // P3：決まり手・B/H/S集計
    violationPts:0,injuredWeeks:0,                               // P3：違反点・負傷による欠場残週数
    lowStreak:0,retired:false,                                   // P5：代謝（登録消除）
    gearId:"g370",coins:1000,                                    // P6：ギア倍数・車券用の仮想コイン(賞金とは別勘定)
    rec:{races:0,wins:0,podium:0},reviews:[]};
}
function migrateRealCareer(c){
  if(!c)return c;
  if(c.v>=5)return c;
  if(c.v===4){
    // v4→v5: ギア倍数・車券用仮想コイン(P6)の追加
    return{...c,gearId:c.gearId||"g370",coins:c.coins!=null?c.coins:1000,v:5};
  }
  if(c.v===3){
    // v3→v5: 代謝・ギア・コインを一括補完
    return{...c,bestRank:c.bestRank||c.rank,lowStreak:c.lowStreak||0,retired:c.retired||false,
      gearId:"g370",coins:1000,v:5};
  }
  if(c.v===2){
    // v2→v5: 決まり手/B・H・S集計・違反点・負傷・代謝・ギア・コインを一括補完
    return{...c,bhs:c.bhs||{b:0,h:0,s:0},kimarite:c.kimarite||{nige:0,makuri:0,sashi:0,mark:0},
      violationPts:c.violationPts||0,injuredWeeks:c.injuredWeeks||0,
      bestRank:c.rank,lowStreak:0,retired:false,gearId:"g370",coins:1000,v:5};
  }
  // v1→v5: 全て一括補完
  return{...c,currentEvent:null,pendingOffer:null,skipStreak:c.skipStreak||0,suspended:c.suspended||false,
    bhs:{b:0,h:0,s:0},kimarite:{nige:0,makuri:0,sashi:0,mark:0},violationPts:0,injuredWeeks:0,
    bestRank:c.rank,lowStreak:0,retired:false,gearId:"g370",coins:1000,v:5};
}

function newMaxRealCareer(){
  const c=newRealCareer("リアル検証","nige","南関東","honoo");
  c.rank="S1";c.bestRank="S1";c.stats={pow:400,spd:400,sta:400,tec:400};c.avgPts=100;
  c.ptsHistory=Array.from({length:12},(_,i)=>({year:2026,term:1,week:i+1,grade:"G1",place:1,pts:112}));
  return c;
}


// ─── 全国ランキング ──────────────────────────────────────────
const LB_PREFIX="lbrank:";
function uidOf(c){return c&&c.uid?c.uid:"anon";}
async function submitRanking(c){
  try{
    if(!window.storage||c.bestAgari==null)return;
    await window.storage.set(LB_PREFIX+uidOf(c),JSON.stringify({name:c.name,region:c.region,time:c.bestAgari,rank:c.rank,at:Date.now()}),true);
  }catch(e){}
}
async function loadRanking(){
  const out=[];
  try{
    if(!window.storage)return out;
    const r=await window.storage.list(LB_PREFIX,true);
    const keys=r&&r.keys?r.keys:[];
    for(const k of keys){
      try{const v=await window.storage.get(k,true);if(v&&v.value){const e=JSON.parse(v.value);if(e&&typeof e.time==="number")out.push({...e,key:k});}}catch(e){}
    }
  }catch(e){}
  return out;
}

// ─── オンライン対戦プール ────────────────────────────────────
const VS_PREFIX="vspool:";
async function submitVsRun(c,time){
  try{
    if(!window.storage)return;
    await window.storage.set(VS_PREFIX+uidOf(c),JSON.stringify({sv:2,name:c.name,region:c.region,rank:c.rank,style:c.style,stats:effStats(c),time,at:Date.now()}),true);
  }catch(e){}
}
// ─── シーズン制 ──────────────────────────────────────────────
// VSランキングは3ヶ月＝四半期ごとの「シーズン」で開催。キーにシーズンIDを含める
// ことで新シーズンのランキングは自動的にまっさら（＝リセット）になる。
const SEASON_NAMES=["G1 初日の出杯","G1 皐月杯","G1 灼熱杯","G1 師走杯"]; // Q1〜Q4
function seasonInfo(now){
  const d=now?new Date(now):new Date();
  const q=Math.floor(d.getMonth()/3);              // 0..3
  const id=d.getFullYear()+"Q"+(q+1);              // 例: 2026Q3
  const end=new Date(d.getFullYear(),q*3+3,1);     // 次シーズン開始日
  const daysLeft=Math.max(0,Math.ceil((end-d)/86400000));
  return{id,q,name:SEASON_NAMES[q],year:d.getFullYear(),daysLeft};
}
// シーズン報酬（限定フレーム）：最終順位に応じて配布
const FRAME_DEFS={champ:{label:"優勝フレーム",icon:"👑"},top3:{label:"表彰台フレーム",icon:"🏆"},top10:{label:"強豪フレーム",icon:"🎖"},finisher:{label:"参戦フレーム",icon:"🎗"}};
function seasonRewardSuffix(rank){return rank===1?"champ":rank<=3?"top3":rank<=10?"top10":"finisher";}
function frameParts(fid){const i=fid.lastIndexOf("_");return{season:fid.slice(0,i),suf:fid.slice(i+1)};}
function frameIcon(fid){const d=FRAME_DEFS[frameParts(fid).suf];return d?d.icon:"🖼";}
function frameLabel(fid){const p=frameParts(fid);const d=FRAME_DEFS[p.suf];return d?(p.season+" "+d.label):fid;}

const VSRANK_PREFIX="vsrank:";
async function submitVsRank(c){
  try{
    if(!window.storage)return;
    const sid=seasonInfo().id;
    await window.storage.set(VSRANK_PREFIX+sid+":"+uidOf(c),JSON.stringify({name:c.name,region:c.region,rank:c.rank,pts:c.vsPts||0,at:Date.now()}),true);
  }catch(e){}
}
async function loadVsRank(seasonId){
  const out=[];
  const prefix=VSRANK_PREFIX+(seasonId||seasonInfo().id)+":";
  try{
    if(!window.storage)return out;
    const r=await window.storage.list(prefix,true);
    const keys=r&&r.keys?r.keys:[];
    for(const k of keys){
      try{const g=await window.storage.get(k,true);if(g&&g.value){const e=JSON.parse(g.value);e.uid=k.slice(prefix.length);out.push(e);}}catch(e){}
    }
  }catch(e){}
  out.sort((a,b)=>(b.pts||0)-(a.pts||0));
  return out;
}

// ─── 合言葉マッチ（友達対戦）─────────────────────────────────
// vspoolと同じ記録形式を「vsroom:合言葉:uid」に登録。同じ合言葉を入れた
// プレイヤー同士が集まり、9車立ての直接対決ができる（招待＝DL導線）。
const ROOM_PREFIX="vsroom:";
function sanitizeRoomCode(code){return (code||"").replace(/[\s'"\\\/]/g,"").slice(0,16);}
async function joinRoom(c,code){
  try{
    if(!window.storage||!code)return;
    await window.storage.set(ROOM_PREFIX+code+":"+uidOf(c),JSON.stringify({sv:2,name:c.name,region:c.region,rank:c.rank,style:careerStyle(c),stats:effStats(c),time:c.bestAgari||9.99,at:Date.now()}),true);
  }catch(e){}
}
async function loadRoomPool(code,myUid){
  const out=[];
  try{
    if(!window.storage||!code)return out;
    const prefix=ROOM_PREFIX+code+":";
    const r=await window.storage.list(prefix,true);
    const keys=r&&r.keys?r.keys:[];
    for(const k of keys){
      if(myUid&&k.indexOf(myUid)>=0)continue;
      try{const v=await window.storage.get(k,true);if(v&&v.value){const e=JSON.parse(v.value);if(e&&e.name)out.push({...e,key:k});}}catch(e){}
    }
  }catch(e){}
  return out;
}
async function loadVsPool(myUid){
  const out=[];
  try{
    if(!window.storage)return out;
    const r=await window.storage.list(VS_PREFIX,true);
    const keys=r&&r.keys?r.keys:[];
    for(const k of keys){
      if(myUid&&k.indexOf(myUid)>=0)continue;
      try{const v=await window.storage.get(k,true);if(v&&v.value){const e=JSON.parse(v.value);if(e&&typeof e.time==="number")out.push({...e,key:k});}}catch(e){}
    }
  }catch(e){}
  return out;
}

// ─── サウンド ────────────────────────────────────────────────
let _actx=null;
function getACtx(){return _actx=_actx||new(window.AudioContext||window.webkitAudioContext)();}
function resumeAudio(){try{const a=getACtx();if(a.state==="suspended"&&a.resume)a.resume();}catch(e){}}
function beep(freq,dur,vol,type){
  try{const a=getACtx(),o=a.createOscillator(),g=a.createGain();o.type=type||"square";o.frequency.value=freq;g.gain.value=vol||0.06;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);o.stop(a.currentTime+dur);}catch(e){}
}
function clickSound(){try{const a=getACtx(),o=a.createOscillator(),g=a.createGain();o.type="square";o.frequency.setValueAtTime(1040,a.currentTime);o.frequency.exponentialRampToValueAtTime(1560,a.currentTime+0.018);g.gain.setValueAtTime(0.05,a.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+0.05);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+0.06);}catch(e){}}
function bellSound(){beep(1318,0.35,0.07,"triangle");setTimeout(()=>beep(1318,0.45,0.07,"triangle"),200);setTimeout(()=>beep(1318,0.5,0.06,"triangle"),420);}
function spurtSound(){beep(520,0.09,0.07);setTimeout(()=>beep(780,0.09,0.07),90);setTimeout(()=>beep(1100,0.16,0.08),180);}

// ─── BGMエンジン ─────────────────────────────────────────────
const NF={
  E2:82.41,G2:98.00,A2:110.00,B2:123.47,C3:130.81,D3:146.83,
  E3:164.81,G3:196.00,A3:220.00,B3:246.94,
  C4:261.63,D4:293.66,E4:329.63,FS4:369.99,G4:392.00,A4:440.00,B4:493.88,
  C5:523.25,D5:587.33,E5:659.25,FS5:739.99,G5:783.99,A5:880.00,B5:987.77,
};
const PATTERNS={
  race:{bpm:148,steps:[
    {k:0.65,hh:0.15,b:NF.E2,lead:NF.E5},{hh:0.10,lead:NF.D5},
    {sn:0.40,hh:0.15,b:NF.G2,lead:NF.B4},{hh:0.10},
    {k:0.55,hh:0.15,b:NF.A2,lead:NF.A4},{hh:0.10,lead:NF.G4},
    {sn:0.40,hh:0.15,b:NF.B2,lead:NF.G5},{hh:0.10,lead:NF.E5},
    {k:0.65,hh:0.15,b:NF.E2,lead:NF.E5},{hh:0.10,lead:NF.G5},
    {sn:0.40,hh:0.15,b:NF.D3,lead:NF.A5},{hh:0.10,lead:NF.G5},
    {k:0.55,hh:0.15,b:NF.A2,lead:NF.E5},{hh:0.10,lead:NF.D5},
    {sn:0.40,hh:0.15,b:NF.E2,lead:NF.B4},{hh:0.10,lead:NF.G4},
  ]},
  victory:{bpm:168,steps:[
    {k:0.7,hh:0.2,b:NF.E2,lead:NF.G5},{hh:0.1,lead:NF.A5},
    {k:0.5,sn:0.35,hh:0.2,lead:NF.B5},{hh:0.1},
    {k:0.6,hh:0.2,b:NF.A2,lead:NF.E5},{sn:0.35,hh:0.1,lead:NF.G5},
    {k:0.5,hh:0.2,lead:NF.A5},{hh:0.1,lead:NF.G5},
    {k:0.7,hh:0.2,b:NF.E2,lead:NF.E5},{hh:0.1,lead:NF.G5},
    {sn:0.45,hh:0.2,b:NF.B2,lead:NF.A5},{hh:0.1,lead:NF.B5},
    {k:0.6,hh:0.2,b:NF.A2,lead:NF.G5},{sn:0.35,hh:0.1,lead:NF.E5},
    {k:0.5,hh:0.2,b:NF.E2,lead:NF.B5},{hh:0.1},
  ]},
  // 昇級ボス戦：低音ドローン＋トライトーンの不協和で威圧する重いビート
  boss:{bpm:100,steps:[
    {k:0.9,b:82.41,lead:466.16,hh:0.09},{hh:0.05},
    {k:0.55,b:82.41,hh:0.09},{sn:0.5,hh:0.05,lead:493.88},
    {k:0.9,b:87.31,hh:0.09,lead:349.23},{hh:0.05},
    {b:116.54,hh:0.09,lead:466.16},{sn:0.5,hh:0.05},
    {k:0.9,b:82.41,hh:0.09,lead:659.25},{hh:0.05,lead:698.46},
    {k:0.55,b:82.41,hh:0.09,lead:659.25},{sn:0.5,hh:0.05},
    {k:0.9,b:77.78,hh:0.09,lead:311.13},{hh:0.05},
    {b:116.54,hh:0.09,lead:466.16},{sn:0.55,hh:0.05,lead:493.88},
  ]},
  // KEIRINグランプリ：駆け上がるリードと刻むキックのヒロイック疾走曲
  gp:{bpm:160,steps:[
    {k:0.7,hh:0.18,b:NF.E2,lead:NF.E5},{hh:0.12,lead:NF.G5},
    {sn:0.4,hh:0.18,b:NF.E2,lead:NF.B5},{k:0.5,hh:0.12,lead:NF.A5},
    {k:0.7,hh:0.18,b:NF.G2,lead:NF.G5},{hh:0.12,lead:NF.E5},
    {sn:0.4,hh:0.18,b:NF.G2,lead:NF.D5},{hh:0.12,lead:NF.E5},
    {k:0.7,hh:0.18,b:NF.A2,lead:NF.A5},{hh:0.12,lead:NF.G5},
    {sn:0.4,hh:0.18,b:NF.A2,lead:NF.E5},{k:0.5,hh:0.12,lead:NF.G5},
    {k:0.7,hh:0.18,b:NF.B2,lead:NF.B5},{hh:0.12,lead:NF.A5},
    {sn:0.45,hh:0.18,b:NF.B2,lead:NF.G5},{hh:0.12,lead:NF.E5},
  ]},
  theme:{bpm:132,steps:[
    {k:0.6,hh:0.13,b:NF.E2,lead:NF.E5},{hh:0.08,lead:NF.G5},
    {sn:0.34,hh:0.13,lead:NF.B4},{hh:0.08,lead:NF.E5},
    {k:0.5,hh:0.13,b:NF.C3,lead:NF.C5},{hh:0.08,lead:NF.D5},
    {sn:0.34,hh:0.13,lead:NF.E5},{hh:0.08,lead:NF.G4},
    {k:0.6,hh:0.13,b:NF.G2,lead:NF.D5},{hh:0.08,lead:NF.B4},
    {sn:0.34,hh:0.13,lead:NF.G4},{hh:0.08,lead:NF.B4},
    {k:0.5,hh:0.13,b:NF.D3,lead:NF.A4},{hh:0.08,lead:NF.D5},
    {sn:0.34,hh:0.13,lead:NF.FS4},{hh:0.08,lead:NF.A4},
  ]},
};

class BGM{
  constructor(){this.ctx=null;this.master=null;this.mode=null;this.step=0;this.nextT=0;this.tid=null;this.muted=false;}
  init(){if(!this.ctx){const a=getACtx();this.ctx=a;this.master=a.createGain();this.master.gain.value=0.32;this.master.connect(a.destination);}}
  setMute(v){this.muted=v;if(this.master)this.master.gain.value=v?0:0.32;}
  start(mode){
    this.init();
    if(this.mode===mode)return;
    this.stop();
    this.mode=mode;this.step=0;this.nextT=this.ctx.currentTime+0.05;
    this._sched();
  }
  stop(){if(this.tid)clearTimeout(this.tid);this.tid=null;this.mode=null;}
  _note(freq,type,t,dur,vol){
    try{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+0.01);}catch(e){}
  }
  _kick(t,vol){
    try{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(0.001,t+0.35);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+0.4);}catch(e){}
  }
  _snare(t,vol){
    try{const b=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*0.12),this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=this.ctx.createBufferSource();s.buffer=b;const f=this.ctx.createBiquadFilter();f.type="bandpass";f.frequency.value=1600;f.Q.value=0.9;const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.16);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);}catch(e){}
  }
  _hihat(t,vol){
    try{const b=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*0.035),this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=this.ctx.createBufferSource();s.buffer=b;const f=this.ctx.createBiquadFilter();f.type="highpass";f.frequency.value=8000;const g=this.ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);}catch(e){}
  }
  _sched(){
    if(!this.mode)return;
    const pat=PATTERNS[this.mode];if(!pat)return;
    const spb=(60/pat.bpm)/2;
    while(this.nextT<this.ctx.currentTime+0.14){
      const s=pat.steps[this.step%pat.steps.length];
      const t=this.nextT;
      if(s.k)this._kick(t,s.k);
      if(s.sn)this._snare(t,s.sn);
      if(s.hh)this._hihat(t,s.hh);
      if(s.b)this._note(s.b,"sawtooth",t,spb*0.8,0.16);
      if(s.lead)this._note(s.lead,"square",t,spb*0.65,0.10);
      this.nextT+=spb;this.step++;
    }
    this.tid=setTimeout(()=>this._sched(),40);
  }
}
const bgm=new BGM();

// ─── シミュレーション ────────────────────────────────────────
const TRACK=(()=>{const R=30,L=105.75,C=Math.PI*R,P=2*L+2*C;return{R,L,C,P};})();
const LAPS=5,TOTAL=TRACK.P*LAPS;

// trackは省略可（省略時は既存のグローバルTRACK＝アーケード互換の400m相当ジオメトリ）
function trackPoint(dist,lane,track){
  const{R,L,C,P}=track||TRACK;
  let d=((dist%P)+P)%P;const off=lane*2.4;
  if(d<L)return{x:L/2-d,y:R+off};d-=L;
  if(d<C){const a=Math.PI/2+(d/C)*Math.PI;return{x:-L/2+Math.cos(a)*(R+off),y:Math.sin(a)*(R+off)};}
  d-=C;if(d<L)return{x:-L/2+d,y:-(R+off)};d-=L;
  const a=-Math.PI/2+(d/C)*Math.PI;return{x:L/2+Math.cos(a)*(R+off),y:Math.sin(a)*(R+off)};
}

// ═══════════════════════════════════════════════════════════════
// ─── リアルモード（P3）：実在バンク・全国競輪場 ──────────────────
// 出典：バンクデータ各種公開情報（2026年時点）。周長333m(335m含む)/400m/500mの
// 3区分・42場（千葉競輪場はPIST6専用[250m]化のため通常バンク対象から除外）。
// cant：センター部路面傾斜（度）を各場の実測値で反映（P3当初の区分別概算を解消）。
// 奈良のみ出典を確認できず、333m区分の平均的な値で代用（要出典確認の注記）。
// ═══════════════════════════════════════════════════════════════
const REAL_VENUES=[
  {name:"函館",region:"北日本",bank:400,straight:51.3,cant:30.61},
  {name:"青森",region:"北日本",bank:400,straight:58.9,cant:32.25},
  {name:"いわき平",region:"北日本",bank:400,straight:62.7,cant:32.92},
  {name:"弥彦",region:"関東",bank:400,straight:63.1,cant:32.40},
  {name:"前橋",region:"関東",bank:335,straight:46.7,cant:36.00},
  {name:"取手",region:"関東",bank:400,straight:54.8,cant:31.51},
  {name:"宇都宮",region:"関東",bank:500,straight:63.3,cant:25.80},
  {name:"大宮",region:"南関東",bank:500,straight:66.7,cant:26.28},
  {name:"西武園",region:"南関東",bank:400,straight:47.6,cant:29.45},
  {name:"京王閣",region:"南関東",bank:400,straight:51.5,cant:32.18},
  {name:"立川",region:"南関東",bank:400,straight:58.0,cant:31.22},
  {name:"松戸",region:"南関東",bank:333,straight:38.2,cant:29.75},
  {name:"川崎",region:"南関東",bank:400,straight:58.0,cant:32.17},
  {name:"平塚",region:"南関東",bank:400,straight:54.2,cant:31.64},
  {name:"小田原",region:"南関東",bank:333,straight:36.1,cant:34.69},
  {name:"伊東温泉",region:"中部",bank:333,straight:46.6,cant:34.69},
  {name:"静岡",region:"中部",bank:400,straight:56.4,cant:30.72},
  {name:"名古屋",region:"中部",bank:400,straight:58.8,cant:34.03},
  {name:"岐阜",region:"中部",bank:400,straight:59.3,cant:33.25},
  {name:"大垣",region:"中部",bank:400,straight:56.0,cant:30.62},
  {name:"豊橋",region:"中部",bank:400,straight:60.3,cant:33.84},
  {name:"富山",region:"中部",bank:333,straight:43.0,cant:33.69},
  {name:"松阪",region:"中部",bank:400,straight:61.5,cant:34.42},
  {name:"四日市",region:"中部",bank:400,straight:62.4,cant:32.25},
  {name:"福井",region:"中部",bank:400,straight:52.8,cant:31.48},
  {name:"奈良",region:"近畿",bank:333,straight:38.0,cant:33.5}, // 出典未確認：333m区分の平均で代用
  {name:"京都向日町",region:"近畿",bank:400,straight:47.3,cant:30.49},
  {name:"和歌山",region:"近畿",bank:400,straight:59.9,cant:32.25},
  {name:"岸和田",region:"近畿",bank:400,straight:56.7,cant:30.93},
  {name:"玉野",region:"中国",bank:400,straight:47.9,cant:30.63},
  {name:"広島",region:"中国",bank:400,straight:57.9,cant:32.53},
  {name:"防府",region:"中国",bank:333,straight:42.5,cant:34.69},
  {name:"高松",region:"四国",bank:400,straight:54.8,cant:33.26},
  {name:"小松島",region:"四国",bank:400,straight:54.6,cant:29.77},
  {name:"高知",region:"四国",bank:500,straight:52.0,cant:24.50},
  {name:"松山",region:"四国",bank:400,straight:58.6,cant:34.03},
  {name:"小倉",region:"九州",bank:400,straight:56.9,cant:34.03},
  {name:"久留米",region:"九州",bank:400,straight:50.7,cant:31.48},
  {name:"武雄",region:"九州",bank:400,straight:64.4,cant:32.01},
  {name:"佐世保",region:"九州",bank:400,straight:40.2,cant:31.48},
  {name:"別府",region:"九州",bank:400,straight:59.9,cant:33.69},
  {name:"熊本",region:"九州",bank:400,straight:60.3,cant:34.0}, // 2024年改修で500m→400mに変更(旧29°→新34°)
];
// バンク周長→区分（335mは333区分に含める＝実制度の分類に準拠）
function bankCategory(bank){return bank<=350?333:bank<=450?400:500;}
// 距離は約2000mに統一されるよう周回数を調整（333m=6周/400m=5周/500m=4周）
const BANK_LAPS={333:6,400:5,500:4};
const CANT_BY_CATEGORY={333:32,400:30,500:26}; // 区分ごとの一般的傾向による概算カント角(度)

// 現行のTRACK(400m基準)の形状比を保ったまま、任意の周長にスケールする
function makeTrackGeo(bankLen){
  const k=bankLen/TRACK.P;
  return{R:TRACK.R*k,L:TRACK.L*k,C:TRACK.C*k,P:bankLen};
}
// ctx.venue.bankが指定されていれば実バンクのジオメトリ・周回数・総距離を、
// 無指定（アーケード等）なら既存のTRACK/LAPS/TOTALをそのまま返す（完全後方互換）。
function resolveTrack(ctx){
  const bank=ctx&&ctx.venue&&ctx.venue.bank;
  if(!bank)return{...TRACK,laps:LAPS,total:TOTAL,cat:400,cant:CANT_BY_CATEGORY[400]};
  const cat=bankCategory(bank);const laps=BANK_LAPS[cat];const geo=makeTrackGeo(bank);
  // 実測カント（ctx.venue.cant）があればそれを、無ければ区分別概算値を使う
  const cant=(ctx.venue.cant!=null)?ctx.venue.cant:CANT_BY_CATEGORY[cat];
  return{...geo,laps,total:geo.P*laps,cat,cant};
}
// 現在地dがコーナー区間にあるか（カント角の効果はコーナーでのみ働く）
function inCorner(d,track){
  const L=track.L,C=track.C,P=track.P;
  const pos=((d%P)+P)%P;
  return(pos>=L&&pos<L+C)||(pos>=2*L+C);
}
// 審議失格の内訳（P3保留分）：実際の競輪の失格事由の名称で分類する。
// 厳密な幾何判定ではなく、発生状況（誘導員フェーズか／内側寄りか）から妥当な事由を割り当てる簡易モデル。
const FOUL_KINDS={
  pacer:{label:"誘導員追い抜き",desc:"誘導員の走行を妨げるほど接近・追い抜こうとしたと判定された"},
  inside:{label:"内側追い抜き",desc:"内圏線（帯線）より内側から強引に追い抜こうとしたと判定された"},
  push:{label:"押し上げ・押圧",desc:"周囲の選手を斜めに押して進路を妨害したと判定された"},
  weave:{label:"斜行・蛇行",desc:"直線的でない走行で周囲を巻き込みかけたと判定された"},
};

// staEff: スタミナによる燃費係数。sta0で1.0（消費増）、sta500で約0.45（消費が半分以下）。
// これによりスタミナは「最大値(タンク)」だけでなく「消費速度(燃費)」にも効くようになる。
// staMax基準：カンスト(spd500,sta500)で「全力連打を800m持続」できる値(153.6)から逆算
// gear省略時は既存の物理そのまま（アーケード互換）。指定時はギア比に応じ最高速↔加速を trade-off させる
function deriveBody(stats,gear){
  const g=gear||{accMul:1,vMul:1};
  return{maxV:(13.6+stats.spd*0.013)*g.vMul,acc:(0.9+stats.pow*0.005)*g.accMul,
    staMax:33.6+stats.sta*0.24,draftMult:Math.max(0.3,0.55-stats.tec*0.00055),staEff:Math.max(0.4,1-stats.sta*0.0011)};
}

function pushCom(sim,text,force){if(force||sim.t-(sim.lastComT||-9)>1.0){sim.events.push({type:"comment",text});sim.lastComT=sim.t;}}

// 固有スキル発動：状態をセットし、カットイン演出イベントを発火する
function fireSkill(sim,r){
  if(!r.skill||r.skillActive||r.skillUsed>=r.skill.uses)return false;
  r.skillActive=true;r.skillRem=r.skill.dur;r.skillUsed++;
  const kind=r.skill.kind||"self";
  // ── 獲得スキルの追加効果 ──
  if(kind==="opp_nerf"){sim.oppDebuffMul=r.skill.mul;sim.oppDebuffRem=r.skill.dur;}
  else if(kind==="opp_stun"){
    // 直前を走る敵1人（プレイヤーより前で最も近い未ゴール者）を急失速させる
    let tgt=null,bg=1e9;
    for(const o of sim.riders){if(!o.isP&&!o.fin&&o.d>r.d){const g=o.d-r.d;if(g<bg){bg=g;tgt=o;}}}
    if(tgt){tgt.stunRem=r.skill.dur;pushCom(sim,tgt.car+"番 "+tgt.sur+"に雷が直撃！！",true);}
  }
  else if(kind==="ouja"){
    // 王者の風格：敵スキル無効化＆受けているデバフを即解除
    sim.oujaRem=r.skill.dur;
    sim.pDebuffRem=0;sim.pDebuffMul=1;sim.pBind=0;sim.pStall=0;
  }
  else if(kind==="opp_sta_cut"){
    // スタミナブレイク：敵全員の「今の」スタミナを2/3に削る
    for(const o of sim.riders){if(!o.isP&&!o.fin)o.sta=o.sta*(r.skill.mul||0.667);}
    pushCom(sim,"敵全員の脚が一気に重くなった！！",true);
  }
  else if(kind==="opp_stun3"){
    // 時間停止：ランダムな敵3人を止める
    const targets=shuffle(sim.riders.filter(o=>!o.isP&&!o.fin)).slice(0,3);
    for(const o of targets)o.stunRem=r.skill.dur;
    if(targets.length)pushCom(sim,targets.map(o=>o.car+"番").join("・")+"の時が止まった！？",true);
  }
  if(r.isP){
    sim.shake=8;
    sim.skillFxT=0.9;sim.skillFxCol=kind==="ouja"?"gold":"gold";sim.skillFxCar=r.car; // カメラズーム＆火花演出
    sim.events.push({type:"skill",name:r.skill.name,icon:r.skill.icon});
    sim.events.push({type:"banner",text:r.skill.icon+" "+r.skill.name+"！！",sub:r.skill.short});
  }
  pushCom(sim,r.car+"番 "+r.sur+"、必殺「"+r.skill.name+"」発動ォ！！",true);
  return true;
}

// ボススキル発動：プレイヤーへの妨害効果を適用し、敵カットイン演出を発火する
function fireBossSkill(sim,boss,player){
  const bs=boss.bossSkill;
  if(!bs||boss.bsUsed>=bs.uses)return false;
  // 「王者の風格」発動中は敵スキルを完全無効化（発動自体を封じる）
  if(sim.oujaRem>0){
    boss.bsUsed++;
    sim.events.push({type:"banner",text:"👑 王者の風格！！",sub:boss.sur+"のスキルを無効化した！"});
    pushCom(sim,boss.sur+"のスキルは王者の風格に阻まれた！！",true);
    return false;
  }
  boss.bsUsed++;
  if(bs.type==="nerf"){sim.pDebuffMul=bs.power;sim.pDebuffRem=bs.dur;}
  else if(bs.type==="bind"){sim.pBind=bs.dur;}
  else if(bs.type==="block"){sim.pStall=bs.dur;sim.blockCd=3.0;} // 連続発動を防ぐ3秒CD
  sim.shake=9;
  sim.skillFxT=0.9;sim.skillFxCol="red";sim.skillFxCar=boss.car;
  sim.events.push({type:"skill",name:bs.name,icon:bs.icon,hostile:true});
  sim.events.push({type:"banner",text:bs.icon+" "+bs.name+"！！",sub:"⚠ "+boss.sur+"のスキル："+bs.desc.split("。")[1]});
  pushCom(sim,boss.car+"番 "+boss.sur+"の必殺「"+bs.name+"」！！くらった！！",true);
  return true;
}

function createSim(ctx,career,strategy,tutorial){
  const condP=conditionInfo(career.fatigue);
  const slotted=[];
  ctx.lines.forEach((ln,li)=>{
    let cars=ln.cars.slice();
    if(ln.isPlayerLine&&strategy.slot>=0){const pc=ctx.riders.find(r=>r.isP).car;cars.splice(strategy.slot,0,pc);}
    cars.forEach((c,si)=>{slotted.push({car:c,slot:si,lineIdx:li,aheadCar:si>0?cars[si-1]:null});});
  });
  let prefCtr=1;const prefBC={};slotted.forEach(s=>{prefBC[s.car]=prefCtr++;});
  const hi=ctx.hardItem||null; // 装着中の特別アイテム（ハードモード報酬）
  const riders=ctx.riders.map((r,i)=>{
    // 特別アイテムのステータス補正（レース中のみ・セーブには影響しない）
    let st=r.stats;
    if(hi){
      if(!r.isP&&hi.type==="opp")st={...st,[hi.stat]:clamp(st[hi.stat]-hi.v,0,500)};
      else if(r.isP&&hi.type==="self")st=hi.stat==="all"
        ?{pow:clamp(st.pow+hi.v,0,500),spd:clamp(st.spd+hi.v,0,500),sta:clamp(st.sta+hi.v,0,500),tec:clamp(st.tec+hi.v,0,500)}
        :{...st,[hi.stat]:clamp(st[hi.stat]+hi.v,0,500)};
    }
    // ギア倍数（P6・リアルモードのみ）：プレイヤーの最高速↔加速をトレードオフさせる
    const gear=r.isP?GEAR_OPTIONS.find(g=>g.id===ctx.gearId):null;
    const body=deriveBody(st,gear);
    const sl=slotted.find(s=>s.car===r.car)||{slot:0,aheadCar:null};
    let pref,spurtAt,cond,role,aheadCar;
    if(r.isP){cond=condP.mult;spurtAt=0;role="player";aheadCar=null;pref=prefBC[r.car]||strategy.pref;}
    else{cond=rnd(0.96,1.04);aheadCar=sl.aheadCar;role=sl.slot===0?"leader":"follower";pref=prefBC[r.car]||i+1;
      if(r.styleId==="nige")spurtAt=rnd(560,700);else if(r.styleId==="makuri")spurtAt=rnd(360,480);else spurtAt=rnd(230,320);
      if(role==="follower")spurtAt=rnd(170,230);}
    return{...r,...body,cond,pref,spurtAt,role,slot:sl.slot,aheadCar,sur:r.name.split(" ")[0]||r.name,
      d:2-Math.floor(i/3)*2.4,v:0,lane:0.4+(i%3)*1.1,tLane:0.4,
      sta:body.staMax,state:"pack",tired:false,draft:false,
      crankPhase:rnd(0,Math.PI*2),
      fin:false,finT:0,place:0,idx:i+1,tareCalled:false,sashiGo:false,
      skill:r.isP?(ctx.skill||null):(ctx.hardMode?{...pick(CHARACTERS).skill,trigger:pick(["auto_bell","auto_last"])}:null),
      skillActive:false,skillRem:0,skillUsed:0,stunRem:0,
      bossSkill:r.isBoss&&ctx.boss&&ctx.boss.skill?ctx.boss.skill:null,bsUsed:0,
      raceStats:{b:0,h:0,s:0}, // B/H/S集計（P3）：バック線/ホーム線の先頭通過・先頭交代回数
      dnf:false,incident:null,foulKind:null}; // 落車・失格(P3)
  });
  // 特別アイテム：start=最前列スタート / draft=風よけ強化 / regen=回復倍率
  if(hi){
    const pr=riders.find(r=>r.isP);
    if(hi.type==="start"){pr.pref=0.5;pr.d=Math.max(...riders.map(r=>r.d))+1.2;}
    else if(hi.type==="draft")pr.draftMult=Math.max(0.12,pr.draftMult-hi.v);
    else if(hi.type==="regen")pr.regenMul=hi.v;
  }
  // 実バンク（P3）：ctx.venue.bankがあれば実周長・実周回数を、無ければ既存の固定値を使う
  const trk=resolveTrack(ctx);
  // 誘導員退避(約2周前)・打鐘(残り1周半)・最終合図(残り半周)・自動スパート開始の各タイミングを
  // バンク周長に比例させる（400m基準では従来の805/600/200/260と完全に一致＝アーケード無変化）
  const timing={pacerOut:trk.P*2+5,jan:trk.P*1.5,final:trk.P*0.5,autoSpurt:trk.P*0.65};
  return{total:trk.total,track:trk,laps:trk.laps,timing,t:0,paused:false,done:false,
    pacer:{d:12,v:7.5,active:true},riders,
    playerThrottle:0,intent:"keep",
    shake:0,cam:{zoom:1,focusX:0},
    pDebuffMul:1,pDebuffRem:0,pBind:0,pStall:0,blockCd:0, // ボススキルのデバフ状態
    oppDebuffMul:1,oppDebuffRem:0,oujaRem:0,               // 獲得スキル（敵全体デバフ・王者の風格）
    skillFxT:0,skillFxCol:null,skillFxCar:0,               // スキル演出（ズーム・火花）
    events:tutorial?[{type:"tut",step:"start"}]:[],
    flags:{},finCount:0,results:null,tutorial,
    tele:{draftSec:0,runSec:0,spurtRem:null,tired:false,mashSum:0,mashTicks:0},lastComT:-9,venue:ctx.venue};
}

function calcTS(sim){
  if(sim.done)return 1;
  const p=sim.riders.find(r=>r.isP);const rem=sim.total-p.d;
  if(p.state==="spurt")return 1.45;if(rem>1300)return 4.2;if(rem>820)return 2.6;if(rem>600)return 1.9;return 1.5;
}

function stepSim(sim,h){
  if(sim.paused||sim.done)return;
  sim.t+=h;
  const pc=sim.pacer,rs=sim.riders;
  const byCar={};rs.forEach(r=>{byCar[r.car]=r;});
  const player=rs.find(r=>r.isP);

  if(!sim.flags.gun&&sim.t>0.25){sim.flags.gun=true;pushCom(sim,"号砲！9車が一斉にスタート！！",true);sim.events.push({type:"banner",text:"スタート！！",sub:"まずは誘導員の後ろで隊列を作れ"});}
  if(!sim.flags.formation&&sim.t>11){sim.flags.formation=true;const lead=rs.slice().sort((a,b)=>b.d-a.d)[0];pushCom(sim,lead.region+"勢が前受けの構え",true);}

  if(pc.active){
    pc.v=clamp(7.5+(pc.d/sim.total)*18,7.5,12.9);pc.d+=pc.v*h;
    const leadD=Math.max(...rs.map(r=>r.d));
    if(sim.total-leadD<=sim.timing.pacerOut&&!sim.flags.pcOut){
      sim.flags.pcOut=true;pc.active=false;
      sim.events.push({type:"banner",text:"誘導員 退避！",sub:"ここから本当の勝負"});
      sim.events.push({type:"phase",v:"ready"});
      pushCom(sim,"誘導員が退避！ペースが上がる！",true);
      if(sim.tutorial)sim.events.push({type:"tut",step:"pacerOut"});
    }
  }

  const sorted=rs.slice().sort((a,b)=>b.d-a.d);sorted.forEach((r,i)=>{r.idx=i+1;});
  if(sim.flags.pcOut&&!sim.done){const lc=sorted[0].car;if(sim.leadCar!==undefined&&sim.leadCar!==lc&&sim.t-(sim.leadT||-9)>2.5&&!sorted[0].fin){pushCom(sim,lc+"番 "+sorted[0].sur+"が先頭に立った！");sim.leadT=sim.t;sorted[0].raceStats.s++;}sim.leadCar=lc;}

  const remP=sim.total-player.d;
  // B/H/S集計（P3）：最終周のホーム線(残り1周)・バック線(残り半周)を先頭で通過した選手を記録
  if(!sim.flags.hLine&&remP<=sim.track.P){sim.flags.hLine=true;sorted[0].raceStats.h++;}
  if(!sim.flags.bLine&&remP<=sim.timing.final){sim.flags.bLine=true;sorted[0].raceStats.b++;}
  if(sim.tutorial&&!sim.flags.tutPos&&sim.t>9&&pc.active){sim.flags.tutPos=true;sim.events.push({type:"tut",step:"position"});}
  if(!sim.flags.bell&&remP<=sim.timing.jan){sim.flags.bell=true;sim.events.push({type:"banner",text:"🔔 ジャン！！",sub:"残り1周半：仕掛けどころ"});sim.events.push({type:"bell"});pushCom(sim,"ジャンが鳴った！残り1周半！",true);if(sim.tutorial)sim.events.push({type:"tut",step:"jan"});}
  if(!sim.flags.final&&remP<=sim.timing.final){sim.flags.final=true;sim.events.push({type:"banner",text:"最終直線！！",sub:"踏め踏め踏め——！！"});const tops=sorted.filter(r=>!r.fin).slice(0,2).map(r=>r.car+"番").join("と");pushCom(sim,"最終直線！"+tops+"の死闘！！",true);}
  if(!sim.flags.autoSpurt&&remP<=sim.timing.autoSpurt&&player.state==="pack"){sim.flags.autoSpurt=true;player.state="spurt";sim.tele.spurtRem=remP;sim.events.push({type:"phase",v:"spurt"});sim.events.push({type:"banner",text:"行くしかない！",sub:"連打でペダルを踏み込め！"});}

  if(!player.fin){sim.tele.runSec+=h;if(player.draft)sim.tele.draftSec+=h;if(player.tired)sim.tele.tired=true;if(player.state==="spurt"){sim.tele.mashSum+=sim.playerThrottle;sim.tele.mashTicks++;}}

  // ── 時間スケール：スキル等の「秒数」はプレイヤーの体感（実時間）に合わせる ──
  // シムはcalcTS倍速で進むため、タイマー減衰を tScale で割って実時間換算にする
  const tScale=calcTS(sim)||1;
  const hReal=h/tScale;

  // ── ボススキル：プレイヤーへのデバフ類のタイマー減衰（実時間基準）──
  if(sim.pDebuffRem>0){sim.pDebuffRem-=hReal;if(sim.pDebuffRem<=0){sim.pDebuffRem=0;sim.pDebuffMul=1;pushCom(sim,"ボスのスキル効果が切れた！",true);}}
  if(sim.pBind>0){sim.pBind-=hReal;if(sim.pBind<=0){sim.pBind=0;pushCom(sim,"体が動く！反撃のチャンス！",true);}}
  if(sim.pStall>0){sim.pStall-=hReal;if(sim.pStall<0)sim.pStall=0;}
  if(sim.blockCd>0)sim.blockCd-=hReal;
  // ── 獲得スキル：敵全体デバフ・王者の風格のタイマー減衰（実時間基準）──
  if(sim.oppDebuffRem>0){sim.oppDebuffRem-=hReal;if(sim.oppDebuffRem<=0){sim.oppDebuffRem=0;sim.oppDebuffMul=1;}}
  if(sim.oujaRem>0){sim.oujaRem-=hReal;if(sim.oujaRem<0)sim.oujaRem=0;}

  for(const r of rs){
    r.crankPhase=(r.crankPhase+r.v*0.72*h)%(Math.PI*2);
    if(r.fin){r.v=Math.max(7,r.v-1.6*h);r.d+=r.v*h;continue;}
    if(r.dnf){r.v=0;continue;} // 落車・失格(P3)：以後は停止したまま扱う
    const rem=sim.total-r.d;
    // ── 固有スキル：発動中タイマーの減衰（実時間基準）＆自動発動トリガー ──
    if(r.skill){
      if(r.skillActive){r.skillRem-=hReal;if(r.skillRem<=0){r.skillActive=false;r.skillRem=0;}}
      if(!r.skillActive&&r.skillUsed<r.skill.uses){
        const tg=r.skill.trigger;
        const autoFire=(tg==="auto_bell"&&rem<=600)||(tg==="auto_last"&&rem<=200);
        if(autoFire)fireSkill(sim,r);
      }
    }
    // ── ボススキル：発動トリガー判定 ──
    if(r.isBoss&&r.bossSkill&&r.bsUsed<r.bossSkill.uses){
      const bs=r.bossSkill;
      if(bs.type!=="block"&&remP<=bs.at&&!player.fin)fireBossSkill(sim,r,player);
      else if(bs.type==="block"&&sim.blockCd<=0&&!player.fin&&remP<=800){
        // 「横に来たら」判定：ボスと並走(前後3m以内・別レーン気味)している瞬間
        const dd=Math.abs(player.d-r.d);const ld=Math.abs(player.lane-r.lane);
        if(dd<3.0&&ld<1.6)fireBossSkill(sim,r,player);
      }
    }
    let ahead=null,bestGap=1e9;
    for(const o of rs){if(o!==r&&o.d>r.d){const g=o.d-r.d;if(g<bestGap){bestGap=g;ahead=o;}}}
    let aheadObj=ahead;
    if(pc.active&&(!ahead||pc.d-r.d<bestGap))aheadObj={v:pc.v,d:pc.d,lane:0.3};
    const gap=aheadObj?aheadObj.d-r.d:1e9;
    const laneDiff=aheadObj?Math.abs((aheadObj.lane||0.3)-r.lane):9;
    r.draft=!!(aheadObj&&gap>1.2&&gap<12&&laneDiff<0.95);
    const la=!r.isP&&r.aheadCar?byCar[r.aheadCar]:null;
    let lineFollow=false,lgap=0;
    if(la&&!la.fin&&r.state!=="spurt"){
      lgap=la.d-r.d;
      if(lgap>-2&&lgap<20){
        lineFollow=true;
        if(la.state==="spurt"||la.state==="follow"){if(r.state==="pack"){r.state="follow";if(r.slot===1)pushCom(sim,r.car+"番 "+r.sur+"が番手から続く！");}}
        if(r.state==="follow"&&rem<=(r.slot>=2?150:190)){r.state="spurt";r.sashiGo=true;r.tLane=la.lane+1.15;pushCom(sim,r.car+"番 "+r.sur+"、外から差しに出た！！",true);}
        if(r.state==="follow"&&la.tired&&rem<500){r.state="spurt";r.sashiGo=true;pushCom(sim,"前がいっぱい！"+r.car+"番 "+r.sur+"が出る！");}
        // 決まり手を意識した戦術判断（P3保留分）：他ラインが先にスパートへ入った(=脅威)場合、
        // 番手選手が予定の仕掛けどころより早く反応することがある（1秒に1回だけ判定）。
        if(r.state==="follow"&&rem<700&&rem>150&&(r.reactT==null||sim.t-r.reactT>=1)){
          r.reactT=sim.t;
          const threat=rs.some(o=>o!==r&&o!==la&&!o.fin&&!o.dnf&&o.state==="spurt"&&o.d>r.d-8&&o.d<r.d+30);
          if(threat&&Math.random()<0.12){
            r.state="spurt";r.sashiGo=true;
            pushCom(sim,"他ラインが動いた！"+r.car+"番 "+r.sur+"も反応した！！",true);
          }
        }
      }else{r.aheadCar=null;}
    }
    if(!r.isP&&(r.state==="pack"||r.role==="leader")&&!pc.active&&rem<=r.spurtAt&&!lineFollow){r.state="spurt";pushCom(sim,r.car+"番 "+r.sur+"（"+STYLES[r.styleId].label+"）が仕掛けた！！",true);}
    // ボススキル効果：nerf=最高速デバフ / bind=連打無効 / block=急失速（プレイヤーのみ）
    const debuffMul=r.isP&&sim.pDebuffRem>0?sim.pDebuffMul:1;
    // 獲得スキル効果：敵全体デバフ（プレイヤー以外に適用）
    const oppMul=!r.isP&&sim.oppDebuffRem>0?sim.oppDebuffMul:1;
    // 敵スタンのタイマー減衰（実時間基準）
    if(r.stunRem>0){r.stunRem-=hReal;if(r.stunRem<0)r.stunRem=0;}
    const throttle=r.isP&&sim.pBind>0?0:sim.playerThrottle;
    // カント角補正（P3保留分）：カントが急なバンクほどコーナーで速度を保ちやすい。
    // 基準30度で補正なし＝アーケード（cant未指定時30度）は完全無変化。
    const cornerMul=(sim.track.cant!=null&&inCorner(r.d,sim.track))?(1+(sim.track.cant-30)*0.003):1;
    let tv;const skillMul=r.skillActive&&r.skill?r.skill.power:1;const condV=r.maxV*r.cond*skillMul*debuffMul*oppMul*cornerMul;
    if(r.state==="spurt"){tv=r.isP?12.8+throttle*(condV-12.8):condV;}
    else if(r.state==="follow"&&la){tv=la.v+clamp((lgap-1.8)*1.3,-3,4);}
    else if(!r.isP&&lineFollow){tv=la.v+clamp((lgap-2)*1.2,-2.5,1.8);}
    else if(pc.active){
      let pi=r.pref;if(r.isP){if(sim.intent==="up")pi=Math.max(1,r.idx-1);else if(sim.intent==="down")pi=Math.min(9,r.idx+1);else pi=r.idx;}
      if(r.idx>pi)tv=(aheadObj?aheadObj.v:pc.v)+0.9;else if(r.idx<pi)tv=(aheadObj?aheadObj.v:11)-0.5;else tv=aheadObj?aheadObj.v+clamp((gap-2)*0.8,-1.2,1.2):pc.v;
    }else{
      if(r.isP){if(sim.intent==="up")tv=(aheadObj?aheadObj.v:13.4)+0.9;else if(sim.intent==="down")tv=(aheadObj?aheadObj.v:12)-0.6;else tv=aheadObj?aheadObj.v+clamp((gap-2)*0.8,-1,1.4):13.4;}
      else tv=ahead?ahead.v+clamp((gap-2)*0.8,-1,1.4):13.5;
    }
    if(r.tired)tv=Math.min(tv,12.6);
    if(aheadObj&&gap<3.4&&laneDiff<0.75&&tv>aheadObj.v+0.1){tv=Math.min(tv,aheadObj.v+0.05);r.tLane=(aheadObj.lane||0.3)+1.25;}
    else if((r.state==="follow"||(lineFollow&&r.state==="pack"))&&la){r.tLane=la.lane;}
    else if(!r.sashiGo){r.tLane=Math.max(0.35,r.tLane-0.5*h);}
    r.lane+=clamp(r.tLane-r.lane,-1.6*h,1.6*h);r.lane=clamp(r.lane,0.2,4.0);
    const accel=sim.t<6?r.acc+1.4:r.acc;r.v+=clamp(tv-r.v,-2.2*h,accel*h);r.v=Math.max(0,r.v);
    // block効果：発動中は通常の減速上限を超えて強制的に急ブレーキ（"停止"の演出）
    if(r.isP&&sim.pStall>0){r.v=Math.max(5.5,r.v-16*h);}
    // 雷落とし（獲得スキル）：スタンを受けた敵は急失速
    if(!r.isP&&r.stunRem>0){r.v=Math.max(5.5,r.v-16*h);}
    if(r.v>13){const drain=Math.pow(r.v-13,1.45)*0.5*(r.staEff||1)*(r.draft?r.draftMult:1)*h;r.sta-=drain;
      if(r.sta<=0){r.sta=0;if(!r.tired){r.tired=true;if(r.isP){sim.events.push({type:"banner",text:"タレた…！！",sub:"スタミナ切れで失速"});sim.shake=7;}else if(!r.tareCalled){r.tareCalled=true;pushCom(sim,r.car+"番 "+r.sur+"、一杯か！？苦しい！");}}}
    }else if(r.sta<r.staMax&&r.v<12.6){r.sta=Math.min(r.staMax,r.sta+(r.tired?0.9:2.2)*(r.regenMul||1)*h);if(r.tired&&r.sta>r.staMax*0.25)r.tired=false;}
    if(pc.active&&r.d>pc.d-1.6){r.d=pc.d-1.6;r.v=Math.min(r.v,pc.v);}
    r.d+=r.v*h;
    // ── P3：接触事故判定（落車・審議失格）── プレイヤーのみ対象。至近距離での高速接触時、
    // ごく低確率で発生（テクニックで軽減）。1秒に1回だけ判定してレース中の発生数を制御する。
    if(r.isP&&!r.fin&&!r.dnf&&sim.t>3&&(sim.flags.incT==null||sim.t-sim.flags.incT>=1)){
      sim.flags.incT=sim.t;
      const near=rs.find(o=>o!==r&&!o.fin&&!o.dnf&&Math.abs(o.d-r.d)<1.3&&Math.abs(o.lane-r.lane)<1.1);
      if(near&&r.v>15){
        const techMul=Math.max(0.3,1-(r.stats.tec||0)*0.0013);
        const roll=Math.random();
        if(roll<0.010*techMul){
          r.dnf=true;r.incident="crash";
          sim.events.push({type:"banner",text:"💥 落車！！",sub:near.car+"番と接触、バランスを崩した"});
          pushCom(sim,"あっ…接触！落車だ！！",true);sim.shake=10;
        }else if(roll<0.010*techMul+0.008*techMul){
          // 審議失格の内訳（P3保留分）：状況に応じて実際の違反名を割り当てる。
          //   誘導員フェーズ中に接近しすぎ＝誘導員追い抜き／内側寄り(lane<0.6)での接触＝内側追い抜き／
          //   それ以外は押し上げ・押圧または斜行・蛇行から抽選（教育目的の分類。厳密な幾何判定ではない）
          const fk=pc.active?"pacer":r.lane<0.6?"inside":pick(["push","weave"]);
          r.dnf=true;r.incident="foul";r.foulKind=fk;
          const fkInfo=FOUL_KINDS[fk];
          sim.events.push({type:"banner",text:"⚠ 審議・失格",sub:fkInfo.label+"と判定された"});
          pushCom(sim,"審議…"+fkInfo.label+"で失格の裁定！",true);
        }
      }
    }
    if(r.d>=sim.total&&!r.fin){r.fin=true;sim.finCount++;r.place=sim.finCount;r.finT=sim.t-(r.d-sim.total)/Math.max(r.v,0.1);if(sim.finCount===1)pushCom(sim,"1着は"+r.car+"番 "+r.name+"！！",true);if(r.isP){sim.events.push({type:"banner",text:"ゴール！！",sub:r.place+"着でフィニッシュ"});sim.flags.playerFinT=sim.t;}}
  }

  const allFin=rs.every(r=>r.fin||r.dnf);const pDone=sim.flags.playerFinT!==undefined&&sim.t-sim.flags.playerFinT>3;
  if((allFin||pDone||sim.t>280)&&!sim.done){
    rs.forEach(r=>{if(!r.fin){r.fin=true;sim.finCount++;r.place=sim.finCount;r.finT=9999+(sim.total-r.d);}});
    sim.done=true;sim.results=rs.slice().sort((a,b)=>a.place-b.place);sim.events.push({type:"phase",v:"done"});
  }
}

// ─── レース描画 ──────────────────────────────────────────────
function drawVelodromeBG(ctx, w, h, scrollX, spurtIntensity, venue, t, excite, track) {
  t = t || 0; excite = excite || 0;
  const TR = track || TRACK; // 実バンク(P3)：venueのbankに応じたジオメトリ（未指定時は既存互換）
  const sky = venue && venue.sky ? venue.sky : ["#080c18", "#0e1a2e"];
  const crowdBase = venue && venue.crowd ? venue.crowd : "#2a3550";
  const topH = h * 0.30;
  const gd = ctx.createLinearGradient(0, 0, 0, topH);
  gd.addColorStop(0, "#05070e"); gd.addColorStop(0.55, sky[0]); gd.addColorStop(1, sky[1]);
  ctx.fillStyle = gd; ctx.fillRect(0, 0, w, topH);
  const apexX = w / 2, apexY = topH * 0.04;
  ctx.strokeStyle = "rgba(150,170,210,0.10)"; ctx.lineWidth = 1.4;
  for (let r = 1; r <= 5; r++) {
    const ry = topH * 0.18 + r * topH * 0.17, bow = topH * 0.12;
    ctx.beginPath(); ctx.moveTo(-10, ry); ctx.quadraticCurveTo(apexX, ry - bow, w + 10, ry); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(150,170,210,0.13)"; ctx.lineWidth = 1.1;
  const ribs = 9;
  for (let i = 0; i <= ribs; i++) {
    const tx = (i / ribs) * w;
    ctx.beginPath(); ctx.moveTo(apexX, apexY); ctx.quadraticCurveTo((apexX + tx) / 2, topH * 0.52, tx, topH * 0.95); ctx.stroke();
  }
  const lightCol = venue && venue.accent ? venue.accent : "#fff7d8";
  for (let i = 0; i < 5; i++) {
    const lx = w * (0.14 + i * 0.18), ly = topH * 0.34 + (i % 2) * topH * 0.16;
    const flick = 1 + Math.sin(t * 30 + i * 9) * 0.06;
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 24 * flick);
    lg.addColorStop(0, "rgba(255,250,225,0.5)"); lg.addColorStop(1, "rgba(255,250,225,0)");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 24 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff7d8"; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  const ag = ctx.createRadialGradient(apexX, apexY, 0, apexX, apexY, 46);
  ag.addColorStop(0, "rgba(255,250,230,0.45)"); ag.addColorStop(1, "rgba(255,250,230,0)");
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(apexX, apexY, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lightCol; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(apexX, apexY + 2, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(120,140,180,0.32)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, topH - 1); ctx.lineTo(w, topH - 1); ctx.stroke();

  // ── 観客席：終盤ほど総立ちで飛び跳ね、腕を突き上げる ──
  const standH = h * 0.22;
  const crowdLight = venue && venue.accent ? venue.accent : "#4a5a8a";
  for (let i = 0; i < 72; i++) {
    const baseX = ((i * 19 + scrollX * 0.18) % (w + 38)) - 19;
    const hop = Math.sin(t * 2.9 + i * 1.73);
    const jump = excite > 0.15 ? Math.max(0, hop) * (2.2 + excite * 4.2) : hop * 0.6;
    const rowY = topH + (i % 4) * (standH / 4.5) + 4 - jump;
    const col = (i % 13 === 0) ? crowdLight : (i % 3 === 0) ? crowdBase : "#2a3550";
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(baseX + 9, rowY, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(baseX + 4, rowY + 4, 10, 10);
    if (excite > 0.4 && i % 3 === 0 && hop > 0.25) {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(baseX + 5, rowY + 1); ctx.lineTo(baseX + 1, rowY - 7);
      ctx.moveTo(baseX + 13, rowY + 1); ctx.lineTo(baseX + 17, rowY - 7); ctx.stroke();
    }
  }
  // ── カメラフラッシュ（終盤、客席のあちこちで白く瞬く）──
  if (excite > 0.25) {
    const tick = Math.floor(t * 9);
    const n = 3 + Math.floor(excite * 6);
    for (let j = 0; j < n; j++) {
      const sd = Math.sin((tick + j * 13.7) * 127.1) * 43758.5453;
      const fr = sd - Math.floor(sd);
      if (fr > 0.42) continue;
      const fx2 = (Math.abs(Math.floor(sd * 7)) * 53 + j * 173) % w;
      const fy2 = topH + ((j * 97 + tick * 31) % Math.max(1, Math.floor(standH)));
      const fg = ctx.createRadialGradient(fx2, fy2, 0, fx2, fy2, 8);
      fg.addColorStop(0, "rgba(255,255,255,0.95)"); fg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx2, fy2, 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  const fenceY = topH + standH;
  ctx.fillStyle = "#1a2438"; ctx.fillRect(0, fenceY, w, 30);
  for (let i = 0; i < 7; i++) {
    const ax = ((i * 148 + scrollX * 0.55) % (w + 148)) - 74;
    const ad = ADS[i % ADS.length];
    ctx.fillStyle = ad.bg;
    ctx.fillRect(ax, fenceY + 2, 136, 26);
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1;
    ctx.strokeRect(ax + 0.5, fenceY + 2.5, 135, 25);
    ctx.fillStyle = ad.fg;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ad.text, ax + 68, fenceY + 15);
  }

  const trackY = fenceY + 30;
  const g2 = ctx.createLinearGradient(0, trackY, 0, h);
  g2.addColorStop(0, "#3c3228"); g2.addColorStop(0.4, "#2e261e"); g2.addColorStop(1, "#22190f");
  ctx.fillStyle = g2; ctx.fillRect(0, trackY, w, h - trackY);
  ctx.strokeStyle = "rgba(90,70,50,0.5)"; ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    ctx.beginPath(); ctx.moveTo(0, trackY + (h - trackY) * i / 7); ctx.lineTo(w, trackY + (h - trackY) * i / 7); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(29,111,224,0.7)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, trackY + 14); ctx.lineTo(w, trackY + 14); ctx.stroke();
  ctx.strokeStyle = "rgba(226,58,46,0.6)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, trackY + 24); ctx.lineTo(w, trackY + 24); ctx.stroke();

  if (spurtIntensity > 0.12) {
    const si = clamp(spurtIntensity, 0, 1);
    for (let k = 0; k < 18; k++) {
      const lx = ((k * 45 + scrollX * 2.2) % (w + 90)) - 45;
      const ly = trackY + 10 + (k % 5) * ((h - trackY) / 5);
      const ll = (40 + (k % 3) * 28) * si;
      ctx.strokeStyle = `rgba(255,255,180,${0.08 + si * 0.18})`;
      ctx.lineWidth = (k % 3 + 1) * 0.8;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + ll, ly + (k%2?1:-1)); ctx.stroke();
    }
  }
}

function drawCyclist(ctx, cx, groundY, sc, jerseyColor, number, crankPhase, tired, spurt, isPlayer, speedNorm, t) {
  const s = sc;
  const sp = clamp(speedNorm || 0, 0, 1);
  const tt = t || 0;

  // ── 接地影（速度が乗るほど後方に伸びる）──
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.30)";
  ctx.beginPath();
  ctx.ellipse(cx + (1 - sp * 4) * s, groundY + 2.5, (30 + sp * 10) * s, 4.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  // ── ダンシングの車体振り + 速度による前傾 ──
  const rock = Math.sin(crankPhase) * (spurt ? 0.05 : 0.014);
  const lean = sp * 0.045 + (spurt ? 0.035 : 0);
  ctx.translate(cx, groundY); ctx.rotate(-lean + rock); ctx.translate(-cx, -groundY);
  // ── ペダリングに同期した上体のバウンス ──
  const bob = Math.sin(crankPhase * 2) * (spurt ? 1.7 : 0.8) * s;

  const WR = 19 * s;
  const rearX = cx - 23 * s, frontX = cx + 23 * s;
  const axleY = groundY - WR;
  const bbX = cx - 2 * s, bbY = axleY;

  // ── ホイール（高速時は回転ブラー表現に切り替え）──
  const blur = sp > 0.5;
  for (const wx of [rearX, frontX]) {
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.arc(wx, axleY, WR, 0, Math.PI * 2); ctx.stroke();
    if (blur) {
      ctx.fillStyle = "rgba(95,100,115,0.22)";
      ctx.beginPath(); ctx.arc(wx, axleY, WR - 3 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(205,210,225,0.4)"; ctx.lineWidth = 1.3 * s;
      for (let k = 0; k < 3; k++) {
        const a0 = crankPhase * 2.6 + k * 2.09;
        ctx.beginPath(); ctx.arc(wx, axleY, WR - 6 * s, a0, a0 + 0.85); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "#555"; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.arc(wx, axleY, WR - 4 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#888"; ctx.lineWidth = 0.7 * s;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + crankPhase * 2.2;
        ctx.beginPath(); ctx.moveTo(wx, axleY);
        ctx.lineTo(wx + Math.cos(a) * (WR - 3 * s), axleY + Math.sin(a) * (WR - 3 * s)); ctx.stroke();
      }
    }
  }

  const seatX = bbX - 1 * s, seatY = bbY - 27 * s;
  const htX = frontX - 7 * s, htY = axleY - 23 * s;
  ctx.lineCap = "round"; ctx.lineWidth = 3 * s; ctx.strokeStyle = "#78788a";
  const lines = [[bbX,bbY,htX,htY],[bbX,bbY,seatX,seatY],[seatX,seatY,htX,htY],[bbX,bbY,rearX,axleY],[seatX,seatY,rearX,axleY],[htX,htY,frontX,axleY]];
  lines.forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath(); ctx.ellipse(seatX, seatY, 9*s, 3*s, -0.1, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#666"; ctx.lineWidth = 3*s;
  ctx.beginPath(); ctx.moveTo(htX+1*s, htY-5*s); ctx.lineTo(htX+16*s, htY-5*s); ctx.stroke();
  ctx.beginPath(); ctx.arc(htX+10*s, htY, 6*s, -Math.PI/2, Math.PI/2, true); ctx.stroke();

  const crankR = 12 * s;
  const rFX = bbX + Math.cos(crankPhase) * crankR, rFY = bbY + Math.sin(crankPhase) * crankR;
  const lFX = bbX - Math.cos(crankPhase) * crankR, lFY = bbY - Math.sin(crankPhase) * crankR;
  ctx.strokeStyle = "#999"; ctx.lineWidth = 3*s;
  ctx.beginPath(); ctx.moveTo(bbX,bbY); ctx.lineTo(rFX,rFY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bbX,bbY); ctx.lineTo(lFX,lFY); ctx.stroke();
  ctx.lineWidth = 4*s; ctx.strokeStyle = "#555";
  for (const [px,py] of [[rFX,rFY],[lFX,lFY]]) {
    ctx.beginPath(); ctx.moveTo(px-5*s,py); ctx.lineTo(px+5*s,py); ctx.stroke();
  }

  // ── 上体（バウンス反映 + スパート時はエアロな低い前傾）──
  const tuck = spurt ? 3.2 * s : 0;
  const hipX = seatX + 2*s, hipY = seatY - 5*s - bob * 0.55;
  const torsoEndX = hipX + 29*s + (spurt ? 2*s : 0);
  const torsoEndY = hipY - 5*s - bob * 0.35 + tuck;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = jerseyColor; ctx.lineWidth = 12*s;
  ctx.beginPath(); ctx.moveTo(hipX,hipY); ctx.quadraticCurveTo(hipX+15*s,hipY-8*s+tuck*0.5,torsoEndX,torsoEndY); ctx.stroke();
  ctx.strokeStyle = jerseyColor; ctx.lineWidth = 7*s;
  ctx.beginPath(); ctx.moveTo(torsoEndX-2*s,torsoEndY-2*s); ctx.lineTo(htX+9*s,htY-4*s); ctx.stroke();

  const bibW = 18*s, bibH = 14*s;
  const bibX = hipX+11*s, bibY2 = hipY-8*s+tuck*0.4;
  ctx.fillStyle = "rgba(255,255,255,0.94)"; ctx.fillRect(bibX-bibW/2,bibY2-bibH/2,bibW,bibH);
  ctx.fillStyle = "#111"; ctx.font = `bold ${11*s}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(number), bibX, bibY2);

  const drawLeg = (fx, fy, darker) => {
    const thighL = 16*s, shinL = 16*s;
    const dX = fx - hipX, dY = fy - hipY;
    const d = Math.sqrt(dX*dX+dY*dY);
    let kx, ky;
    if (d < thighL + shinL && d > 0.1) {
      const mid = {x:(hipX+fx)/2, y:(hipY+fy)/2};
      const t2 = thighL*thighL, s2 = shinL*shinL, d2 = d*d;
      const a = (t2-s2+d2)/(2*d), h2 = Math.sqrt(Math.max(0, t2-a*a));
      const perpX = -dY/d, perpY = dX/d;
      const off = Math.sin(crankPhase) < 0 ? -1 : 1;
      kx = mid.x - (dX/d)*a + perpX*h2*Math.abs(off)*0.7;
      ky = mid.y - (dY/d)*a + perpY*h2*Math.abs(off)*0.7;
    } else { kx = (hipX+fx)/2; ky = (hipY+fy)/2 - 5*s; }
    const col1 = darker ? "#8888aa" : jerseyColor;
    const col2 = darker ? "#444464" : "#2a2a3a";
    ctx.strokeStyle = col1; ctx.lineWidth = (darker?6:8)*s;
    ctx.beginPath(); ctx.moveTo(hipX+(darker?-2*s:0),hipY+(darker?1*s:0)); ctx.lineTo(kx,ky); ctx.stroke();
    ctx.strokeStyle = col2; ctx.lineWidth = (darker?5:7)*s;
    ctx.beginPath(); ctx.moveTo(kx,ky); ctx.lineTo(fx,fy); ctx.stroke();
  };
  drawLeg(lFX, lFY, true);
  drawLeg(rFX, rFY, false);

  // ── 頭（スパート時は低く突っ込む）──
  const helX = torsoEndX + 8*s, helY = torsoEndY - 8*s + (spurt ? 1.5*s : 0);
  ctx.strokeStyle = "#d4a078"; ctx.lineWidth = 6*s;
  ctx.beginPath(); ctx.moveTo(torsoEndX+2*s,torsoEndY-1*s); ctx.lineTo(helX-6*s,helY+6*s); ctx.stroke();
  ctx.fillStyle = jerseyColor;
  ctx.beginPath(); ctx.ellipse(helX, helY, 10*s, 8.5*s, -0.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(160,220,255,0.38)";
  ctx.beginPath(); ctx.ellipse(helX+5*s, helY+2*s, 7*s, 4.5*s, -0.2, 0, Math.PI*2); ctx.fill();

  // ── 高速時の風の軌跡 ──
  if (sp > 0.55) {
    ctx.strokeStyle = `rgba(190,220,255,${0.08 + sp * 0.16})`;
    ctx.lineWidth = 1.1 * s; ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const wy = groundY - (15 + k * 13) * s + Math.sin(tt * 22 + k * 2.2) * 1.6 * s;
      const wl = (18 + sp * 28 + k * 7) * s;
      ctx.beginPath(); ctx.moveTo(rearX - 4 * s, wy); ctx.lineTo(rearX - 4 * s - wl, wy + 2 * s); ctx.stroke();
    }
  }

  // ── バテ表現：飛び散る汗 ──
  if (tired) {
    ctx.fillStyle = "rgba(150,210,255,0.85)";
    for (let k = 0; k < 3; k++) {
      const ph = (tt * 2.4 + k * 0.37) % 1;
      const dx = helX + (7 + k * 4) * s + ph * 8 * s;
      const dy = helY - (5 - k * 3) * s + ph * ph * 16 * s;
      ctx.beginPath(); ctx.arc(dx, dy, (1.6 - ph * 0.7) * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = `${9*s}px sans-serif`; ctx.textAlign = "left"; ctx.fillText("💦", helX+11*s, helY-7*s);
  }

  // ── スパート：熱気オーラ + 気迫のストリーク ──
  if (spurt) {
    const g = ctx.createRadialGradient(cx - 6*s, groundY - 34*s, 6*s, cx - 6*s, groundY - 34*s, 46*s);
    g.addColorStop(0, "rgba(255,150,60,0.18)"); g.addColorStop(1, "rgba(255,80,30,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx - 6*s, groundY - 34*s, 46*s, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(255,170,80,0.45)"; ctx.lineWidth = 2*s; ctx.lineCap = "round";
    for (let k = 0; k < 4; k++) {
      const sy = groundY - (10 + k * 14) * s + Math.sin(tt * 26 + k * 1.9) * 2 * s;
      const sl = (14 + k * 7 + sp * 20) * s;
      ctx.beginPath(); ctx.moveTo(rearX - 2*s, sy); ctx.lineTo(rearX - 2*s - sl, sy + 1.5*s); ctx.stroke();
    }
  }
  if (isPlayer) {
    ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2.5*s; ctx.setLineDash([5*s,4*s]);
    ctx.beginPath(); ctx.arc(cx+3*s, groundY-40*s, 42*s, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawGoalLine(ctx, lx, yTop, yBot) {
  const h = yBot - yTop, rows = 9, cw = 7;
  for (let r = 0; r < rows; r++) {
    const yy = yTop + h * r / rows, hh = h / rows + 0.5;
    ctx.fillStyle = (r % 2 === 0) ? "#fff" : "#1a1a1a";
    ctx.fillRect(lx - cw, yy, cw, hh);
    ctx.fillStyle = (r % 2 === 0) ? "#1a1a1a" : "#fff";
    ctx.fillRect(lx, yy, cw, hh);
  }
  ctx.fillStyle = "#cfd6e0";
  ctx.fillRect(lx - cw - 2.5, yTop - 7, 2.5, h + 12);
  ctx.fillRect(lx + cw, yTop - 7, 2.5, h + 12);
}

function drawMiniMap(ctx, sim, mx, my, mw, mh) {
  const TR = (sim && sim.track) || TRACK; // 実バンク(P3)：ミニマップも実際のトラック形状で描画
  ctx.save();
  ctx.fillStyle = "rgba(8,12,22,0.82)";
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 8); ctx.fill(); ctx.strokeStyle = "rgba(120,140,180,0.4)"; ctx.lineWidth = 1; ctx.stroke(); }
  else { ctx.fillRect(mx, my, mw, mh); }
  ctx.fillStyle = "rgba(180,200,230,0.55)"; ctx.font = "9px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("📹", mx + 6, my + 4);
  const worldW = TR.L + TR.R * 2, worldH = TR.R * 2;
  const padX = 10, padTop = 15, padBot = 7;
  const s = Math.min((mw - padX * 2) / worldW, (mh - padTop - padBot) / worldH);
  const ccx = mx + mw / 2, ccy = my + padTop + (mh - padTop - padBot) / 2;
  const tp = (d, lane) => { const p = trackPoint(d, lane || 0, TR); return { x: ccx + p.x * s, y: ccy + p.y * s }; };
  ctx.strokeStyle = "rgba(150,170,210,0.5)"; ctx.lineWidth = Math.max(4, TR.R * s * 0.5); ctx.lineCap = "round";
  ctx.beginPath();
  for (let d = 0; d <= TR.P + 1; d += 6) { const p = tp(d, 0); if (d === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
  ctx.closePath(); ctx.stroke();
  const gi = tp(0, -0.7), go = tp(0, 0.7);
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(gi.x, gi.y); ctx.lineTo(go.x, go.y); ctx.stroke();
  if (sim.pacer.active) { const p = tp(sim.pacer.d, 0); ctx.fillStyle = "#aab4c8"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  const order = sim.riders.slice().sort((a, b) => (a.isP ? 1 : 0) - (b.isP ? 1 : 0));
  for (const r of order) {
    const p = tp(r.d, 0);
    ctx.fillStyle = r.fin ? "rgba(130,140,160,0.6)" : CAR_COLORS[r.car].bg;
    ctx.beginPath(); ctx.arc(p.x, p.y, r.isP ? 3.3 : 2.4, 0, Math.PI * 2); ctx.fill();
    if (r.isP) { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 1.5; ctx.stroke(); }
    else { ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.6; ctx.stroke(); }
  }
  ctx.restore();
}

function drawRaceView(canvas, sim, dpr) {
  if (!canvas || !sim) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const player = sim.riders.find(r => r.isP);
  const TR = sim.track || TRACK; // 実バンク(P3)：レースごとのトラックジオメトリ（未指定時は既存互換）
  const remP = sim.total - player.d;
  const spurtInt = player.state === "spurt" ? clamp(sim.playerThrottle * 0.7 + (player.v - 13) / 6, 0, 1) : 0;
  const scrollX = player.d * 1.8 % (W + 200);
  const HUDB = 52;
  const drawH = H - HUDB;
  // 終盤の盛り上がり度（ジャン以降どんどんヒートアップ。バンク周長に比例）
  const excite = player.fin ? 1 : clamp(((sim.timing?sim.timing.jan:600) - remP) / 520, 0, 1);

  // ── FXパーティクル管理（土煙・紙吹雪）──
  if (!sim._fx) sim._fx = { dust: [], conf: [], spark: [], lastT: sim.t, confDone: false };
  const fx = sim._fx;
  if (!fx.spark) fx.spark = [];
  const fdt = clamp(sim.t - fx.lastT, 0, 0.05);
  fx.lastT = sim.t;

  const MPX = 9.5;
  const CX = W * 0.42;
  const groundY = drawH * 0.87;
  const trackTopY = drawH * 0.52 + 30;

  // ── スキル演出タイマー（発動から0.9秒：ズーム＆火花バースト）──
  let skillFx = 0;
  if (sim.skillFxT > 0) {
    skillFx = sim.skillFxT / 0.9;                 // 1→0 に減衰
    // 発動者の周囲から色付き火花を散らす（金=プレイヤー / 赤=ボス）
    const fr = sim.riders.find(r => r.car === sim.skillFxCar);
    if (fr && fx.spark.length < 90) {
      const sx = fr.d, sy = groundY + (fr.lane - 1.5) * -4 - 30;
      for (let k = 0; k < 4; k++) {
        const a = rnd(0, Math.PI * 2), sp2 = rnd(40, 130) * skillFx;
        fx.spark.push({ d: sx, x0: 0, y: sy, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 20,
          col: sim.skillFxCol === "red" ? "255,80,60" : "255,215,80",
          life: 0, max: rnd(0.35, 0.7), sz: rnd(1.4, 3) });
      }
    }
    sim.skillFxT = Math.max(0, sim.skillFxT - fdt);
  }

  // ── シーン全体：手ブレ + スパート時のカメラズームイン ──
  ctx.save();
  const shakeAmt = sim.shake + spurtInt * 1.3;
  if (shakeAmt > 0.2) ctx.translate(rnd(-shakeAmt, shakeAmt), rnd(-shakeAmt, shakeAmt));
  const zoom = 1 + spurtInt * 0.055 + skillFx * 0.09 + (remP < 130 && !player.fin ? 0.05 * (1 - remP / 130) : 0);
  if (zoom > 1.001) {
    ctx.translate(CX, groundY - 40); ctx.scale(zoom, zoom); ctx.translate(-CX, -(groundY - 40));
  }

  drawVelodromeBG(ctx, W, drawH, scrollX, spurtInt, sim.venue, sim.t, excite, TR);

  // ── 地面の流れ（プレイヤー速度に同期して路面が後方へ流れる）──
  {
    const spd = clamp((player.v - 8.5) / 7, 0, 1);
    if (spd > 0.05) {
      ctx.lineCap = "round";
      for (let k = 0; k < 12; k++) {
        let gx = ((k * 97 - player.d * MPX) % (W + 90));
        if (gx < -45) gx += W + 90;
        const gy = trackTopY + 16 + (k % 5) * ((groundY - trackTopY) / 5.1);
        const gl = 10 + player.v * 2.4;
        ctx.strokeStyle = `rgba(210,190,160,${0.04 + spd * 0.10})`;
        ctx.lineWidth = 1 + (k % 2);
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - gl, gy); ctx.stroke();
      }
    }
  }

  {
    const nextLapD = Math.ceil((player.d + 0.5) / TR.P) * TR.P;
    for (let k = 0; k < 2; k++) {
      const lineD = nextLapD + k * TR.P;
      if (lineD >= sim.total - 1) break;
      const lx = CX + (lineD - player.d) * MPX;
      if (lx > -10 && lx < W + 10) {
        ctx.strokeStyle = "rgba(255,255,255,0.38)"; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(lx, trackTopY); ctx.lineTo(lx, groundY + 8); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const gx = CX + (sim.total - player.d) * MPX;
    if (gx > -40 && gx < W + 40) {
      drawGoalLine(ctx, gx, trackTopY, groundY + 10);
      ctx.fillStyle = "#FFD700"; ctx.font = "bold 13px 'DotGothic16',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("🏁GOAL", gx, trackTopY - 5);
    }
  }

  const drawOrder = sim.riders.slice().sort((a, b) => a.d - b.d);

  if (sim.pacer.active) {
    const px = CX + (sim.pacer.d - player.d) * MPX;
    if (px > -60 && px < W + 60) {
      ctx.fillStyle = "#9aa8c0"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("誘 PACER", px, groundY - 48);
      ctx.fillStyle = "#9aa8c0";
      ctx.beginPath(); ctx.arc(px, groundY - 25, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, groundY - 25, 12, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // ── スリップストリーム可視化：風よけ中は前走者から流れる気流を描く ──
  if (player.draft && !player.fin) {
    let ahead = null, bg = 1e9;
    for (const o of sim.riders) {
      if (o !== player && o.d > player.d) {
        const g = o.d - player.d;
        if (g < bg && g < 12 && Math.abs(o.lane - player.lane) < 0.95) { bg = g; ahead = o; }
      }
    }
    if (ahead) {
      const ax = CX + (ahead.d - player.d) * MPX;
      ctx.save();
      ctx.strokeStyle = "rgba(126,224,255,0.35)"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
      ctx.setLineDash([9, 8]); ctx.lineDashOffset = -(sim.t * 95) % 17;
      for (let k = 0; k < 3; k++) {
        const sy = groundY - 16 - k * 15;
        ctx.beginPath();
        ctx.moveTo(ax - 18, sy);
        ctx.quadraticCurveTo((ax + CX) / 2, sy - 6 + k * 4, CX - 26, sy + 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ── 土煙のスポーン ──
  for (const r of sim.riders) {
    if (r.fin || r.v < 12.4) continue;
    const rel = r.d - player.d;
    if (rel < -9 || rel > 9) continue;
    const chance = (r.v - 12.4) * (r.state === "spurt" ? 1.5 : 0.8) * fdt;
    if (Math.random() < chance && fx.dust.length < 130) {
      fx.dust.push({
        d: r.d - 2.6, y: groundY + rnd(-1, 3) + (r.lane - 1.5) * -4,
        vy: -rnd(14, 42), vd: -rnd(0.6, 2.0),
        life: 0, max: rnd(0.45, 0.85), sz: rnd(1.1, 2.6),
      });
    }
  }
  // ── 土煙の更新・描画 ──
  for (let i = fx.dust.length - 1; i >= 0; i--) {
    const p = fx.dust[i];
    p.life += fdt;
    if (p.life >= p.max) { fx.dust.splice(i, 1); continue; }
    p.d += p.vd * fdt; p.y += p.vy * fdt; p.vy += 130 * fdt;
    const px = CX + (p.d - player.d) * MPX;
    if (px < -20 || px > W + 20) continue;
    const a = (1 - p.life / p.max) * 0.4;
    ctx.fillStyle = `rgba(190,168,132,${a})`;
    ctx.beginPath(); ctx.arc(px, p.y, p.sz * (1 + p.life * 1.6), 0, Math.PI * 2); ctx.fill();
  }

  // ── ゴール紙吹雪（プレイヤーがフィニッシュした瞬間に一度だけ発生）──
  if (player.fin && !fx.confDone) {
    fx.confDone = true;
    const palette = ["#ffd34d", "#e8442e", "#7ee0ff", "#7ee08a", "#f06fae", "#fff"];
    for (let i = 0; i < 90; i++) {
      fx.conf.push({
        d: sim.total + rnd(-7, 7), y: rnd(trackTopY - 90, trackTopY - 8),
        vy: rnd(28, 75), sway: rnd(0, Math.PI * 2), swayAmp: rnd(4, 14),
        col: palette[i % palette.length], w: rnd(3, 6), h: rnd(2, 4),
        rot: rnd(0, Math.PI), vr: rnd(-4, 4), life: 0, max: rnd(2.0, 3.4),
      });
    }
  }
  for (let i = fx.conf.length - 1; i >= 0; i--) {
    const p = fx.conf[i];
    p.life += fdt;
    if (p.life >= p.max) { fx.conf.splice(i, 1); continue; }
    p.y += p.vy * fdt; p.rot += p.vr * fdt;
    const px = CX + (p.d - player.d) * MPX + Math.sin(sim.t * 3 + p.sway) * p.swayAmp;
    if (px < -20 || px > W + 20 || p.y > groundY + 14) continue;
    const a = clamp(1.6 - p.life / p.max * 1.6, 0, 1);
    ctx.save();
    ctx.translate(px, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  // ── 選手描画（プレイヤーはスパート中に残像を引く）──
  for (const r of drawOrder) {
    const rel = r.d - player.d;
    const rx = CX + rel * MPX;
    if (rx < -80 || rx > W + 80) continue;
    const sc = r.isP ? 1.0 : clamp(1.0 + (rel > 0 ? -rel : rel) * 0.004, 0.65, 1.05);
    const laneOffY = (r.lane - 1.5) * -4;
    const ry = groundY + laneOffY;
    const col = CAR_COLORS[r.car];
    const sn = clamp((r.v - 9) / 6.5, 0, 1);
    if (r.isP && spurtInt > 0.25 && !r.fin) {
      for (let g = 2; g >= 1; g--) {
        ctx.save();
        ctx.globalAlpha = (0.15 / g) * spurtInt;
        drawCyclist(ctx, rx - g * 9, ry, sc, col.bg, r.car, r.crankPhase - g * 0.55, false, false, false, sn, sim.t);
        ctx.restore();
      }
    }
    drawCyclist(ctx, rx, ry, sc, col.bg, r.car, r.crankPhase, r.tired, r.state === "spurt", r.isP, sn, sim.t);
    if (!r.fin) {
      ctx.fillStyle = col.bg; ctx.strokeStyle = r.car===2?"#666":"#111"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rx, ry - 19*sc - 16, 9*sc, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col.fg; ctx.font = `bold ${8*sc}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(r.car), rx, ry - 19*sc - 16);
    }
  }

  // ── スキル火花の更新・描画（選手の上に重ねる）──
  for (let i = fx.spark.length - 1; i >= 0; i--) {
    const p = fx.spark[i];
    p.life += fdt;
    if (p.life >= p.max) { fx.spark.splice(i, 1); continue; }
    p.x0 += p.vx * fdt * 0.1; p.y += p.vy * fdt; p.vy += 90 * fdt;
    const px = CX + (p.d - player.d) * MPX + p.x0;
    if (px < -20 || px > W + 20) continue;
    const a = 1 - p.life / p.max;
    ctx.fillStyle = `rgba(${p.col},${a})`;
    ctx.beginPath(); ctx.arc(px, p.y, p.sz * a + 0.6, 0, Math.PI * 2); ctx.fill();
  }

  if (spurtInt > 0.15) {
    ctx.save();
    for (let k = 0; k < 22; k++) {
      const a = (k/22)*Math.PI*2 + Math.sin(sim.t*8+k)*0.05;
      const cos = Math.cos(a), sin = Math.sin(a);
      const ed = 200 + Math.sin(sim.t*15+k*4)*30;
      ctx.strokeStyle = `rgba(255,248,160,${0.06+spurtInt*0.18})`;
      ctx.lineWidth = 1 + k%3;
      ctx.beginPath(); ctx.moveTo(CX + cos*ed, groundY/2 + sin*ed); ctx.lineTo(CX + cos*(ed+55), groundY/2 + sin*(ed+55)); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore(); // シーン（ズーム・シェイク）終了

  // ── 最終直線の緊迫ビネット + スパートの熱気グロー ──
  if (excite > 0.05) {
    const vg = ctx.createRadialGradient(W/2, drawH*0.55, drawH*0.42, W/2, drawH*0.55, drawH*0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,0,0,${0.26 * excite})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, drawH);
  }
  if (spurtInt > 0.3) {
    const ea = (spurtInt - 0.3) * 0.16;
    const lg1 = ctx.createLinearGradient(0, 0, 46, 0);
    lg1.addColorStop(0, `rgba(255,110,40,${ea})`); lg1.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = lg1; ctx.fillRect(0, 0, 46, drawH);
    const lg2 = ctx.createLinearGradient(W, 0, W - 46, 0);
    lg2.addColorStop(0, `rgba(255,110,40,${ea})`); lg2.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = lg2; ctx.fillRect(W - 46, 0, 46, drawH);
  }

  drawMiniMap(ctx, sim, W - 128, 8, 120, 58);

  ctx.fillStyle = "rgba(7,11,22,0.9)";
  ctx.fillRect(0, drawH, W, HUDB);
  ctx.strokeStyle = "#1e2d45"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,drawH); ctx.lineTo(W,drawH); ctx.stroke();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left"; ctx.fillStyle = "#9fb0d0"; ctx.font = "10px sans-serif";
  ctx.fillText("残り", 12, drawH+14);
  ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif";
  ctx.fillText(Math.max(0,Math.ceil(remP))+"m", 12, drawH+33);
  ctx.fillStyle = "#5a6c98"; ctx.font = "9px sans-serif";
  ctx.fillText("LAP "+Math.min(sim.laps||LAPS,Math.floor(player.d/TR.P)+1)+"/"+(sim.laps||LAPS), 13, drawH+47);
  ctx.textAlign = "center"; ctx.fillStyle = "#9fb0d0"; ctx.font = "10px sans-serif";
  ctx.fillText("速度", W/2, drawH+14);
  // 速度計は高速域で熱を帯びる
  const spdCol = player.v > 15.2 ? "#ff9a5c" : player.v > 13 ? "#ffd34d" : "#7ee0ff";
  ctx.fillStyle = spdCol; ctx.font = "bold 18px sans-serif";
  ctx.fillText((player.v*3.6).toFixed(1)+" km/h", W/2, drawH+33);
  ctx.textAlign = "right"; ctx.fillStyle = "#9fb0d0"; ctx.font = "10px sans-serif";
  ctx.fillText(player.fin?"着順":"現在", W-12, drawH+14);
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 24px sans-serif";
  ctx.fillText((player.fin?player.place:player.idx)+"位", W-12, drawH+35);

  ctx.restore();
}

// ─── UI アトム ───────────────────────────────────────────────
function StatBar({label,value,color,bonus}){
  return(<div className="statrow"><span className="statlabel">{label}</span><div className="statbarbg"><div className="statbarfill" style={{width:clamp(value,0,500)/5+"%",background:color}}/></div><span className="statval">{value}{bonus>0&&<span className="equipplus">+{bonus}</span>}</span></div>);
}
function CarChip({car,size}){const c=CAR_COLORS[car];const s=size||26;return(<span className="carchip" style={{background:c.bg,color:c.fg,width:s,height:s,fontSize:s*0.55,border:car===1?"1.5px solid #aaa":"1.5px solid #0b0e18"}}>{car}</span>);}
function Senpai({mood,text,size}){
  return(<div className="senpaibox"><div className={"senpaiface "+(size==="big"?"big":"")}>{SENPAI_MOOD[mood]||"🤨"}</div><div className="senpaibubble"><div className="senpainame">{SENPAI_NAME}<span className="senpaitag">兄貴</span></div><div className="senpaitext">{text}</div></div></div>);
}
function Reporter({text}){
  return(<div className="reporterbox"><div className="reporterface">📺</div><div className="reporterbubble"><div className="reportername">記者</div><div className="reportertext">{text}</div></div></div>);
}

// ─── タイトル ─────────────────────────────────────────────────
function TitleScreen({hasSave,onNew,onContinue,onMaxTest,onRealMode}){
  const[zoom,setZoom]=useState(false);
  useEffect(()=>{bgm.start("theme");const t=setTimeout(()=>setZoom(true),80);return()=>clearTimeout(t);},[]);
  return(
    <div className="screen center titlescreen">
      <div className="flamebg">{Array.from({length:28}).map((_,i)=>(
        <span key={i} className="flame" style={{left:(i*3.6-1)+"%",animationDelay:(i%7)*0.17+"s",animationDuration:(1+(i%5)*0.22)+"s",width:(14+(i%4)*9)+"px",height:(55+(i%6)*34)+"px"}}/>
      ))}<div className="flameglow"/></div>
      <div className={"titlewrap "+(zoom?"zoomin":"zoomstart")}>
        <div className="titletag">遊んで覚える競輪入門ゲーム</div>
        <h1 className="gametitle flametitle">SSケイリン</h1>
        <div className="titlesub flamesub">〜 目指せSS 漢の中の漢道 〜</div>
        <div className="titledots">{[1,2,3,4,5,6,7,8,9].map(n=><span key={n} className="titledot" style={{background:CAR_COLORS[n].bg,animationDelay:n*0.12+"s"}}/>)}</div>
        <div className="titlebtns">
          {hasSave&&<button className="btn primary big" onClick={onContinue}>つづきから</button>}
          <button className={"btn big "+(hasSave?"ghost":"primary")} onClick={onNew}>はじめから</button>
          <button className="linkbtn" style={{marginTop:4}} onClick={onMaxTest}>🧪 カンストデータでテスト開始</button>
        </div>
        <div className="titlefoot">A級3班のルーキーから、S級S班・グランプリ制覇へ。<br/>レースを走りながら競輪のルールが身につく。</div>
        <div style={{marginTop:14}}><button className="linkbtn" onClick={()=>bgm.setMute(!bgm.muted)}>{bgm.muted?"🔇 ミュート中（タップで解除）":"🎵 BGMあり（タップでミュート）"}</button></div>
        <div style={{marginTop:10}}><button className="linkbtn" style={{color:"#7ee0ff"}} onClick={onRealMode}>🎌 リアルモード（β）に切替 — 実制度の期・審査・競走得点で遊ぶ</button></div>
      </div>
    </div>
  );
}

// ─── リアルモード：タイトル ────────────────────────────────────
function RealTitleScreen({hasSave,onNew,onContinue,onBack}){
  return(
    <div className="screen center titlescreen">
      <div className="titlewrap zoomin">
        <div className="titletag">実制度に忠実な競輪選手シミュレーション</div>
        <h1 className="gametitle flametitle" style={{fontSize:"2.1rem"}}>SSケイリン <span style={{color:"#7ee0ff"}}>リアルモード</span></h1>
        <div className="titlesub flamesub">β版 〜 期・審査・競走得点で戦う 〜</div>
        <div className="card" style={{textAlign:"left",marginTop:18}}>
          <div className="mini">・1年は<span className="em">前期/後期</span>の2期制。期末に<span className="em">競走得点の平均</span>で審査され、昇班/降班が決まる</div>
          <div className="mini" style={{marginTop:6}}>・架空の必殺スキルは使用しない、地に足のついたシミュレーション</div>
          <div className="mini" style={{marginTop:6}}>・アーケードモードとはセーブが完全に別（データは混ざりません）</div>
        </div>
        <div className="titlebtns" style={{marginTop:16}}>
          {hasSave&&<button className="btn primary big" onClick={onContinue}>つづきから</button>}
          <button className={"btn big "+(hasSave?"ghost":"primary")} onClick={onNew}>選手登録してはじめる</button>
          <button className="linkbtn" style={{marginTop:8}} onClick={onBack}>← アーケードモードに戻る</button>
        </div>
      </div>
    </div>
  );
}

// ─── リアルモード：ホーム ──────────────────────────────────────
function RealHomeScreen({career,onTrain,onAccept,onDecline,onRace,onRest,onWatch,onBack}){
  const th=TERM_REVIEW_THRESH[career.rank]||{up:null,down:null};
  const recent=(career.ptsHistory||[]).slice(-5).reverse();
  const weeksLeft=24-career.calendar.week+1;
  const ev=career.currentEvent;
  const offer=career.pendingOffer;
  const injured=(career.injuredWeeks||0)>0;
  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:4}}>
        <h2 className="h2" style={{margin:0}}>{career.name}</h2>
        <button className="linkbtn" onClick={onBack}>タイトルへ</button>
      </div>
      <div className="mini dim" style={{marginBottom:10}}>{realCalendarLabel(career.calendar)}・期末まであと{weeksLeft}週</div>

      <div className="card" style={{textAlign:"center"}}>
        <div className="mini dim">現在の級班</div>
        <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:26,color:"#ffd34d",marginTop:2}}>{RANK_LABEL[career.rank]}</div>
      </div>

      <div className="card" style={{marginTop:10}}>
        <div className="rowbetween"><span className="mini bold">平均競走得点（直近{Math.min(12,(career.ptsHistory||[]).length)}走）</span><span className="bold" style={{color:"#ffd34d",fontSize:18}}>{career.avgPts||0}点</span></div>
        <div className="mini dim" style={{marginTop:6}}>
          {th.up!=null&&<>昇班ライン：{th.up}点以上　</>}
          {th.down!=null&&<>降班ライン：{th.down}点未満</>}
          {th.up==null&&th.down==null&&"最上位級班"}
        </div>
      </div>

      {/* ── P3：負傷中は静養のみ（開催・斡旋は隠す）── */}
      {injured&&(
        <div className="card" style={{marginTop:12,borderColor:"#7a3030",background:"#22141a"}}>
          <div className="bold" style={{color:"#ff8a73"}}>🏥 負傷療養中</div>
          <div className="mini" style={{marginTop:4}}>落車の影響で、あと{career.injuredWeeks}週は出走できません。</div>
          <button className="btn ghost big" style={{marginTop:10}} onClick={onRest}>静養する（1週進める）</button>
        </div>
      )}

      {/* ── 開催イベント進行中：現在のラウンドへ出走 ── */}
      {!injured&&ev&&(
        <div className="card gold" style={{marginTop:12}}>
          <div className="mini dim">出場中の開催</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:19,color:"#ffd34d",marginTop:2}}>{ev.gradeName}</div>
          <div className="mini" style={{marginTop:4}}>{ev.consolation?"敗者戦（順位決定戦）":ROUND_LABEL[ev.rounds[ev.roundIdx]]}　{ev.rounds.length>1&&!ev.consolation&&<span className="dim">（{ev.roundIdx+1}/{ev.rounds.length}日目）</span>}</div>
          <button className="btn race big" style={{marginTop:10}} onClick={onRace}>🏁 出走する</button>
        </div>
      )}

      {/* ── 斡旋：出場するか欠場するか ── */}
      {!injured&&!ev&&offer&&(
        <div className="card" style={{marginTop:12,borderColor:"#2a5a7a"}}>
          <div className="mini dim">📋 今月の斡旋</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:19,color:"#7ee0ff",marginTop:2}}>{offer.gradeName}</div>
          <div className="mini dim" style={{marginTop:4}}>{offer.rounds.length}日制（{offer.rounds.map(r=>ROUND_LABEL[r]).join("→")}）</div>
          {career.suspended&&<div className="mini" style={{marginTop:6,color:"#ff8a73"}}>⚠ 欠場が続き斡旋停止中。今回は出場するしかありません</div>}
          <div className="btnrow" style={{marginTop:10}}>
            <button className="btn race half" onClick={onAccept}>出場する</button>
            <button className="btn ghost half" disabled={career.suspended} onClick={onDecline}>欠場する</button>
          </div>
        </div>
      )}

      {recent.length>0&&(
        <div className="card" style={{marginTop:10}}>
          <div className="mini bold" style={{marginBottom:6}}>直近の成績</div>
          {recent.map((h,i)=>(
            <div key={i} className="rowbetween" style={{padding:"4px 0",borderTop:i>0?"1px solid #1c2740":"none"}}>
              <span className="mini dim">{h.year}年{h.term===1?"前期":"後期"} 第{h.week}週・{REAL_GRADE_LABEL[h.grade]}</span>
              <span className="mini">{h.place}着（{h.pts}点）</span>
            </div>
          ))}
        </div>
      )}

      {(career.reviews||[]).length>0&&(
        <div className="card" style={{marginTop:10,borderColor:"#7a6a20"}}>
          <div className="mini bold" style={{marginBottom:6}}>📋 審査履歴</div>
          {career.reviews.slice(-3).reverse().map((r,i)=>(
            <div key={i} className="mini dim" style={{padding:"3px 0"}}>
              {r.year}年{r.term===1?"前期":"後期"}末：{r.result==="up"?"⬆昇班":r.result==="down"?"⬇降班":"現状維持"}（平均{r.avgAtReview}点）
            </div>
          ))}
        </div>
      )}

      {/* ── P3：通算B/H/S・決まり手 ── */}
      {career.rec.races>0&&(
        <div className="card" style={{marginTop:10}}>
          <div className="mini bold" style={{marginBottom:6}}>通算データ（B・H・S／決まり手）</div>
          <div className="rowbetween"><span className="mini dim">B（バック線先頭）/ H（ホーム線先頭）/ S（先頭奪取）</span><span className="mini">{career.bhs?.b||0} / {career.bhs?.h||0} / {career.bhs?.s||0}</span></div>
          <div className="rowbetween" style={{marginTop:4}}><span className="mini dim">逃げ/捲り/差し/マーク</span><span className="mini">{career.kimarite?.nige||0} / {career.kimarite?.makuri||0} / {career.kimarite?.sashi||0} / {career.kimarite?.mark||0}</span></div>
          {career.violationPts>0&&<div className="mini" style={{marginTop:4,color:"#ff8a73"}}>⚠ 違反点：{career.violationPts}点</div>}
        </div>
      )}

      <button className="btn primary big" style={{marginTop:16}} disabled={injured||career.trainLeft<=0} onClick={onTrain}>💪 練習する（あと{career.trainLeft}回）</button>
      <button className="btn ghost big" style={{marginTop:10}} onClick={onWatch}>🎫 観戦・車券（仮想コイン {career.coins||0}枚）</button>
    </div>
  );
}

// ─── リアルモード：レース結果 ──────────────────────────────────
function RealResultScreen({gains,onNext}){
  if(!gains)return null;
  const title=gains.gradeName||REAL_GRADE_LABEL[gains.grade];
  return(
    <div className="screen pad center">
      <div style={{width:"100%",maxWidth:420}}>
        {gains.incident&&(
          <div className="card" style={{marginBottom:10,textAlign:"center",borderColor:"#7a3030",background:"#22141a"}}>
            <div className="bold" style={{color:"#ff8a73"}}>{gains.incident.type==="crash"?"💥 落車":"⚠ 審議・失格："+(gains.incident.foulLabel||"")}</div>
            <div className="mini" style={{marginTop:4}}>
              {gains.incident.type==="crash"
                ?"接触でバランスを崩し落車。負傷のため"+gains.incident.weeks+"週の欠場が必要です。"
                :(gains.incident.foulDesc||"危険な走行と判定された")+"。違反点が加算されました（累計"+gains.incident.violationPts+"点）。"}
            </div>
          </div>
        )}
        <div className="card gold" style={{textAlign:"center"}}>
          <div className="mini dim">{title}・{gains.roundLabel}・{gains.calendarLabel}</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:40,color:gains.place===1?"#ffd34d":"#e8ecf6",marginTop:6}}>{gains.place}着</div>
          <div className="mini" style={{marginTop:4}}>上がり {gains.agari?.toFixed?gains.agari.toFixed(2):gains.agari}秒</div>
        </div>

        {!gains.eventDone?(
          <div className="card" style={{marginTop:10,textAlign:"center",borderColor:gains.place<=3?"#3a6a40":"#7a3030",background:gains.place<=3?"#12241a":"#22141a"}}>
            <div className="bold" style={{color:gains.place<=3?"#7ee08a":"#ff8a73"}}>{gains.place<=3?"勝ち上がり！！":"本線敗退…"}</div>
            <div className="mini" style={{marginTop:6}}>次は「{gains.nextRoundLabel}」</div>
          </div>
        ):(
          <div className="card" style={{marginTop:10,textAlign:"center"}}>
            <div className="mini dim">{gains.consolation?"敗者戦(順位決定戦)での確定順位":"開催 最終順位"}</div>
            <div className="bold" style={{fontSize:20,color:"#ffd34d",marginTop:2}}>{gains.finalPlace}着 確定</div>
            <div className="mini" style={{marginTop:4}}>競走得点 +{gains.pts}{gains.consolation&&<span className="dim">（敗者戦のため半額）</span>}</div>
          </div>
        )}

        <div className="card" style={{marginTop:10,textAlign:"center"}}>
          <div className="mini dim">直近平均競走得点</div>
          <div className="bold" style={{fontSize:20,color:"#ffd34d",marginTop:2}}>{gains.avgPts}点</div>
        </div>
        {gains.review&&(
          <div className="card" style={{marginTop:10,textAlign:"center",borderColor:gains.review.result==="up"?"#3a6a40":gains.review.result==="down"?"#7a3030":"#34456e",background:gains.review.result==="up"?"#12241a":gains.review.result==="down"?"#22141a":undefined}}>
            <div className="bold">📋 期末審査</div>
            <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:22,marginTop:6,color:gains.review.result==="up"?"#7ee08a":gains.review.result==="down"?"#ff8a73":"#e8ecf6"}}>
              {gains.review.result==="up"?"⬆ "+RANK_LABEL[gains.review.newRank]+"へ昇班！":gains.review.result==="down"?"⬇ "+RANK_LABEL[gains.review.newRank]+"へ降班…":"現状維持："+RANK_LABEL[gains.review.newRank]}
            </div>
            <div className="mini dim" style={{marginTop:4}}>期間平均 {gains.review.avgAtReview}点での判定</div>
          </div>
        )}
        {gains.retirement&&gains.retirement.warned&&(
          <div className="card" style={{marginTop:10,textAlign:"center",borderColor:"#7a3030",background:"#22141a"}}>
            <div className="bold" style={{color:"#ff8a73"}}>⚠ 登録消除 警告</div>
            <div className="mini" style={{marginTop:4}}>基準得点（{A3_RETIRE_THRESH}点）に届きませんでした。<span className="em">来期も届かなければ登録消除（引退）</span>となります。</div>
          </div>
        )}
        <button className="btn primary big" style={{marginTop:16}} onClick={onNext}>ホームへ戻る</button>
      </div>
    </div>
  );
}

// ─── リアルモード：引退（代謝）画面 ──────────────────────────────
function RealRetireScreen({career,onRestart}){
  return(
    <div className="screen pad center">
      <div style={{width:"100%",maxWidth:420}}>
        <div className="card" style={{textAlign:"center",borderColor:"#7a3030",background:"#22141a"}}>
          <div className="bold" style={{color:"#ff8a73",fontSize:16}}>登録消除（引退）</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:24,color:"#e8ecf6",marginTop:6}}>{career.name}</div>
          <div className="mini" style={{marginTop:6}}>A級3班の基準得点に2期連続で届かず、選手登録が消除されました。長きにわたるレース、お疲れ様でした。</div>
        </div>
        <div className="card" style={{marginTop:10}}>
          <div className="mini bold" style={{marginBottom:6}}>選手としての記録</div>
          <div className="rowbetween"><span className="mini dim">最高到達級班</span><span className="mini">{RANK_LABEL[career.bestRank||"A3"]}</span></div>
          <div className="rowbetween" style={{marginTop:4}}><span className="mini dim">通算成績</span><span className="mini">{career.rec.races}走 {career.rec.wins}勝（3着内{career.rec.podium}）</span></div>
          <div className="rowbetween" style={{marginTop:4}}><span className="mini dim">決まり手（逃/捲/差/マ）</span><span className="mini">{career.kimarite?.nige||0}/{career.kimarite?.makuri||0}/{career.kimarite?.sashi||0}/{career.kimarite?.mark||0}</span></div>
          <div className="rowbetween" style={{marginTop:4}}><span className="mini dim">B・H・S</span><span className="mini">{career.bhs?.b||0}/{career.bhs?.h||0}/{career.bhs?.s||0}</span></div>
          <div className="rowbetween" style={{marginTop:4}}><span className="mini dim">獲得賞金</span><span className="mini">{career.money}万円</span></div>
        </div>
        <button className="btn primary big" style={{marginTop:16}} onClick={onRestart}>新しい選手で再挑戦する</button>
      </div>
    </div>
  );
}

// ─── リアルモード：観戦・車券（疑似・仮想コインのみ）────────────
function RealWatchScreen({career,onCoinsChange,onBack}){
  const[field]=useState(()=>generateWatchField(pick(["F2","F1","G3"])));
  const[betId,setBetId]=useState("nisyatan");
  const[picks,setPicks]=useState([]);
  const[amount,setAmount]=useState(100);
  const[result,setResult]=useState(null); // {results,hit,payout}
  const bt=betTypeById(betId);
  const items=bt&&bt.waku
    ?Array.from(new Set(field.map(r=>wakuOf(r.car)))).sort((a,b)=>a-b)
    :field.map(r=>r.car);
  const odds=(bt&&picks.length===bt.picks)?estimateOdds(field,betId,picks):null;
  const togglePick=n=>{
    if(!bt)return;
    setPicks(p=>{
      if(p.includes(n))return p.filter(x=>x!==n);
      if(p.length>=bt.picks)return bt.ordered?[...p.slice(1),n]:[...p,n].slice(-bt.picks);
      return[...p,n];
    });
  };
  const canBet=bt&&picks.length===bt.picks&&amount>0&&(career.coins||0)>=amount&&!result;
  const doDraw=()=>{
    if(!canBet)return;
    const results=drawWatchRaceResult(field);
    const bet={betId,picks:picks.slice(),amount,odds:odds.odds};
    const afterBet=(career.coins||0)-amount;
    const {hit,payout}=settleBet({...career,coins:afterBet},bet,results);
    onCoinsChange(afterBet+payout);
    setResult({results,hit,payout,bet});
  };
  const again=()=>{setResult(null);setPicks([]);};
  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:4}}>
        <h2 className="h2" style={{margin:0}}>🎫 観戦・車券</h2>
        <button className="linkbtn" onClick={onBack}>ホームへ</button>
      </div>
      <div className="mini dim" style={{marginBottom:10}}>自分が出走しない開催を観戦し、車券を疑似体験できます。<span className="em">仮想コインのみ</span>・実際のお金は一切使いません。</div>
      <div className="card gold" style={{textAlign:"center"}}>
        <div className="mini dim">所持コイン</div>
        <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:26,color:"#ffd34d",marginTop:2}}>{career.coins||0}枚</div>
      </div>

      <div className="card" style={{marginTop:10}}>
        <div className="mini bold" style={{marginBottom:6}}>出走表</div>
        {field.map(r=>(
          <div key={r.car} className="riderrow">
            <CarChip car={r.car}/><span className="ridername">{r.name}</span>
            <span className="riderstyle">{STYLES[r.styleId].label}</span>
            <span className="mini dim">得点{r.points}</span>
          </div>
        ))}
      </div>

      {!result&&(<>
        <div className="fieldlabel" style={{margin:"14px 2px 6px"}}>賭式を選ぶ</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {BET_TYPES.map(b=>(
            <button key={b.id} className={"chipbtn "+(betId===b.id?"sel":"")} onClick={()=>{setBetId(b.id);setPicks([]);}}>{b.label}</button>
          ))}
        </div>
        <div className="mini dim" style={{margin:"6px 2px"}}>{bt?.desc}</div>

        <div className="fieldlabel" style={{margin:"12px 2px 6px"}}>{bt?.waku?"枠番":"車番"}を{bt?.picks}つ選ぶ{bt?.ordered?"（選んだ順が着順）":""}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {items.map(n=>(
            <button key={n} className={"chipbtn "+(picks.includes(n)?"sel":"")} onClick={()=>togglePick(n)}>
              {n}{bt?.ordered&&picks.includes(n)?`（${picks.indexOf(n)+1}）`:""}
            </button>
          ))}
        </div>

        {odds&&(
          <div className="card" style={{marginTop:10,textAlign:"center"}}>
            <div className="mini dim">予想オッズ</div>
            <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:24,color:"#ffd34d"}}>{odds.odds}倍</div>
          </div>
        )}

        <div className="fieldlabel" style={{margin:"12px 2px 6px"}}>賭け枚数</div>
        <div style={{display:"flex",gap:6}}>
          {[100,500,1000].map(a=>(
            <button key={a} className={"chipbtn "+(amount===a?"sel":"")} onClick={()=>setAmount(a)}>{a}枚</button>
          ))}
        </div>

        <button className="btn primary big" style={{marginTop:14}} disabled={!canBet} onClick={doDraw}>🎲 抽選する</button>
      </>)}

      {result&&(
        <div className="card" style={{marginTop:12,textAlign:"center",borderColor:result.hit?"#3a6a40":"#7a3030",background:result.hit?"#12241a":"#22141a"}}>
          <div className="bold" style={{color:result.hit?"#7ee08a":"#ff8a73"}}>{result.hit?"🎉 的中！！":"…不的中"}</div>
          <div className="mini" style={{marginTop:6}}>着順：{result.results.slice(0,3).map(r=>r.car).join(" - ")}</div>
          <div className="mini" style={{marginTop:4}}>{result.hit?`払戻 ${result.payout}枚（オッズ${result.bet.odds}倍）`:`ハズレ（${result.bet.amount}枚を失いました）`}</div>
          <button className="btn primary big" style={{marginTop:12}} onClick={again}>もう一度観戦する</button>
        </div>
      )}
    </div>
  );
}
function IntroScreen({onDone}){
  const[i,setI]=useState(0);const s=INTRO_SLIDES[i];const last=i===INTRO_SLIDES.length-1;
  return(
    <div className="screen center intro">
      <button className="skipbtn" onClick={onDone}>スキップ ▶▶</button>
      <div className="introcard" key={i}><div className="introicon">{s.icon}</div><div className="introtitle">{s.t}</div><div className="introbody">{s.b}</div></div>
      <div className="introdots">{INTRO_SLIDES.map((_,k)=><span key={k} className={"idot "+(k===i?"on":"")}/>)}</div>
      <div className="introbtns">{last?<button className="btn primary big" onClick={onDone}>選手登録へ！</button>:<button className="btn primary big" onClick={()=>setI(i+1)}>次へ ▶</button>}</div>
    </div>
  );
}

// ─── 選手作成（キャラクター選択式）─────────────────────────────
function CreateScreen({onDone}){
  const[name,setName]=useState("");const[charId,setCharId]=useState(CHARACTERS[0].id);const[region,setRegion]=useState(REGIONS[0]);
  const sel=charById(charId);
  return(
    <div className="screen pad">
      <h2 className="h2">選手登録</h2>
      <div className="card"><div className="fieldlabel">選手名</div><input className="textinput" value={name} maxLength={8} placeholder="例：速水 翔" onChange={e=>setName(e.target.value)}/></div>
      <div className="fieldlabel" style={{margin:"14px 2px 6px"}}>所属地区 <span className="mini">（同じ地区の選手とラインを組む）</span></div>
      <div className="regiongrid">{REGIONS.map(r=>(
        <button key={r} className={"regionbtn "+(region===r?"sel":"")} style={region===r?{borderColor:REGION_COLORS[r],color:REGION_COLORS[r]}:{}} onClick={()=>setRegion(r)}>
          <span className="regiondot" style={{background:REGION_COLORS[r]}}/>{r}
        </button>
      ))}</div>
      <div className="fieldlabel" style={{margin:"16px 2px 6px"}}>キャラクターを選ぶ <span className="mini">（脚質と固有スキルが決まる）</span></div>
      {CHARACTERS.map(ch=>{
        const on=charId===ch.id;
        return(
          <button key={ch.id} className={"charcard "+(on?"sel":"")} style={on?{borderColor:ch.color}:{}} onClick={()=>setCharId(ch.id)}>
            <div className="charface" style={{borderColor:ch.color,background:on?ch.color+"22":"#0d1426"}}>{ch.icon}</div>
            <div className="charbody">
              <div className="charhead">
                <span className="charname">{ch.name}</span>
                <span className="charstyle" style={{color:ch.color}}>{STYLES[ch.style].label}</span>
                {on&&<span className="selmark">✔</span>}
              </div>
              <div className="charcatch">「{ch.catch}」</div>
              <div className="charskill"><span className="charskill-icon">{ch.skill.icon}</span><span className="charskill-name" style={{color:ch.color}}>{ch.skill.name}</span><span className="charskill-desc">{ch.skill.desc}</span></div>
            </div>
          </button>
        );
      })}
      {sel&&<div className="card" style={{marginTop:6,borderColor:sel.color+"55"}}>
        <div className="mini dim">この脚質の特徴</div>
        <div className="styledesc" style={{marginTop:3}}>{STYLES[sel.style].desc}</div>
      </div>}
      <button className="btn primary big" style={{marginTop:14}} disabled={!name.trim()} onClick={()=>onDone(name.trim(),sel.style,region,charId)}>この選手でデビュー！</button>
    </div>
  );
}

// ─── 先輩あいさつ ─────────────────────────────────────────────
function SenpaiIntroScreen({career,onDone}){
  return(
    <div className="screen pad center">
      <div style={{width:"100%",maxWidth:400}}>
        <Senpai mood="smug" size="big" text={"よう、新入り。お前の指導係になった "+SENPAI_NAME+" だ。元S級S班、競輪場じゃ『鉄の漢』で通ってた。"}/>
        <div style={{height:12}}/>
        <Senpai mood="calm" text="いいか、競輪は脚だけじゃ勝てねえ。位置取り、風よけ、仕掛けどころ…全部レースで体に叩き込め。"/>
        <div style={{height:12}}/>
        <Senpai mood="angry" text={"目指すは頂点・SS班だ。半端な走りは許さねえぞ。…さあ、行くぞ "+career.name+"！"}/>
        <button className="btn primary big" style={{marginTop:18}} onClick={onDone}>「押忍！よろしくお願いします！」</button>
      </div>
    </div>
  );
}

// ─── ホーム ──────────────────────────────────────────────────
// ─── キャラクター切り替え ────────────────────────────────────
function CharSwitchScreen({career,onSelect,onSelectSkill,onBack}){
  const cur=career.charId;
  const myChar=charById(cur);
  const owned=(career.skills||[]).map(acquiredById).filter(Boolean);
  const usingCharSkill=!career.useSkill||!(career.skills||[]).includes(career.useSkill);
  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#8d9cbe",fontSize:22,cursor:"pointer"}}>←</button>
          <h2 className="h2" style={{margin:0}}>👤 キャラクター切替</h2>
        </div>
        <span className="vsrecord">解放 {unlockedCharIds(career).length}/{CHARACTERS.length}人</span>
      </div>
      <div className="mini dim" style={{margin:"0 2px 12px"}}>使うキャラを選ぶと脚質と固有スキルが切り替わる。最初に選んだキャラ以外は<span className="em">班が上がるごとに1人ずつ解放</span>されます。</div>
      {CHARACTERS.map(ch=>{
        const unlocked=isCharUnlocked(career,ch.id);
        const on=cur===ch.id;
        const needIdx=charUnlockRankIndex(career,ch.id);
        const needRank=RANKS[needIdx]||"SS";
        return(
          <div key={ch.id} className={"charcard"+(on?" sel":"")+(unlocked?"":" locked")} style={on?{borderColor:ch.color}:{}}>
            <div className="charface" style={{borderColor:unlocked?ch.color:"#3a4257",background:on?ch.color+"22":"#0d1426"}}>{unlocked?ch.icon:"🔒"}</div>
            <div className="charbody">
              <div className="charhead">
                <span className="charname">{ch.name}</span>
                <span className="charstyle" style={{color:unlocked?ch.color:"#8d9cbe"}}>{STYLES[ch.style].label}</span>
                {on&&<span className="selmark">✔ 使用中</span>}
              </div>
              <div className="charcatch">「{ch.catch}」</div>
              <div className="charskill"><span className="charskill-icon">{ch.skill.icon}</span><span className="charskill-name" style={{color:unlocked?ch.color:"#8d9cbe"}}>{ch.skill.name}</span><span className="charskill-desc">{ch.skill.desc}</span></div>
              <div style={{marginTop:8}}>
                {on?(
                  <span className="mini" style={{color:ch.color,fontWeight:700}}>現在このキャラで走っています</span>
                ):unlocked?(
                  <button className="btn primary" style={{padding:"8px 16px",fontSize:13}} onClick={()=>onSelect(ch.id)}>このキャラに切り替える</button>
                ):(
                  <span className="locktag" style={{fontSize:11,padding:"3px 10px"}}>🔒 {RANK_LABEL[needRank]}到達で解放</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {/* ── 必殺技の選択（ボス撃破・GP制覇で獲得したスキルを装備できる）── */}
      <div className="fieldlabel" style={{margin:"18px 2px 8px"}}>⚔️ 必殺技の選択 <span className="mini dim">（ボスを倒すとスキルを奪える）</span></div>
      <div className={"equipitem"+(usingCharSkill?" on":"")} style={{background:usingCharSkill?"#14251a":"#131c33",borderRadius:12,padding:"10px 12px",marginBottom:8,border:"1px solid "+(usingCharSkill?"#3a6a40":"#283655")}}>
        <span className="shopicon" style={{fontSize:22}}>{myChar?myChar.skill.icon:"❔"}</span>
        <span className="equipitem-body">
          <span className="bold mini">{myChar?("キャラ固有「"+myChar.skill.name+"」"):"キャラ固有スキル"}</span>
          <span className="shopbonus">{myChar?myChar.skill.short:"キャラを選ぶと使用できます"}</span>
        </span>
        {usingCharSkill
          ?<span className="mini" style={{color:"#7ee08a",fontWeight:700}}>装備中</span>
          :<button className="btn primary shopbuy" onClick={()=>onSelectSkill(null)}>装備する</button>}
      </div>
      {owned.length===0&&<div className="card"><div className="mini dim">まだ獲得スキルがありません。昇級ボスを倒すと、そのボスの必殺技を奪って使えるようになります。KEIRINグランプリ制覇では<span className="em">👑 王者の風格</span>を獲得！</div></div>}
      {owned.map(sk=>{
        const on=!usingCharSkill&&career.useSkill===sk.id;
        return(
          <div key={sk.id} className={"equipitem"+(on?" on":"")} style={{background:on?"#14251a":"#131c33",borderRadius:12,padding:"10px 12px",marginBottom:8,border:"1px solid "+(on?"#3a6a40":"#283655")}}>
            <span className="shopicon" style={{fontSize:22}}>{sk.icon}</span>
            <span className="equipitem-body">
              <span className="bold mini">「{sk.name}」{sk.fromBoss&&<span className="mini dim">（{BOSSES[sk.fromBoss].name}から奪取）</span>}{sk.id==="ouja"&&<span className="mini" style={{color:"#ffd34d"}}>（GP制覇の証）</span>}</span>
              <span className="shopbonus">{sk.short}</span>
            </span>
            {on
              ?<span className="mini" style={{color:"#7ee08a",fontWeight:700}}>装備中</span>
              :<button className="btn primary shopbuy" onClick={()=>onSelectSkill(sk.id)}>装備する</button>}
          </div>
        );
      })}
      <button className="btn ghost big" style={{marginTop:14}} onClick={onBack}>← ホームへ戻る</button>
    </div>
  );
}

function HomeScreen({career,onTrain,onRace,onSwitchChar,onShop,onEquip,onRanking,onVersus,onBoss,onReset}){
  const boss=career.rank!=="SS"?BOSSES[career.rank]:null;
  const myChar=charById(career.charId);
  const eqBonus=equipBonus(career);const effS=effStats(career);
  const cond=conditionInfo(career.fatigue);const req=RANK_REQ[career.rank];
  const noTrain=career.trainLeft<=0;const[cr,setCr]=useState(false);
  return(
    <div className="screen pad">
      <div className="homeheader">
        <div><div className="homename">{career.name}</div>
          <div className="homerank">
            <span className="rankbadge">{RANK_LABEL[career.rank]}</span>
            <span className="stylebadge">{STYLES[career.style].label}</span>
            <span className="regionbadge" style={{color:REGION_COLORS[career.region]}}>{career.region}</span>
          </div>
        </div>
        <div className="condbox" style={{borderColor:cond.color}}><div className="condicon">{cond.icon}</div><div className="condlabel" style={{color:cond.color}}>{cond.label}</div></div>
      </div>
      <div className="card">
        <StatBar label="パワー" value={effS.pow} color="#f06a6a" bonus={eqBonus.pow}/>
        <StatBar label="スピード" value={effS.spd} color="#7ee0ff" bonus={eqBonus.spd}/>
        <StatBar label="スタミナ" value={effS.sta} color="#7ee08a" bonus={eqBonus.sta}/>
        <StatBar label="テクニック" value={effS.tec} color="#ba93f5" bonus={eqBonus.tec}/>
      </div>
      {career.rank!=="SS"?(
        <div className="card">
          <div className="rowbetween">
            <span className="mini">SS班への道</span>
            <span style={{display:"flex",gap:6,alignItems:"center"}}>
              {(career.winStreak||0)>=2&&<span className="streakbadge">🔥{career.winStreak}連勝</span>}
              <span className="mini bold">{career.points}/{req}</span>
            </span>
          </div>
          <div className="progbg"><div className="progfill" style={{width:clamp((career.points/req)*100,0,100)+"%"}}/></div>
          {career.bossReady?(
            <button className="btn danger big pulse" style={{marginTop:10}} onClick={onBoss}>👹 昇級ボス戦：{boss.name}に挑む！</button>
          ):(
            <div className="mini dim" style={{marginTop:6}}>規定Pt到達 <span className="em">または9連勝</span>で門番「{boss.name}」への挑戦権を獲得。倒せば{RANK_LABEL[RANKS[RANKS.indexOf(career.rank)+1]]}へ昇級！<span className="orange">6着以下はPtマイナス</span>に注意。</div>
          )}
        </div>
      ):(
        <div className="card gold"><div className="bold">👑 S級S班 — 競輪界の頂点9人に到達！</div><div className="mini" style={{marginTop:4}}>{(career.rec.gp||0)>=1?"グランプリは制覇済み。以後の本番は👿ハードモード：敵は極限まで強く、スキルも使ってくる！":"本番レースはKEIRINグランプリ（一度きりの大一番）。優勝賞金1億円超の夢舞台だ！"}</div></div>
      )}
      <div className="card">
        <div className="rowbetween"><span>💰 獲得賞金</span><span className="money">{career.money}万円</span></div>
        <div className="rowbetween" style={{marginTop:6}}><span className="mini dim">通算成績</span><span className="mini">{career.rec.races}走 {career.rec.wins}勝（3着内 {career.rec.podium}）{career.rec.gp>0?" / GP制覇"+career.rec.gp:""}</span></div>
        <div className="rowbetween" style={{marginTop:6}}><span className="mini dim">練習できる回数</span><span className={"mini bold "+(noTrain?"orange":"green")}>あと{career.trainLeft}回{careerPerks(career).train>0&&<span className="em">（愛車効果+{careerPerks(career).train}）</span>}</span></div>
      </div>
      <button className="btn primary big" disabled={noTrain} onClick={onTrain}>💪 練習する{noTrain?"（今期は終了）":"（あと"+career.trainLeft+"回）"}</button>
      <div className="btnrow">
        <button className="btn ghost half" onClick={onSwitchChar}>{myChar?myChar.icon:"👤"} キャラ切替<br/><span className="mini dim">解放 {unlockedCharIds(career).length}/{CHARACTERS.length}人 ・{myChar?myChar.name:"未選択"}</span></button>
        <button className="btn race half" onClick={onRace}>🏁 本番レース<br/><span className="mini">{raceGradeLabel(career)}・得点がかかる</span></button>
      </div>
      <div className="btnrow">
        <button className="btn ghost half" onClick={onShop}>🛒 ショップ<br/><span className="mini dim">賞金で装備・乗り物を購入</span></button>
        <button className="btn ghost half" onClick={onEquip}>🎽 装備<br/><span className="mini dim">パーツを着脱してマシンを組む</span></button>
      </div>
      <div className="btnrow">
        <button className="btn ghost half" onClick={onRanking}>🏁 全国ランキング<br/><span className="mini dim">{career.bestAgari!=null?"自己ベスト "+career.bestAgari.toFixed(2)+"秒":"上がりタイムで競う"}</span></button>
        <button className="btn ghost half" onClick={onVersus}>🆚 オンライン対戦<br/><span className="mini dim">全国のプレイヤーと勝負</span></button>
      </div>
      <div style={{marginTop:24,textAlign:"center"}}>
        {!cr?<button className="linkbtn" onClick={()=>setCr(true)}>データを最初から…</button>:(
          <div><div className="mini" style={{marginBottom:6}}>本当に削除しますか？</div>
            <button className="btn danger" onClick={onReset}>削除する</button>
            <button className="btn ghost" style={{marginLeft:8}} onClick={()=>setCr(false)}>やめる</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 練習 ────────────────────────────────────────────────────
function TrainingScreen({career,onPick,onBack}){
  const[result,setResult]=useState(null);const cond=conditionInfo(career.fatigue);
  return(
    <div className="screen pad">
      <div className="rowbetween"><h2 className="h2">練習</h2><span className="mini" style={{color:cond.color}}>{cond.icon} {cond.label}・残り{career.trainLeft}回</span></div>
      <div className="mini dim" style={{margin:"0 2px 12px"}}>練習で疲労が溜まり体調が落ちる。休養も大事な仕事。体調はレースに影響する。</div>
      {result&&<div className={"card trainresult "+(result.crit?"gold":"")}><div className="bold">{result.text}</div>{result.sub&&<div className="mini" style={{marginTop:4}}>{result.sub}</div>}</div>}
      {result&&<div style={{marginBottom:12}}><Senpai mood={result.senpai.m} text={result.senpai.t}/></div>}
      {!result&&TRAININGS.map(t=>(
        <button key={t.id} className="traincard" onClick={()=>setResult(onPick(t.id))}>
          <span className="trainicon">{t.icon}</span>
          <span className="trainbody"><span className="bold">{t.name}</span><span className="mini dim">{t.desc}</span></span>
        </button>
      ))}
      {result&&<button className="btn primary big" onClick={onBack}>ホームへ戻る</button>}
    </div>
  );
}

// ─── 装備 ────────────────────────────────────────────────────
function EquipScreen({career,onEquip,onEquipAll,onHardItem,onBack}){
  const[openSlot,setOpenSlot]=useState(null);
  const[showAll,setShowAll]=useState(false); // 全パーツ表示（未所持を含むパーツ図鑑）
  const eq=career.equipped||{};
  const bonus=equipBonus(career);
  const eff=effStats(career);
  const sets=equipSets(career);
  const totalBonus=bonus.pow+bonus.spd+bonus.sta+bonus.tec;
  const ownedParts=SHOP_ITEMS.filter(i=>i.slot&&(career.owned||[]).includes(i.id));
  const statRow=(key,color)=>(
    <div className="statrow" key={key}>
      <span className="statlabel">{STAT_LABEL[key]}</span>
      <div className="statbarbg"><div className="statbarfill" style={{width:clamp(eff[key],0,500)/5+"%",background:color}}/></div>
      <span className="statval">{career.stats[key]}{bonus[key]>0&&<span className="equipplus">+{bonus[key]}</span>}</span>
    </div>
  );
  // 装備候補の差分プレビュー（今のスロット装備と比べて各ステがどう変わるか）
  const diffOf=(slotId,it)=>{
    const cur=itemRawBonus(itemById(eq[slotId]));
    const nb=itemRawBonus(it);
    return["pow","spd","sta","tec"].map(k=>({k,d:nb[k]-cur[k]})).filter(x=>x.d!==0);
  };
  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#8d9cbe",fontSize:22,cursor:"pointer"}}>←</button>
          <h2 className="h2" style={{margin:0}}>🎽 装備</h2>
        </div>
        {totalBonus>0&&<span className="vsrecord" style={{color:"#7ee08a"}}>装備効果 +{totalBonus}</span>}
      </div>
      <div className="mini dim" style={{margin:"0 2px 10px"}}>パーツはここで着脱できる。同じ<span className="em">シリーズ</span>を揃えるとセット効果が発動！</div>
      <div className="card">
        {statRow("pow","#f06a6a")}
        {statRow("spd","#7ee0ff")}
        {statRow("sta","#7ee08a")}
        {statRow("tec","#ba93f5")}
        <div className="mini dim" style={{marginTop:6,textAlign:"right"}}>数字＝素の実力 / <span className="equipplus">+N</span>＝装備・セット効果</div>
      </div>

      {/* ── セット効果パネル ── */}
      <div className="card" style={{padding:"11px 13px"}}>
        <div className="rowbetween" style={{marginBottom:7}}>
          <span className="mini bold">シリーズ セット効果</span>
          <span className="mini dim">同シリーズ複数装備で発動</span>
        </div>
        <div className="setgrid">
          {sets.map(s=>{
            const nextStep=s.steps.find(([need])=>s.count<need);
            return(
              <div key={s.id} className={"setchip"+(s.active?" on":"")} style={{borderColor:s.color+(s.active?"":"44"),color:s.active?s.color:"#8d9cbe"}}>
                <span className="setchip-name">{s.label}</span>
                <span className="setchip-cnt">{s.count}{nextStep?"/"+nextStep[0]:""}</span>
                {s.active&&<span className="setchip-fx">{Object.keys(s.active.b).map(k=>"+"+s.active.b[k]+STAT_LABEL[k].slice(0,2)).join(" ")}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 特別アイテム（ハードモード周回報酬・1つだけ装着可）── */}
      {(career.hardItems||[]).length>0&&(
        <div className="card" style={{borderColor:"#7a3030"}}>
          <div className="rowbetween" style={{marginBottom:7}}>
            <span className="mini bold" style={{color:"#ff8a73"}}>🎁 特別アイテム（ハード報酬 {(career.hardItems||[]).length}/30）</span>
            <span className="mini dim">1つだけ装着可</span>
          </div>
          <div className={"equipitem"+(!career.hardItemUse?" on":"")} style={{borderRadius:9,padding:"7px 8px"}}>
            <span className="shopicon" style={{fontSize:20}}>⭕</span>
            <span className="equipitem-body"><span className="bold mini">装着なし</span></span>
            {!career.hardItemUse
              ?<span className="mini" style={{color:"#7ee08a",fontWeight:700}}>選択中</span>
              :<button className="btn ghost shopbuy" onClick={()=>onHardItem(null)}>外す</button>}
          </div>
          {(career.hardItems||[]).map(id=>{
            const it=HARD_REWARDS.find(x=>x.id===id);if(!it)return null;
            const on=career.hardItemUse===id;
            return(
              <div key={id} className={"equipitem"+(on?" on":"")} style={{borderRadius:9,padding:"7px 8px"}}>
                <span className="shopicon" style={{fontSize:20}}>{it.icon}</span>
                <span className="equipitem-body">
                  <span className="bold mini">{it.name}<span className="mini dim">（{it.at}勝報酬）</span></span>
                  <span className="shopbonus">{it.desc}</span>
                </span>
                {on
                  ?<span className="mini" style={{color:"#7ee08a",fontWeight:700}}>装着中</span>
                  :<button className="btn primary shopbuy" onClick={()=>onHardItem(id)}>装着</button>}
              </div>
            );
          })}
        </div>
      )}

      <div className="rowbetween" style={{margin:"2px 2px 8px"}}>
        <span className="mini dim">所持パーツ {ownedParts.length}/{SHOP_ITEMS.filter(i=>i.slot).length}種</span>
        <div style={{display:"flex",gap:6}}>
          <button className="btn ghost" style={{padding:"7px 12px",fontSize:12,borderColor:showAll?"#7ee0ff":"#34456e",color:showAll?"#7ee0ff":"#e8ecf6"}} onClick={()=>setShowAll(v=>!v)}>{showAll?"📖 全パーツ表示中":"📖 全パーツを見る"}</button>
          <button className="btn ghost" style={{padding:"7px 12px",fontSize:12}} onClick={()=>onEquipAll(buildBestEquip(career))}>⚡ おまかせ最強装備</button>
        </div>
      </div>

      {EQUIP_SLOTS.map(slot=>{
        const equippedItem=itemById(eq[slot.id]);
        const ownedForSlot=SHOP_ITEMS.filter(i=>i.slot===slot.id&&(career.owned||[]).includes(i.id));
        const open=openSlot===slot.id;
        return(
          <div key={slot.id} className={"equipslot "+(open?"open":"")}>
            <button className="equipslot-head" onClick={()=>setOpenSlot(open?null:slot.id)}>
              <span className="equipslot-icon">{slot.icon}</span>
              <span className="equipslot-body">
                <span className="equipslot-label">{slot.label}{ownedForSlot.length>0&&<span className="dim mini"> ({ownedForSlot.length})</span>}</span>
                {equippedItem
                  ?<span className="equipslot-item">{equippedItem.icon} {equippedItem.name}<span className="equipslot-bonus"> +{equippedItem.bonus}{STAT_LABEL[equippedItem.stat]}{equippedItem.stat2?` +${equippedItem.bonus2}${STAT_LABEL[equippedItem.stat2]}`:""}</span></span>
                  :<span className="equipslot-empty">未装備</span>}
              </span>
              <span className="equipslot-arrow">{open?"▲":"▼"}</span>
            </button>
            {open&&(
              <div className="equipslot-list">
                {!showAll&&ownedForSlot.length===0&&<div className="mini dim" style={{padding:"8px 4px"}}>このスロットのパーツは未所持。「📖 全パーツを見る」で入手先を確認できます。</div>}
                {showAll&&SHOP_ITEMS.filter(i=>i.slot===slot.id&&!(career.owned||[]).includes(i.id)).map(it=>{
                  const locked=!rankGte(career.rank,itemUnlockRank(it));
                  return(
                    <div key={it.id} className="equipitem" style={{opacity:.55}}>
                      <span className="shopicon" style={{fontSize:22,filter:"grayscale(.7)"}}>{it.icon}</span>
                      <span className="equipitem-body">
                        <span className="bold mini">
                          {it.tier&&<span className="tierstars">{"★".repeat(it.tier)}</span>}
                          {it.name}
                          {it.series&&<span className="seriestag" style={{color:SERIES_DEF[it.series].color}}>{SERIES_DEF[it.series].label}</span>}
                        </span>
                        <span className="shopbonus">+{it.bonus} {STAT_LABEL[it.stat]}{it.stat2?` / +${it.bonus2} ${STAT_LABEL[it.stat2]}`:""}{it.stat3?` / +${it.bonus3} ${STAT_LABEL[it.stat3]}`:""}{it.stat4?` / +${it.bonus4} ${STAT_LABEL[it.stat4]}`:""}</span>
                        <span className="mini dim">{locked?"🔒 "+RANK_LABEL[itemUnlockRank(it)]+"で解放・":""}未所持 💰{it.price}万円（ショップ）</span>
                      </span>
                    </div>
                  );
                })}
                {ownedForSlot.map(it=>{
                  const isEq=eq[slot.id]===it.id;
                  const diffs=isEq?[]:diffOf(slot.id,it);
                  return(
                    <div key={it.id} className={"equipitem "+(isEq?"on":"")}>
                      <span className="shopicon" style={{fontSize:22}}>{it.icon}</span>
                      <span className="equipitem-body">
                        <span className="bold mini">
                          {it.tier&&<span className="tierstars">{"★".repeat(it.tier)}</span>}
                          {it.name}
                          {it.series&&<span className="seriestag" style={{color:SERIES_DEF[it.series].color}}>{SERIES_DEF[it.series].label}</span>}
                        </span>
                        <span className="shopbonus">+{it.bonus} {STAT_LABEL[it.stat]}{it.stat2?` / +${it.bonus2} ${STAT_LABEL[it.stat2]}`:""}{it.stat3?` / +${it.bonus3} ${STAT_LABEL[it.stat3]}`:""}{it.stat4?` / +${it.bonus4} ${STAT_LABEL[it.stat4]}`:""}</span>
                        {diffs.length>0&&<span className="equipdiff">装備すると: {diffs.map(x=>(
                          <span key={x.k} className={x.d>0?"diffup":"diffdown"}>{STAT_LABEL[x.k].slice(0,3)}{x.d>0?"+"+x.d+"↑":x.d+"↓"} </span>
                        ))}</span>}
                      </span>
                      {isEq
                        ?<button className="btn ghost shopbuy" onClick={()=>onEquip(slot.id,null)}>外す</button>
                        :<button className="btn primary shopbuy" onClick={()=>onEquip(slot.id,it.id)}>装備する</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ショップ ─────────────────────────────────────────────────
function ShopScreen({career,onBuy,onBack}){
  const[cat,setCat]=useState("parts");
  const cats=[{id:"parts",label:"自転車パーツ",icon:"⚙️"},{id:"supply",label:"サプリ・ケア",icon:"🥤"},{id:"fashion",label:"服・ファッション",icon:"👕"},{id:"car",label:"乗り物",icon:"🚗"}];
  const today=React.useMemo(()=>shopToday(daySeed()),[]);
  const items=SHOP_ITEMS.filter(i=>i.cat===cat);
  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#8d9cbe",fontSize:22,cursor:"pointer"}}>←</button>
          <h2 className="h2" style={{margin:0}}>ショップ</h2>
        </div>
        <span className="money">💰 {career.money}万円</span>
      </div>
      <div className="mini dim" style={{margin:"0 2px 10px"}}>🔄 品揃えは毎日入れ替わります。⭐の本日の特価品はお買い得！</div>
      <div className="catbar">{cats.map(c=><button key={c.id} className={"catbtn "+(cat===c.id?"sel":"")} onClick={()=>setCat(c.id)}>{c.icon} {c.label}</button>)}</div>
      {items.map(item=>{
        const owned=item.cat!=="supply"&&(career.owned||[]).includes(item.id);
        const st=today[item.id]||{inStock:true,deal:false};
        const price=dealPrice(item,today);
        const can=career.money>=price;
        const unlockRank=itemUnlockRank(item);
        const locked=!owned&&!rankGte(career.rank,unlockRank);
        const avail=owned||st.inStock;
        return(
          <div key={item.id} className={"shopitem "+(owned?"owned":"")+(!avail&&!locked?" soldout":"")+(locked?" locked":"")+(st.deal&&!owned&&!locked?" deal":"")}>
            <div className="shopicon">{item.icon}</div>
            <div className="shopbody">
              <div className="shopname">{locked&&<span className="locktag">🔒{RANK_LABEL[unlockRank]}</span>}{st.deal&&!owned&&!locked&&<span className="dealtag">⭐特価</span>}{item.slot&&<span className="slottag">{EQUIP_SLOTS.find(s=>s.id===item.slot).label}</span>}{item.tier&&<span className="tierstars">{"★".repeat(item.tier)}</span>}{item.name}{owned&&" ✓"}</div>
              <div className="shopdesc">{item.desc}</div>
              {item.stat&&<div className="shopbonus">+{item.bonus} {STAT_LABEL[item.stat]}{item.stat2?` / +${item.bonus2} ${STAT_LABEL[item.stat2]}`:""}{item.series&&<span className="seriestag" style={{color:SERIES_DEF[item.series].color}}>{SERIES_DEF[item.series].label}</span>}</div>}
              {perkText(item)&&<div className="shopbonus" style={{color:"#ffd34d"}}>🎁 {perkText(item)}</div>}
            </div>
            <div className="shopright">
              {st.deal&&!owned?<div className="shopprice"><span className="oldprice">{item.price}</span> {price}万円</div>:<div className="shopprice">{item.price}万円</div>}
              {owned?<div className="shopowned">購入済</div>:locked?<div className="shopsoldout">🔒未解放</div>:!st.inStock?<div className="shopsoldout">明日入荷</div>:<button className={"btn "+(can?"primary":"ghost")+" shopbuy"} disabled={!can} onClick={()=>onBuy(item,price)}>{can?"購入":"足りない"}</button>}
            </div>
          </div>
        );
      })}
      <button className="btn ghost big" style={{marginTop:14}} onClick={onBack}>← ホームへ戻る</button>
    </div>
  );
}

// ─── 全国ランキング ──────────────────────────────────────────
function RankingScreen({career,onBack}){
  const best=career.bestAgari!=null?career.bestAgari:null;
  const myUid=uidOf(career);
  const[entries,setEntries]=useState(null);
  useEffect(()=>{let on=true;(async()=>{const e=await loadRanking();if(on)setEntries(e);})();return()=>{on=false;};},[]);

  const list=entries?buildBoard(entries,myUid,career):(best!=null?[{name:career.name,region:career.region,time:best,rank:career.rank,isP:true}]:[]);
  const myIdx=list.findIndex(e=>e.isP);
  const rank=myIdx>=0?myIdx+1:null;
  const total=list.length;
  let rows=[];
  if(myIdx<0){rows=list.slice(0,20).map((e,i)=>({e,i}));}
  else{
    const top=list.slice(0,8).map((e,i)=>({e,i}));
    const around=[];
    for(let i=Math.max(8,myIdx-3);i<=Math.min(list.length-1,myIdx+3);i++)around.push({e:list[i],i});
    const seen=new Set(top.map(r=>r.i));
    rows=[...top];
    if(around.length&&around[0].i>8)rows.push({gap:true});
    around.forEach(r=>{if(!seen.has(r.i))rows.push(r);});
  }
  const onlyMe=entries&&total<=1;
  return(
    <div className="screen pad">
      <div className="rowbetween">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#8d9cbe",fontSize:22,cursor:"pointer"}}>←</button>
          <h2 className="h2" style={{margin:0}}>🏁 全国ランキング</h2>
        </div>
      </div>
      <div className="mini dim" style={{margin:"0 2px 12px"}}>ラスト200mの「上がりタイム」を全国のプレイヤーと競う（小さいほど速い）。本番レースであなたのベストが更新され、記録が共有されます。</div>

      <div className="rankhero">
        <div>
          <div className="mini dim">あなたの自己ベスト</div>
          <div className="rankbig">{best!=null?best.toFixed(2):"--.--"}<span className="ranksec">秒</span></div>
        </div>
        <div style={{textAlign:"right"}}>
          <div className="mini dim">現在の順位</div>
          <div className="rankpos">{rank!=null?rank:"-"}<span className="ranksec">位</span></div>
          <div className="mini dim">/ {total||"-"}人中</div>
        </div>
      </div>

      {entries===null&&<div className="card"><div className="mini dim">ランキングを読み込み中…</div></div>}
      {best==null&&<div className="card"><div className="mini">まだ記録がありません。本番レースを走って、最初の上がりタイムを刻もう！</div></div>}
      {onlyMe&&best!=null&&<div className="card"><div className="mini">🥇 現在あなたがトップ！このアプリを<span className="em">公開</span>して友達が遊ぶと、記録が共有されてランキングで競えます。</div></div>}

      {list.length>0&&(
        <div className="card" style={{padding:"6px 4px"}}>
          {rows.map((r,k)=>r.gap?(
            <div key={"gap"+k} className="rankgap">⋮</div>
          ):(
            <div key={r.i} className={"rankrow"+(r.e.isP?" me":"")}>
              <span className="rankno">{r.i+1}</span>
              <span className="rankmedal">{r.i===0?"🥇":r.i===1?"🥈":r.i===2?"🥉":""}</span>
              <span className="rankname">{r.e.name}{r.e.isP?"（あなた）":""}</span>
              <span className="rankbadge2">{RANK_LABEL[r.e.rank]||""}</span>
              <span className="ranktime">{r.e.time.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="bold mini" style={{marginBottom:6}}>⏱ 上がりタイムの決まり方</div>
        <div className="mini dim" style={{lineHeight:1.8}}>スピード・パワー・スタミナ・テクニック（位置取り）の総合力に加え、<span className="em">仕掛けるタイミング</span>と<span className="em">スパートの連打</span>で変動。風よけを活かして脚を温存し、絶妙なタイミングで全力連打すると上がりが伸びる。理論上の限界は約6.5秒。</div>
      </div>
      <button className="btn ghost big" onClick={onBack}>ホームへ戻る</button>
    </div>
  );
}

// ─── 出走表 ──────────────────────────────────────────────────
function EntryScreen({career,ctx,mode,onStart,onBack,showTip,onTipClose,onGearChange}){
  const[strat,setStrat]=useState(null);
  const[gear,setGear]=useState(career.gearId||"g370"); // P6：ギア倍数（リアルモードのみ使用）
  const so=strat?STRATS.find(x=>x.id===strat):null;const solo=so&&so.slot<0;
  const isVs=mode==="versus";const isMock=mode==="mock";const isBoss=mode==="boss";
  const boss=isBoss?BOSSES[career.rank]:null;
  const renderRow=r=>(
    <div key={r.car} className={"riderrow "+(r.isP?"me":r.isOpp?"opp":"")}>
      <CarChip car={r.car}/><span className="ridername">{r.name}{r.isP?"（あなた）":r.isBoss?" 👹ボス":r.isOpp?" 🆚対戦相手":""}</span>
      <span className="riderstyle">{STYLES[r.styleId].label}</span>
      <span className="riderstars">{"★".repeat(starsOf(r.stats))}{"☆".repeat(5-starsOf(r.stats))}</span>
    </div>
  );
  const title=isBoss?"👹 昇級ボス戦 出走表":isVs?"🆚 オンライン対戦 出走表":isMock?"🚲 模擬レース 出走表":"🏁 "+raceGradeLabel(career,ctx)+" 出走表";
  return(
    <div className="screen pad">
      <h2 className="h2">{title}</h2>
      {isBoss&&boss&&(
        <div className="card" style={{borderColor:"#b03030",background:"#1d1014"}}>
          <div className="rowbetween">
            <div><span style={{fontSize:28}}>{boss.icon}</span> <span className="bold">{boss.name}</span><span className="mini dim">（{boss.title}）</span></div>
            <span className="riderstars">{"★".repeat(starsOf(boss.stats))}</span>
          </div>
          <div className="mini" style={{marginTop:6,color:"#ff9a8a"}}>「{boss.quote}」</div>
          <div className="mini dim" style={{marginTop:6}}>この男より前でゴールすれば昇級。負けても挑戦権は失わない。</div>
          {boss.skill&&(
            <div style={{marginTop:8,background:"#2a0f12",border:"1px solid #7a3030",borderRadius:10,padding:"9px 11px"}}>
              <div className="mini" style={{color:"#ff8a73",fontWeight:800}}>{boss.skill.icon} ボススキル「{boss.skill.name}」</div>
              <div className="mini" style={{marginTop:3,color:"#e8c8c0"}}>{boss.skill.desc}</div>
              <div className="mini" style={{marginTop:5,color:"#ffd34d"}}>💡 対策：{boss.skill.counter}</div>
            </div>
          )}
        </div>
      )}
      <div className="mini dim" style={{margin:"0 2px 10px"}}>{isBoss?"👹が昇級を賭けた相手。ヤツより前でゴールせよ！":isVs?"🆚マークが対戦相手。本編と同じ形式のレースだ。相手より前でゴールせよ！":"同じ地区の選手は「ライン」を組んで協力。展開を予想しよう！"}</div>
      {!isBoss&&!isVs&&(()=>{
        // 並び予想（P3）：実式のライン表記「135 246 79」（単騎は×番）
        const parts=ctx.lines.map(ln=>{
          let rows=ln.aiRiders.slice();if(ln.isPlayerLine&&so&&so.slot>=0)rows.splice(so.slot,0,ctx.player);
          return rows.map(r=>r.car).join("");
        });
        if(solo)parts.push("×"+ctx.player.car);
        return(<div className="mini dim" style={{margin:"0 2px 12px",letterSpacing:1}}>📋 並び予想：<span className="bold" style={{color:"#e8ecf6"}}>{parts.join("　")}</span></div>);
      })()}
      {ctx.hardMode&&(
        <div className="card" style={{borderColor:"#b03030",background:"#1d1014"}}>
          <div className="bold" style={{color:"#ff8a73"}}>👿 ハードモード</div>
          <div className="mini" style={{marginTop:4}}>グランプリを制した者だけが立てる修羅の道。敵は極限まで強化され、<span className="em">全員が必殺スキルを使ってくる</span>。王者の力を見せつけろ！</div>
        </div>
      )}
      {ctx.lines.map((ln,li)=>{
        let rows=ln.aiRiders.slice();if(ln.isPlayerLine&&so&&so.slot>=0)rows.splice(so.slot,0,ctx.player);
        return(
          <div key={li} className="linegroup" style={{borderColor:(REGION_COLORS[ln.region]||"#888")+"88"}}>
            <div className="linehead" style={{color:REGION_COLORS[ln.region]||"#aaa"}}>{ln.region}ライン{ln.isPlayerLine?"（あなたの地区）":""}</div>
            {rows.map(renderRow)}
          </div>
        );
      })}
      {solo&&<div className="linegroup" style={{borderColor:"#ffd34d88",background:"#1a1608"}}><div className="linehead" style={{color:"#ffd34d"}}>単騎（ラインを離れて勝負）</div>{renderRow(ctx.player)}</div>}
      <div className="fieldlabel" style={{margin:"16px 2px 6px"}}>作戦を選ぶ</div>
      {STRATS.map(s=>(
        <button key={s.id} className={"stylecard "+(strat===s.id?"sel":"")} onClick={()=>setStrat(s.id)}>
          <div className="stylehead"><span className="stylename">{s.label}</span>{strat===s.id&&<span className="selmark">✔ 選択中</span>}</div>
          <div className="styledesc">{s.desc}</div><div className="strathint">💡 {s.hint}</div>
        </button>
      ))}
      {/* ── P6：ギア倍数選択（リアルモードのみ）── */}
      {career.mode==="real"&&(
        <>
          <div className="fieldlabel" style={{margin:"16px 2px 6px"}}>ギアを選ぶ <span className="mini dim">（最高速↔加速のトレードオフ）</span></div>
          {GEAR_OPTIONS.map(g=>(
            <button key={g.id} className={"stylecard "+(gear===g.id?"sel":"")} onClick={()=>{setGear(g.id);ctx.gearId=g.id;if(onGearChange)onGearChange(g.id);}}>
              <div className="stylehead"><span className="stylename">{g.label}</span>{gear===g.id&&<span className="selmark">✔ 選択中</span>}</div>
              <div className="styledesc">{g.desc}</div>
            </button>
          ))}
        </>
      )}
      <button className="btn primary big pulse" style={{marginTop:14}} disabled={!strat} onClick={()=>onStart(STRATS.find(x=>x.id===strat))}>{isBoss?"👹 決戦スタート！！":isVs?"対戦スタート！":isMock?"スタート！":"出走する！"}</button>
      <button className="btn ghost big" style={{marginTop:10}} onClick={onBack}>{isBoss?"出直す":isVs?"対戦をやめる":"ホームへ戻る"}</button>
      {showTip&&(<div className="overlay"><div className="tutcard">
        <div className="tuttitle">📋 出走表の見方</div>
        <div className="tutbody">選手の番号と色は全国共通（1白・2黒・3赤…）。「脚質」は戦い方のタイプで、同じ地区の選手は<span className="em">ライン</span>を組んで前後に並びます。先頭は風を受ける代わりに主導権を握り、後ろは風よけで脚を溜める——これが競輪の基本構造！</div>
        <div className="tutunlock">📖 覚えておこう：ライン／脚質／車番と色</div>
        <button className="btn primary big" onClick={onTipClose}>なるほど！</button>
      </div></div>)}
    </div>
  );
}

// ─── レースScreen ────────────────────────────────────────────
function RaceScreen({ctx,career,strategy,mode,onFinish}){
  const isMock=mode!=="real";const isVs=mode==="versus";
  const cvsRef=useRef(null),wrapRef=useRef(null),simRef=useRef(null);
  const intentRef=useRef("keep"),tapsRef=useRef([]),finishedRef=useRef(false);
  const[phase,setPhase]=useState("pack");
  const[banner,setBanner]=useState(null);
  const[hud,setHud]=useState({sta:1,tired:false,draft:false});
  const[tut,setTut]=useState(null);
  const[tapFx,setTapFx]=useState(0);
  const[feed,setFeed]=useState([]);
  const[skillCut,setSkillCut]=useState(null);     // カットイン演出 {name,icon,id}
  const[skillState,setSkillState]=useState({has:false,active:false,used:false});
  const skillCutTimer=useRef(null);
  const myChar=charById(career.charId);            // 選択中キャラ（旧データはnull）
  const mySkill=careerSkill(career);               // 装備中の必殺技（獲得スキル or キャラ固有）
  const mySkillColor=myChar?myChar.color:"#ffd34d";
  const tutorial=!career.tutorialDone&&!isMock;

  useEffect(()=>{
    bgm.start(ctx.isGP?"gp":(mode==="boss"||ctx.hardMode)?"boss":"race");
    const sim=createSim(ctx,career,strategy,tutorial);
    simRef.current=sim;
    const canvas=cvsRef.current;
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const resize=()=>{
      const w=wrapRef.current?wrapRef.current.clientWidth:360;
      const h=Math.min(286,Math.max(228,w*0.64));
      canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+"px";canvas.style.height=h+"px";
    };
    resize();window.addEventListener("resize",resize);
    let raf=0,last=performance.now(),bTimer=null;
    const hudTimer=setInterval(()=>{const p=sim.riders.find(r=>r.isP);setHud({sta:p.sta/p.staMax,tired:p.tired,draft:p.draft});
      if(p.skill)setSkillState({has:true,active:p.skillActive,used:p.skillUsed>=p.skill.uses});},110);
    const loop=now=>{
      const rdt=Math.min(0.05,(now-last)/1000);last=now;
      tapsRef.current=tapsRef.current.filter(t=>now-t<850);
      sim.playerThrottle=Math.min(1,tapsRef.current.length/6);
      sim.intent=intentRef.current;
      if(!sim.paused){let adv=rdt*calcTS(sim);while(adv>0){const st=Math.min(adv,1/45);stepSim(sim,st);adv-=st;}}
      if(sim.shake>0)sim.shake=Math.max(0,sim.shake-rdt*14);
      while(sim.events.length){
        const e=sim.events.shift();
        if(e.type==="banner"){setBanner({text:e.text,sub:e.sub,id:Math.random()});if(bTimer)clearTimeout(bTimer);bTimer=setTimeout(()=>setBanner(null),2300);}
        else if(e.type==="phase")setPhase(e.v);
        else if(e.type==="bell")bellSound();
        else if(e.type==="comment")setFeed([{id:Math.random(),text:e.text}]); // 実況は最新の1行のみ表示
        else if(e.type==="skill"){setSkillCut({name:e.name,icon:e.icon,hostile:!!e.hostile,id:Math.random()});if(skillCutTimer.current)clearTimeout(skillCutTimer.current);skillCutTimer.current=setTimeout(()=>setSkillCut(null),1500);e.hostile?beep(180,0.35,0.1,"sawtooth"):spurtSound();}
        else if(e.type==="tut"){sim.paused=true;setTut(e.step);}
      }
      drawRaceView(canvas,sim,dpr);
      if(sim.done&&!finishedRef.current){finishedRef.current=true;bgm.start("victory");setTimeout(()=>onFinish(sim.results.map(r=>({car:r.car,name:r.name,styleId:r.styleId,region:r.region,isP:r.isP,isOpp:r.isOpp,isBoss:r.isBoss,isBot:r.isBot,place:r.place,stats:r.stats,raceStats:r.raceStats,dnf:r.dnf,incident:r.incident,foulKind:r.foulKind})),{draftSec:sim.tele.draftSec,runSec:sim.tele.runSec,spurtRem:sim.tele.spurtRem,tired:sim.tele.tired,mashSum:sim.tele.mashSum,mashTicks:sim.tele.mashTicks}),1600);}
      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf);clearInterval(hudTimer);if(bTimer)clearTimeout(bTimer);if(skillCutTimer.current)clearTimeout(skillCutTimer.current);window.removeEventListener("resize",resize);};
  },[]);

  const closeTut=()=>{if(simRef.current)simRef.current.paused=false;setTut(null);};
  const doSpurt=()=>{const sim=simRef.current;const p=sim.riders.find(r=>r.isP);if(p.state==="pack"){p.state="spurt";sim.tele.spurtRem=sim.total-p.d;setPhase("spurt");spurtSound();sim.shake=5;if(tutorial&&!sim.flags.tutSpurt){sim.flags.tutSpurt=true;sim.events.push({type:"tut",step:"spurt"});}}};
  // 手動スキル発動：スパート中(自力で踏んでいる状態)にのみ許可
  const doSkill=()=>{const sim=simRef.current;if(!sim)return;const p=sim.riders.find(r=>r.isP);if(p&&p.skill&&p.skill.trigger==="manual")fireSkill(sim,p);};
  const mash=()=>{tapsRef.current.push(performance.now());setTapFx(v=>v+1);if(tapsRef.current.length%4===0)beep(560+Math.random()*120,0.04,0.035);};
  const phaseLabel=phase==="pack"?"周回中｜誘導員に続いて脚を溜めよう":phase==="ready"?"勝負どころ｜スパートのタイミングを見極めろ！":phase==="spurt"?"全力スパート中！連打で踏み込め！！":"ゴール！結果集計中…";
  const tutData=tut?TUT_STEPS[tut]:null;
  const staColor=hud.sta>0.5?"#7ee08a":hud.sta>0.25?"#ffd34d":"#f06a6a";

  return(
    <div className="screen race" ref={wrapRef}>
      <div className="racetop"><span className="racemode">{mode==="boss"?"👹 昇級ボス戦":isVs?"🆚 オンライン対戦":isMock?"🚲 模擬レース":"🏁 "+raceGradeLabel(career,ctx)}</span>{ctx.venue&&<span className="racevenue">📍{ctx.venue.name}{ctx.venue.bank&&<span className="dim">（{ctx.venue.bank}mバンク・{BANK_LAPS[bankCategory(ctx.venue.bank)]}周）</span>}</span>}<span className="racestrat">{strategy.label}</span></div>
      <div className="canvaswrap">
        <canvas ref={cvsRef}/>
        {skillCut&&(
          <div key={skillCut.id} className={"skillcut"+(skillCut.hostile?" enemy":"")} style={{"--skc":skillCut.hostile?"#ff4a3a":(myChar?myChar.color:"#ffd34d")}}>
            <div className="skillcut-rays"/>
            <div className="skillcut-body">
              <div className="skillcut-icon">{skillCut.icon}</div>
              <div className="skillcut-name">{skillCut.name}</div>
              <div className="skillcut-tag">{skillCut.hostile?"⚠ 敵スキル発動":"必殺技 発動"}</div>
            </div>
          </div>
        )}
        {banner&&<div key={banner.id} className="banner"><div className="bannermain">{banner.text}</div>{banner.sub&&<div className="bannersub">{banner.sub}</div>}</div>}
        <div className="feed">{feed.map(f=><div key={f.id} className="feedline">🎙 {f.text}</div>)}</div>
      </div>
      <div className="lineband">
        <span className="lineband-label">ライン</span>
        <div className="lineband-scroll">
          {ctx.lines.map((ln,li)=>{
            let lcars=ln.cars.slice();
            if(ln.isPlayerLine&&strategy.slot>=0)lcars.splice(strategy.slot,0,ctx.player.car);
            return(
              <div key={li} className="lineband-grp" style={{borderColor:(REGION_COLORS[ln.region]||"#888")}}>
                <span className="lineband-region" style={{color:REGION_COLORS[ln.region]||"#aaa"}}>{ln.region.slice(0,2)}</span>
                {lcars.map(c=><span key={c} className={"lineband-chip"+(c===ctx.player.car?" me":"")} style={{background:CAR_COLORS[c].bg,color:CAR_COLORS[c].fg,borderColor:c===1?"#999":"#0b0e18"}}>{c}</span>)}
              </div>
            );
          })}
          {strategy.slot<0&&(
            <div className="lineband-grp solo" style={{borderColor:"#ffd34d"}}>
              <span className="lineband-region" style={{color:"#ffd34d"}}>単騎</span>
              <span className="lineband-chip me" style={{background:CAR_COLORS[ctx.player.car].bg,color:CAR_COLORS[ctx.player.car].fg,borderColor:"#ffd34d"}}>{ctx.player.car}</span>
            </div>
          )}
        </div>
      </div>
      <RaceAdBanner/>
      <div className="phaselabel">{phaseLabel}</div>
      <div className="stamwrap">
        <span className="mini" style={{width:58}}>スタミナ</span>
        <div className="stambg"><div className="stamfill" style={{width:hud.sta*100+"%",background:staColor}}/></div>
        <span className="draftind" style={{opacity:hud.draft?1:0.25}}>🌬風よけ中</span>
      </div>
      <div className="controls">
        {(phase==="pack"||phase==="ready")&&(
          <div className="posrow">
            <button className="posbtn" onPointerDown={()=>{intentRef.current="up";}} onPointerUp={()=>{intentRef.current="keep";}} onPointerLeave={()=>{intentRef.current="keep";}}>▲<br/><span className="mini">前へ</span></button>
            <div className="poscenter mini dim">押している間<br/>位置を調整</div>
            <button className="posbtn" onPointerDown={()=>{intentRef.current="down";}} onPointerUp={()=>{intentRef.current="keep";}} onPointerLeave={()=>{intentRef.current="keep";}}>▼<br/><span className="mini">後ろへ</span></button>
          </div>
        )}
        {phase==="pack"&&<div className="spurtwait mini dim">🔒 スパート解禁は誘導員退避後（💡{strategy.hint}）</div>}
        {phase==="ready"&&(
          <>
            {mySkill&&mySkill.trigger==="manual"&&skillState.has&&(
              skillState.used
                ?<div className="skillbtn used" style={{borderColor:mySkillColor+"55",color:"#7a8299"}}>{mySkill.icon} {mySkill.name} 使用済み</div>
                :<button className="skillbtn ready" style={{borderColor:mySkillColor,color:mySkillColor,"--glow":mySkillColor+"99"}} onPointerDown={e=>{e.stopPropagation();doSkill();}}>{mySkill.icon} 必殺「{mySkill.name}」発動！<span className="skillbtn-sub">{mySkill.short}</span></button>
            )}
            <button className="spurtbtn" onClick={doSpurt}>🚀 スパート！！</button>
          </>
        )}
        {phase==="spurt"&&(
          <div className="mashzone" onPointerDown={mash}>
            {mySkill&&mySkill.trigger==="manual"&&skillState.has&&(
              skillState.used
                ?<div className="skillbtn used" style={{borderColor:mySkillColor+"55",color:"#7a8299"}}>{mySkill.icon} {mySkill.name} 使用済み</div>
                :<button className="skillbtn ready" style={{borderColor:mySkillColor,color:mySkillColor,"--glow":mySkillColor+"99"}} onPointerDown={e=>{e.stopPropagation();doSkill();}}>{mySkill.icon} 必殺「{mySkill.name}」発動！<span className="skillbtn-sub">{mySkill.short}</span></button>
            )}
            <div className={"sprinter "+(tapFx%2===0?"a":"b")+(skillState.active?" skillon":"")}>
              <div className="sprbike">🚴</div>
              <div className="sprpush">踏め!!</div>
            </div>
            <div className="mini" style={{marginTop:4}}>連打でペダルを踏み込め！スタミナに注意！</div>
          </div>
        )}
        {phase==="done"&&<div className="spurtwait mini">🏁 ゴール！まもなく結果発表…</div>}
      </div>
      {tutData&&(<div className="overlay"><div className="tutcard">
        <div className="tutstep">チュートリアル</div><div className="tuttitle">{tutData.t}</div>
        <div className="tutbody">{tutData.body}</div>
        {tutData.unlock.length>0&&<div className="tutunlock">📖 覚えておこう：{tutData.unlock.map(id=>ZUKAN.find(z=>z.id===id).t).join("／")}</div>}
        <button className="btn primary big" onClick={closeTut}>OK！</button>
      </div></div>)}
    </div>
  );
}

// ─── 勝利者インタビュー ──────────────────────────────────────
const AI_WIN_LINES=[
  "最高のレースでした。もっと強くなって次も勝ちます！",
  "チームのみんなのおかげです。ありがとうございました！",
  "作戦通りの走りができました。今日は最高の日です！",
  "このままSS班を目指して、一戦一戦全力で行きます！",
  "正直ギリギリでした…でも絶対に負けたくなかった！",
  "風よけからの差しが決まりました。理想的な展開でしたね。",
  "応援が力になりました。ファンの皆さんに感謝です！",
  "上がりタイムも手応えがありました。記録も狙っていきます！",
  "ライバルが強いほど燃えます。次の対戦も楽しみです！",
  "練習でやってきたことを出せました。自信になります。",
];
function WinnerInterviewScreen({results,isPlayerWon,career,onDone}){
  const winner=results[0];
  const[qs]=useState(()=>shuffle(WIN_QA).slice(0,2));
  const[qIdx,setQIdx]=useState(0);const[choice,setChoice]=useState(null);
  if(!isPlayerWon){
    return(
      <div className="screen pad">
        <div className="interviewtag">🏆 優勝インタビュー</div>
        <div className="wincard">
          <CarChip car={winner.car} size={48}/>
          <div style={{marginTop:8}} className="h2">{winner.name}</div>
          <div className="mini" style={{marginTop:4}}>{STYLES[winner.styleId].label}・{winner.region}</div>
        </div>
        <div style={{marginTop:16}}><Reporter text={pick(AI_WIN_LINES)}/></div>
        <div style={{marginTop:14}}><Senpai mood="calm" text={pick(["負けは負けだ。次のレースで取り返せ。","勝った奴をよく見とけ。盗めるもんは全部盗め。","悔しいか？その悔しさが、お前を強くするんだ。"])}/></div>
        <button className="btn primary big" style={{marginTop:16}} onClick={onDone}>次へ</button>
      </div>
    );
  }
  const q=qs[qIdx];const opt=q.opts[choice];
  return(
    <div className="screen pad">
      <div className="interviewtag">🎤 優勝インタビュー！！</div>
      <div className="wincard">
        <CarChip car={winner.car} size={52}/>
        <div className="h2" style={{marginTop:8}}>{career.name} 選手</div>
        <div className="mini">{GRADE_LABEL[career.rank]}優勝！</div>
      </div>
      <div style={{marginTop:14}}><Reporter text={q.q}/></div>
      {choice===null?(
        <div style={{marginTop:12}}>{q.opts.map((o,i)=>(
          <button key={i} className="stylecard" onClick={()=>{setChoice(i);beep(880,0.1,0.06);}}>
            <span className="styledesc">「{o.t}」</span>
          </button>
        ))}</div>
      ):(
        <div style={{marginTop:12}}>
          <div className="card" style={{background:"#1a2a10",borderColor:"#3a6a20"}}>
            <div className="mini" style={{color:"#8acd6a",marginBottom:4}}>あなたの回答</div>
            <div className="styledesc">「{opt.t}」</div>
          </div>
          <div style={{marginTop:10}}><Senpai mood={opt.sm} text={opt.st}/></div>
          {qIdx<qs.length-1?(
            <button className="btn ghost big" style={{marginTop:12}} onClick={()=>{setQIdx(q=>q+1);setChoice(null);}}>次の質問へ</button>
          ):(
            <button className="btn primary big" style={{marginTop:12}} onClick={onDone}>インタビュー終了</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 結果 ─────────────────────────────────────────────────────
function ResultScreen({results,gains,career,tele,isMock,onHome,onEnding}){
  const me=results.find(r=>r.isP);const fb=senpaiFeedback(tele,me.place);
  return(
    <div className="screen pad">
      <h2 className="h2">{isMock?"模擬レース結果":"レース結果"}</h2>
      <div className={"resulthero "+(me.place===1?"win":me.place<=3?"podium":"")}>
        <div className="resultplace">{me.place}<span className="resultchaku">着</span></div>
        <div className="mini">{me.place===1?"🏆 優勝！！見事な走り！":me.place<=3?"🎉 上位入着！ナイスレース！":"次のレースで巻き返そう！"}</div>
      </div>
      <div style={{marginBottom:12}}><Senpai mood={fb.m} text={fb.t}/></div>
      <div className="card">{results.map(r=>(
        <div key={r.car} className={"riderrow "+(r.isP?"me":"")}>
          <span className="placecell">{r.place}着</span><CarChip car={r.car} size={22}/>
          <span className="ridername">{r.name}{r.isP?"（あなた）":""}</span>
          <span className="riderstyle">{STYLES[r.styleId].label}</span>
        </div>
      ))}</div>
      {isMock?(
        <div className="card"><div className="mini dim">🚲 模擬レースのため得点・賞金・ランキングは加算されません。</div>
          <div className="rowbetween" style={{marginTop:8}}><span className="mini">風よけ率</span><span className="bold">{tele.runSec>1?Math.round((tele.draftSec/tele.runSec)*100):0}%</span></div>
          <div className="rowbetween" style={{marginTop:6}}><span className="mini">参考・上がりタイム</span><span className="bold" style={{color:"#7ee0ff"}}>{gains.agari!=null?gains.agari.toFixed(2)+"秒":"--"}</span></div>
        </div>
      ):(
        <div className="card">
          <div className="rowbetween"><span>📈 競走得点</span><span className={"bold "+(gains.pts>=0?"plus":"orange")}>{gains.pts>=0?"+":""}{gains.pts}点{gains.pts<0&&"（6着以下ペナルティ）"}</span></div>
          <div className="rowbetween"><span>💰 賞金</span><span className="bold plus">+{gains.money}万円</span></div>
          <div className="rowbetween"><span>💪 {STAT_LABEL[gains.statKey]}</span><span className="bold plus">+{gains.statAmt}</span></div>
          <div className="agaribox">
            <div className="rowbetween"><span className="mini">⏱ 上がりタイム（ラスト200m）</span><span className="agaritime">{gains.agari.toFixed(2)}<span className="ranksec">秒</span></span></div>
            {gains.agariPB?(
              <div className="agaripb">🎉 自己ベスト更新！ 全国ランキングに記録を送信しました（{gains.agariBest!=null?gains.agariBest.toFixed(2):"--"}秒）</div>
            ):(
              <div className="mini dim" style={{marginTop:4}}>自己ベスト {gains.agariBest!=null?gains.agariBest.toFixed(2)+"秒":"--"}。連打と仕掛けを磨いて更新を狙え！</div>
            )}
          </div>
          {gains.prevRank!=="SS"&&(<div style={{marginTop:10}}>
            <div className="rowbetween mini dim"><span>SS班まで</span><span>{gains.newPoints}/{RANK_REQ[gains.prevRank]}</span></div>
            <div className="progbg"><div className="progfill" style={{width:clamp((gains.newPoints/RANK_REQ[gains.prevRank])*100,0,100)+"%"}}/></div>
          </div>)}
        </div>
      )}
      {!isMock&&gains.bossUnlocked&&<div className="card gold promo"><div className="bold">👹 昇級ボス戦 解放！！</div><div className="mini" style={{marginTop:4}}>{gains.streakChallenge?"9連勝の偉業！特別昇級チャレンジの資格を得た！":"規定ポイント到達！"}門番「{gains.bossName}」を倒せば昇級だ。ホーム画面から挑戦しろ！</div></div>}
      {!isMock&&!gains.bossUnlocked&&gains.winStreak>=3&&<div className="card"><div className="mini"><span className="em">🔥 {gains.winStreak}連勝中！</span> 9連勝でボス挑戦権を先取りできるぞ！</div></div>}
      {gains&&gains.gpWin&&<div className="card gold promo" style={{textAlign:"center"}}><div className="bold" style={{fontSize:17}}>💰 KEIRINグランプリ 優勝賞金</div><div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:34,color:"#ffd34d",marginTop:4}}>1億円</div><div className="mini dim">獲得！！夢の頂点、その重みだ。</div></div>}
      {gains&&gains.gainedSkill&&<div className="card gold promo" style={{textAlign:"center"}}>
        <div className="bold" style={{fontSize:16}}>👑 新スキル獲得！！</div>
        <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:26,color:"#ffd34d",marginTop:4}}>{gains.gainedSkill.icon} {gains.gainedSkill.name}</div>
        <div className="mini" style={{marginTop:4}}>{gains.gainedSkill.short}</div>
        <div className="mini dim" style={{marginTop:4}}>キャラ切替画面の「必殺技の選択」から装備できます</div>
      </div>}
      {!isMock&&gains.lineSweep&&<div className="card promo" style={{borderColor:"#3a6a40",background:"#12241a"}}>
        <div className="bold" style={{color:"#7ee08a"}}>🤝 ライン上位独占！ワン・ツー・スリー！！</div>
        <div className="mini" style={{marginTop:4}}>仲間と1・2・3着を独占！チームの絆ボーナスで<span className="em">疲労が-15回復</span>した！</div>
      </div>}
      {gains&&gains.gainedItem&&<div className="card gold promo" style={{textAlign:"center"}}>
        <div className="bold" style={{fontSize:15}}>🎁 ハードモード {gains.gainedItem.at}勝 達成報酬！</div>
        <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:24,color:"#ffd34d",marginTop:4}}>{gains.gainedItem.icon} {gains.gainedItem.name}</div>
        <div className="mini" style={{marginTop:4}}>{gains.gainedItem.desc}</div>
        <div className="mini dim" style={{marginTop:4}}>装備画面の「特別アイテム」から装着できます</div>
      </div>}
      {gains&&gains.isHard&&<div className="card">
        <div className="rowbetween"><span className="mini bold">👿 ハードモード通算</span><span className="bold" style={{color:"#ff8a73"}}>{gains.hardWins}勝</span></div>
        {gains.hardWins<300&&<div className="mini dim" style={{marginTop:4}}>次の報酬まであと{Math.ceil((gains.hardWins+1)/10)*10-gains.hardWins}勝（{Math.ceil((gains.hardWins+1)/10)*10}勝目）</div>}
      </div>}
      {gains&&gains.gpWin?(<button className="btn primary big pulse" onClick={onEnding}>🏆 表彰セレモニーへ</button>):(<button className="btn primary big" onClick={onHome}>ホームへ戻る</button>)}
    </div>
  );
}

// ─── エンディング ────────────────────────────────────────────
function EndingScreen({career,onClose}){
  return(
    <div className="screen center">
      <div className="flamebg">{Array.from({length:24}).map((_,i)=><span key={i} className="flame" style={{left:(i*4.2-1)+"%",animationDelay:(i%6)*0.2+"s",animationDuration:(1+(i%4)*0.25)+"s",width:(14+(i%4)*9)+"px",height:(55+(i%5)*34)+"px"}}/>)}<div className="flameglow"/></div>
      <div className="titlewrap zoomin">
        <div className="endtrophy">🏆</div>
        <h1 className="gametitle flametitle" style={{fontSize:34}}>頂点制覇</h1>
        <div className="titlesub">{career.name}、漢の中の漢に</div>
        <div className="card" style={{textAlign:"left",marginTop:18}}>
          <div className="rowbetween"><span className="mini dim">通算成績</span><span>{career.rec.races}走 {career.rec.wins}勝</span></div>
          <div className="rowbetween"><span className="mini dim">獲得賞金</span><span className="money">{career.money}万円</span></div>
          <div className="rowbetween"><span className="mini dim">GP制覇</span><span>{career.rec.gp}回</span></div>
        </div>
        <div style={{marginTop:14}}><Senpai mood="happy" text={"よくやった、"+career.name+"！お前はもう立派なSS班、漢の中の漢だ。…競輪のルールも、全部その身体が覚えてるはずだぜ。"}/></div>
        <button className="btn primary big" style={{marginTop:16}} onClick={onClose}>殿堂入りして走り続ける</button>
      </div>
    </div>
  );
}

// ─── オンライン対戦（フルレース形式・マッチング画面）──────────
// 共有プールの実プレイヤー（または記録未登録時はCPU）が9車立てに1人混じり、
// 本編と同じレース形式で直接対決。着順で勝敗が決まる。
function OnlineVersusScreen({career,onStartVersus,onBack}){
  const[stage,setStage]=useState("loading"); // loading/ready
  const[opps,setOpps]=useState([]);
  const[board,setBoard]=useState(null);
  const[roomCode,setRoomCode]=useState("");
  const[roomStage,setRoomStage]=useState("idle"); // idle/loading/joined
  const[roomMembers,setRoomMembers]=useState([]);
  const season=seasonInfo();
  const joinRoomAction=async()=>{
    const code=sanitizeRoomCode(roomCode);
    if(!code)return;
    setRoomCode(code);setRoomStage("loading");
    await joinRoom(career,code);                      // 自分を部屋に登録
    const pool=await loadRoomPool(code,uidOf(career)); // 同じ合言葉の仲間を収集
    setRoomMembers(pool);setRoomStage("joined");
  };
  const myUid=uidOf(career);
  const rec=career.vs||{w:0,l:0};
  const myPts=career.vsPts||0;

  const findOpponents=React.useCallback(async()=>{
    setStage("loading");setOpps([]);
    const[pool,rank]=await Promise.all([loadVsPool(myUid),loadVsRank()]);
    setBoard(rank);
    setOpps(shuffle(pool).slice(0,8));
    setStage("ready");
  },[myUid]);
  useEffect(()=>{findOpponents();},[findOpponents]);

  const myBoardPos=board?board.findIndex(e=>e.uid===myUid)+1:0;

  return(
    <div className="screen pad">
      <div className="rowbetween" style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#8d9cbe",fontSize:22,cursor:"pointer"}}>←</button>
          <h2 className="h2" style={{margin:0}}>🆚 オンライン対戦</h2>
        </div>
        <span className="vsrecord">{rec.w}勝 {rec.l}敗</span>
      </div>

      {/* シーズンバナー */}
      <div className="card" style={{padding:"9px 13px",borderColor:"#806a23"}}>
        <div className="rowbetween">
          <span className="mini bold" style={{color:"#ffd34d"}}>📅 {season.name} 開催中</span>
          <span className="mini dim">残り{season.daysLeft}日でリセット</span>
        </div>
        <div className="mini dim" style={{marginTop:3}}>3ヶ月ごとの短期決戦。今始めても十分追いつける！最終順位で限定フレームを獲得。</div>
      </div>

      {/* VSポイント */}
      <div className="card gold" style={{textAlign:"center",padding:"12px"}}>
        <div className="mini dim">あなたのVSポイント（{season.name}）</div>
        <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:34,color:"#ffd34d"}}>{myPts}<span style={{fontSize:14}}> pt</span></div>
        <div className="mini dim">着順でポイント増減（1着+32 〜 9着-32）{myBoardPos>0&&<span className="em">・全国{myBoardPos}位</span>}</div>
      </div>

      {(career.frames||[]).length>0&&(
        <div className="card" style={{padding:"10px 13px"}}>
          <div className="mini bold" style={{marginBottom:6}}>🖼 獲得フレーム（シーズン報酬）</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {(career.frames||[]).map(f=><span key={f} className="rankbadge2" style={{background:"#2a2310",color:"#ffd9a0"}}>{frameIcon(f)} {frameLabel(f)}</span>)}
          </div>
        </div>
      )}

      {/* ── 合言葉マッチ（友達対戦）── */}
      <div className="card" style={{borderColor:"#2a5a7a"}}>
        <div className="bold mini" style={{color:"#7ee0ff"}}>🔑 合言葉マッチ（友達対戦）</div>
        <div className="mini dim" style={{marginTop:3}}>友達と同じ「合言葉」を入力して集合！同じ合言葉の仲間と9車立てで直接対決できる。合言葉を教えて誘おう。</div>
        <div style={{display:"flex",gap:7,marginTop:9}}>
          <input className="textinput" style={{marginTop:0,flex:1,padding:"10px 12px",fontSize:14}} value={roomCode} maxLength={16} placeholder="例：おとこみち" onChange={e=>setRoomCode(e.target.value)}/>
          <button className="btn primary" style={{flexShrink:0,padding:"10px 16px"}} disabled={!sanitizeRoomCode(roomCode)||roomStage==="loading"} onClick={joinRoomAction}>{roomStage==="loading"?"…":"集合！"}</button>
        </div>
        {roomStage==="joined"&&(
          <div style={{marginTop:9}}>
            {roomMembers.length===0
              ?<div className="mini dim">「{roomCode}」にはまだ誰もいません。友達が同じ合言葉で集合したら🔄で更新！</div>
              :<>
                <div className="mini" style={{color:"#7ee08a",marginBottom:4}}>「{roomCode}」に{roomMembers.length}人の仲間が集合中！</div>
                {roomMembers.slice(0,8).map((o,i)=>(
                  <div key={i} className="riderrow">
                    <span style={{fontSize:16}}>🚴</span>
                    <span className="ridername">{o.name}</span>
                    <span className="riderstyle">{RANK_LABEL[o.rank]||"選手"}</span>
                  </div>
                ))}
                <button className="btn primary big" style={{marginTop:8}} onClick={()=>onStartVersus(roomMembers.slice(0,8))}>この仲間と対戦開始！</button>
              </>}
            <button className="linkbtn" style={{marginTop:6}} onClick={joinRoomAction}>🔄 メンバーを更新</button>
          </div>
        )}
      </div>

      {stage==="loading"?(
        <div className="card" style={{textAlign:"center",padding:24}}>
          <div className="vsbike" style={{borderColor:"#7ee0ff",margin:"0 auto",animation:"bounce 1.2s infinite"}}>📡</div>
          <div className="mini dim" style={{marginTop:12}}>全国のプレイヤーとマッチング中…</div>
        </div>
      ):(
        <>
          <div className="card">
            <div className="rowbetween" style={{marginBottom:6}}>
              <span className="mini bold">マッチング結果</span>
              <span className="mini" style={{color:opps.length>0?"#7ee08a":"#8d9cbe"}}>実プレイヤー {opps.length}人{opps.length<8&&" ＋ CPU "+(8-opps.length)+"人"}</span>
            </div>
            {opps.length===0&&<div className="mini dim">今は対戦相手が見つからないため、CPU 8人とのレースになります（獲得ポイント半減）。走れば自分の記録がプールに登録され、他のプレイヤーの対戦相手になります！</div>}
            {opps.map((o,i)=>(
              <div key={i} className="riderrow">
                <span style={{fontSize:18}}>🚴</span>
                <span className="ridername">{o.name}</span>
                {o.region&&<span className="mini" style={{color:REGION_COLORS[o.region]||"#9fb0d0"}}>{o.region}</span>}
                <span className="riderstyle">{RANK_LABEL[o.rank]||"選手"}</span>
              </div>
            ))}
          </div>
          <button className="btn primary big pulse" onClick={()=>onStartVersus(opps)}>9車立てで対戦開始！</button>
          <button className="linkbtn" style={{margin:"10px auto",display:"block"}} onClick={findOpponents}>🔄 マッチングし直す</button>

          {/* VSポイントランキング */}
          <div className="card" style={{marginTop:8}}>
            <div className="rowbetween" style={{marginBottom:8}}>
              <span className="mini bold">🏆 {season.name} 全国ランキング</span>
              <span className="mini dim">上位10名</span>
            </div>
            {!board||board.length===0
              ?<div className="mini dim">まだ記録がありません。最初の挑戦者になろう！</div>
              :board.slice(0,10).map((e,i)=>(
                <div key={e.uid} className={"rankrow "+(e.uid===myUid?"me":"")}>
                  <span className="rankno">{i+1}</span>
                  <span className="rankmedal">{i===0?"🥇":i===1?"🥈":i===2?"🥉":""}</span>
                  <span className="rankname">{e.name}</span>
                  <span className="rankbadge2">{RANK_LABEL[e.rank]||""}</span>
                  <span className="ranktime">{e.pts}pt</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── オンライン対戦・結果 ────────────────────────────────────
function VersusResultScreen({results,vsResult,career,onAgain,onHome}){
  const me=results.find(r=>r.isP);
  const opp=results.find(r=>r.isOpp);
  const won=vsResult.outcome==="win";const ghost=vsResult.ghost;
  const isBoss=!!vsResult.boss;
  return(
    <div className="screen pad">
      <div className="interviewtag">{isBoss?"👹 昇級ボス戦 結果":"🆚 オンライン対戦 結果"}</div>
      {isBoss&&won&&(
        <div className="card gold promo" style={{textAlign:"center"}}>
          <div className="vswinner" style={{fontSize:26}}>🎉 {RANK_LABEL[vsResult.promoted]} 昇級！！</div>
          <div className="mini" style={{marginTop:6}}>{vsResult.oppName}を撃破！昇級ボーナス <span className="money">+{vsResult.reward}万円</span></div>
          {vsResult.promoted==="SS"&&<div className="mini em" style={{marginTop:4}}>ついに頂点・S級S班！次はKEIRINグランプリだ！</div>}
        </div>
      )}
      {isBoss&&won&&vsResult.gainedSkill&&(
        <div className="card gold promo" style={{textAlign:"center"}}>
          <div className="bold" style={{fontSize:16}}>⚔️ ボススキル奪取！！</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:26,color:"#ffd34d",marginTop:4}}>{vsResult.gainedSkill.icon} {vsResult.gainedSkill.name}</div>
          <div className="mini" style={{marginTop:4}}>{vsResult.gainedSkill.short}</div>
          <div className="mini dim" style={{marginTop:4}}>キャラ切替画面の「必殺技の選択」から装備できます</div>
        </div>
      )}
      <div className={"resulthero "+(won?"win":"")}>
        <div className="vswinner" style={{fontSize:30}}>{won?(isBoss?"👹 門番 撃破！！":"🏆 勝利！！"):(isBoss?"💀 門番の壁…":"😢 敗北…")}</div>
        <div className="mini" style={{marginTop:6}}>{isBoss?(won?"見事、格上を打ち破った！":"挑戦権は残っている。鍛え直して再挑戦だ！"):ghost?"記録登録マッチ（CPU対戦）":"全国のプレイヤーとの直接対決"}</div>
      </div>
      {isBoss?(
        <div className="vscompare" style={{justifyContent:"center",marginBottom:14}}>
          <div className={"vscol"+(won?" win":"")}>
            <div className="vscolname" style={{color:"#7ee0ff"}}>あなた</div>
            <div className="vscoltime">{me.place}<span style={{fontSize:14}}>着</span></div>
            <div className="mini dim">上がり {vsResult.myAgari.toFixed(2)}秒</div>
          </div>
          <div className="vsvs">VS</div>
          <div className={"vscol"+(!won?" win":"")}>
            <div className="vscolname" style={{color:"#ff8a73",maxWidth:96,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{vsResult.bossIcon}{vsResult.oppName}</div>
            <div className="vscoltime">{vsResult.oppPlace}<span style={{fontSize:14}}>着</span></div>
            <div className="mini dim">門番</div>
          </div>
        </div>
      ):(
        <div className="card gold" style={{textAlign:"center"}}>
          <div className="mini dim">今回の結果：{me.place}着{vsResult.realCount===0&&"（CPUマッチ・pt半減）"}</div>
          <div style={{fontFamily:"'DotGothic16',sans-serif",fontSize:30,color:vsResult.delta>=0?"#7ee08a":"#f06a6a",marginTop:4}}>
            {vsResult.delta>=0?"+":""}{vsResult.delta} pt
          </div>
          <div className="mini" style={{marginTop:4}}>VSポイント合計 <span className="em">{vsResult.newPts}pt</span>{vsResult.realCount>0&&<span className="dim"> ・ 実プレイヤー{vsResult.realCount}人との対戦</span>}</div>
        </div>
      )}
      {!isBoss&&!ghost&&<div className="card"><div className="rowbetween"><span className="mini dim">通算成績</span><span className="bold">{(career.vs&&career.vs.w)||0}勝 {(career.vs&&career.vs.l)||0}敗（4着以内で勝ち）</span></div></div>}
      <div className="card">{results.map(r=>(
        <div key={r.car} className={"riderrow "+(r.isP?"me":"")}>
          <span className="placecell">{r.place}着</span><CarChip car={r.car} size={22}/>
          <span className="ridername">{r.name}{r.isP?"（あなた）":r.isBoss?"（👹ボス）":r.isOpp?"（対戦相手）":r.isBot?"（CPU）":""}</span>
          <span className="riderstyle">{STYLES[r.styleId].label}</span>
        </div>
      ))}</div>
      <button className="btn primary big" onClick={onAgain}>{isBoss?(won?"ホームへ（新たな戦いへ）":"もう一度挑戦する！"):"次の相手と対戦！"}</button>
      {!(isBoss&&won)&&<button className="btn ghost big" style={{marginTop:10}} onClick={onHome}>ホームへ戻る</button>}
    </div>
  );
}

// ─── レース構築（共通ヘルパー）────────────────────────────────
// AI選手を1人生成（名前の重複を避けつつ、級班相応のステータスを与える）
function mkAIRider(car,region,styleId,band,usedNames){
  let nm="";do{nm=pick(SURNAMES)+" "+pick(GIVENS);}while(usedNames.has(nm));usedNames.add(nm);
  return{car,name:nm,styleId,region,isP:false,stats:{pow:irnd(band[0],band[1]),spd:irnd(band[0],band[1]),sta:irnd(band[0],band[1]),tec:irnd(band[0],band[1])}};
}

// ライン上位独占（ワン・ツー・スリー）判定：自ラインが1〜3着を独占したか。
// 単騎作戦（slot<0）は「ライン」に属さないため対象外。
function lineSweepAchieved(ctx,strategy,results){
  if(!ctx||!strategy||strategy.slot<0)return false;
  const lineCars=new Set([ctx.player.car]);
  ctx.lines.forEach(ln=>{if(ln.isPlayerLine)ln.cars.forEach(cc=>lineCars.add(cc));});
  if(lineCars.size<3)return false;
  const top3=results.filter(r=>r.place<=3);
  return top3.length===3&&top3.every(r=>lineCars.has(r.car));
}

// ─── buildRace ───────────────────────────────────────────────
function buildRace(career){
  const hard=isHardMode(career);
  const band=hard?[460,500]:RANK_BAND[career.rank];const cars=shuffle([1,2,3,4,5,6,7,8,9]);
  const usedNames=new Set([career.name]);
  const mkAI=(car,region,styleId)=>mkAIRider(car,region,styleId,band,usedNames);
  const otherR=shuffle(REGIONS.filter(r=>r!==career.region)).slice(0,2);
  const player={car:cars[0],name:career.name,styleId:careerStyle(career),region:career.region,isP:true,stats:effStats(career)};
  const pAI=[mkAI(cars[1],career.region,"nige"),mkAI(cars[2],career.region,pick(["sashi","makuri"]))];
  const lB=[mkAI(cars[3],otherR[0],"nige"),mkAI(cars[4],otherR[0],pick(["sashi","makuri"])),mkAI(cars[5],otherR[0],pick(["nige","makuri"]))];
  const lC=[mkAI(cars[6],otherR[1],"nige"),mkAI(cars[7],otherR[1],"sashi"),mkAI(cars[8],otherR[1],pick(["makuri","sashi"]))];
  const riders=[player,...pAI,...lB,...lC];
  const lines=shuffle([
    {region:career.region,isPlayerLine:true,cars:pAI.map(r=>r.car),aiRiders:pAI},
    {region:otherR[0],isPlayerLine:false,cars:lB.map(r=>r.car),aiRiders:lB},
    {region:otherR[1],isPlayerLine:false,cars:lC.map(r=>r.car),aiRiders:lC},
  ]);
  return{riders,lines,isGP:career.rank==="SS"&&!hard,hardMode:hard,player,
    venue:career&&career.mode==="real"?pick(REAL_VENUES):pick(VENUES),
    skill:careerSkill(career),hardItem:hardItemOf(career)};
}

// 記録未登録（プール空）時のCPU対戦相手を生成
function generateGhostOpp(career){
  const band=RANK_BAND[career.rank];
  return{name:pick(SURNAMES)+" "+pick(GIVENS),region:pick(REGIONS),rank:career.rank,style:pick(["nige","makuri","sashi"]),
    stats:{pow:irnd(band[0],band[1]),spd:irnd(band[0],band[1]),sta:irnd(band[0],band[1]),tec:irnd(band[0],band[1])},ghost:true};
}

// オンライン対戦用のレース。最大8人の実プレイヤー + 不足分はCPU(bot)で9車立て。
function buildVersusRace(career,opps){
  const list=Array.isArray(opps)?opps.slice(0,8):[opps];
  const band=RANK_BAND[career.rank];const cars=shuffle([1,2,3,4,5,6,7,8,9]);
  const usedNames=new Set([career.name]);
  const normOpp=(opp)=>{
    let st=opp.stats&&typeof opp.stats.pow==="number"?{...opp.stats}:null;
    if(!st){const ob=RANK_BAND[opp.rank]||band;st={pow:irnd(ob[0],ob[1]),spd:irnd(ob[0],ob[1]),sta:irnd(ob[0],ob[1]),tec:irnd(ob[0],ob[1])};}
    // sv(スケール版数)なし＝旧時代の記録のみ×4補正。新記録はsv:2付きでそのまま使う
    if(!opp.sv&&!opp.ghost){st={pow:clamp(st.pow*4,0,500),spd:clamp(st.spd*4,0,500),sta:clamp(st.sta*4,0,500),tec:clamp(st.tec*4,0,500)};}
    const style=opp.style&&STYLES[opp.style]?opp.style:pick(["nige","makuri","sashi"]);
    let nm=opp.name;while(usedNames.has(nm))nm=nm+"'";usedNames.add(nm);
    return{name:nm,region:opp.region||pick(REGIONS),style,stats:st,ghost:!!opp.ghost};
  };
  // 実プレイヤー分 + 8人になるまでbotで補充
  const others=list.map(normOpp);
  while(others.length<8){const g=generateGhostOpp(career);let nm=g.name;while(usedNames.has(nm))nm=pick(SURNAMES)+" "+pick(GIVENS);usedNames.add(nm);others.push({...g,name:nm,ghost:true});}
  const player={car:cars[0],name:career.name,styleId:careerStyle(career),region:career.region,isP:true,stats:effStats(career)};
  const riders=[player];
  others.forEach((o,i)=>{riders.push({car:cars[i+1],name:o.name,styleId:o.style,region:o.region,isP:false,isOpp:!o.ghost,isBot:o.ghost,stats:o.stats});});
  // ライン編成：地区でゆるくグループ化して3-3-3に
  const grouped=riders.slice().sort((a,b)=>a.region<b.region?-1:1);
  const chunks=[grouped.slice(0,3),grouped.slice(3,6),grouped.slice(6,9)];
  const lines=chunks.map(ch=>({region:ch[0].region,isPlayerLine:ch.some(r=>r.isP),cars:ch.filter(r=>!r.isP).map(r=>r.car),aiRiders:ch.filter(r=>!r.isP)}));
  const realCount=others.filter(o=>!o.ghost).length;
  return{riders,lines,isGP:false,player,venue:pick(VENUES),isVersus:true,realCount,skill:careerSkill(career),hardItem:hardItemOf(career)};
}

// ─── セーブデータ移行 ─────────────────────────────────────────
function migrateCareer(c){
  if(c.v>=9)return c;
  if(c.v===8){
    // v8→v9: ハードモード周回報酬（勝利数・特別アイテム）の追加
    const out={...c,hardWins:c.hardWins||0,hardItems:c.hardItems||[],hardItemUse:c.hardItemUse||null,v:9};
    saveGame(out);return out;
  }
  if(c.v===7){
    // v7→v9: シーズン制＋ハード報酬の追加
    const out={...c,vsSeason:c.vsSeason||null,frames:c.frames||[],hardWins:0,hardItems:[],hardItemUse:null,v:9};
    saveGame(out);return out;
  }
  if(c.v===6){
    // v6→v8: 獲得スキル機能＋シーズン制の追加
    const out={...c,skills:c.skills||[],useSkill:c.useSkill||null,vsSeason:null,frames:[],hardWins:0,hardItems:[],hardItemUse:null,v:9};
    saveGame(out);return out;
  }
  if(c.v===5){
    // v5→v6: キャラ選択導入前のセーブ。charIdは未設定(=固有スキルなし)のまま維持し、
    // 従来のstyleフィールドで脚質を継続。既存の強さ・進行に影響を与えない。
    const out={...c,charId:c.charId||null,skills:[],useSkill:null,vsSeason:null,frames:[],hardWins:0,hardItems:[],hardItemUse:null,v:9};
    saveGame(out);return out;
  }
  if(c.v===4){
    // v4→v6: 値はそのまま新経済(上限500)へ。旧46〜120は新レンジに自然に収まる。charIdは未設定
    const out={...c,stats:{pow:clamp(c.stats.pow,0,500),spd:clamp(c.stats.spd,0,500),sta:clamp(c.stats.sta,0,500),tec:clamp(c.stats.tec,0,500)},vsPts:c.vsPts||0,winStreak:c.winStreak||0,bossReady:c.bossReady||false,charId:c.charId||null,skills:[],useSkill:null,vsSeason:null,frames:[],hardWins:0,hardItems:[],hardItemUse:null,v:9};
    saveGame(out);return out;
  }
  // v3以前: 恒久ステ加算だった旧装備効果を巻き戻し、装備制へ移行
  const out={...c,stats:{...c.stats},owned:[...(c.owned||[])],equipped:{}};
  for(const id of out.owned){
    const it=itemById(id);
    if(!it||!it.stat)continue;
    out.stats[it.stat]=clamp(out.stats[it.stat]-it.bonus,0,500);
    if(it.stat2)out.stats[it.stat2]=clamp(out.stats[it.stat2]-it.bonus2,0,500);
  }
  for(const slot of EQUIP_SLOTS){
    const best=SHOP_ITEMS.filter(i=>i.slot===slot.id&&out.owned.includes(i.id)).sort((a,b)=>b.price-a.price)[0];
    if(best)out.equipped[slot.id]=best.id;
  }
  out.stats={pow:clamp(out.stats.pow,0,500),spd:clamp(out.stats.spd,0,500),sta:clamp(out.stats.sta,0,500),tec:clamp(out.stats.tec,0,500)};
  out.vsPts=0;out.winStreak=0;out.bossReady=false;
  out.charId=out.charId||null;
  out.skills=[];out.useSkill=null;
  out.vsSeason=null;out.frames=[];
  out.hardWins=0;out.hardItems=[];out.hardItemUse=null;
  out.v=9;
  saveGame(out);
  return out;
}

// ─── 昇級ボス戦のレース構築 ──────────────────────────────────
function buildBossRace(career){
  const boss=BOSSES[career.rank];
  const band=RANK_BAND[career.rank];const cars=shuffle([1,2,3,4,5,6,7,8,9]);
  const usedNames=new Set([career.name,boss.name]);
  const mkAI=(car,region,styleId)=>mkAIRider(car,region,styleId,band,usedNames);
  const player={car:cars[0],name:career.name,styleId:careerStyle(career),region:career.region,isP:true,stats:effStats(career)};
  const bossRider={car:cars[1],name:boss.name,styleId:boss.style,region:boss.region,isP:false,isOpp:true,isBoss:true,stats:{...boss.stats}};
  const pMate=mkAI(cars[2],career.region,pick(["sashi","makuri"]));
  const bMate=mkAI(cars[3],boss.region,pick(["sashi","makuri"]));
  const fR=shuffle(REGIONS.filter(r=>r!==career.region&&r!==boss.region))[0]||pick(REGIONS);
  const fA=mkAI(cars[4],fR,"nige"),fB=mkAI(cars[5],fR,"sashi"),fC=mkAI(cars[6],fR,"makuri");
  const fR2=shuffle(REGIONS.filter(r=>r!==career.region&&r!==boss.region&&r!==fR))[0]||pick(REGIONS);
  const gA=mkAI(cars[7],fR2,"nige"),gB=mkAI(cars[8],fR2,"sashi");
  const riders=[player,bossRider,pMate,bMate,fA,fB,fC,gA,gB];
  const lines=shuffle([
    {region:career.region,isPlayerLine:true,cars:[pMate.car],aiRiders:[pMate]},
    {region:boss.region,isPlayerLine:false,cars:[bossRider.car,bMate.car],aiRiders:[bossRider,bMate]},
    {region:fR,isPlayerLine:false,cars:[fA.car,fB.car,fC.car],aiRiders:[fA,fB,fC]},
    {region:fR2,isPlayerLine:false,cars:[gA.car,gB.car],aiRiders:[gA,gB]},
  ]);
  return{riders,lines,isGP:false,player,venue:pick(VENUES),isBoss:true,boss,skill:careerSkill(career),hardItem:hardItemOf(career)};
}

// テストプレイ用：全ステ500・全アイテム所持・S1でボス挑戦権ありのカンストデータ
function newMaxCareer(){
  const uid="u"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
  const owned=SHOP_ITEMS.filter(i=>i.cat!=="supply").map(i=>i.id);
  const allSkills=Object.keys(ACQUIRED_SKILLS);              // 全獲得スキル(ボス5+王者+ハード3)
  const allHardItems=HARD_REWARDS.map(i=>i.id);              // 特別アイテム全30種
  const c={v:9,uid,name:"カンスト検証",charId:"honoo",skills:allSkills,useSkill:null,vsSeason:null,frames:[],
    hardWins:300,hardItems:allHardItems,hardItemUse:null,style:"makuri",region:"南関東",rank:"SS",
    stats:{pow:500,spd:500,sta:500,tec:500},fatigue:0,trainLeft:99,
    points:0,money:9999999,owned,equipped:{},
    rec:{races:0,wins:0,podium:0,gp:1},bestAgari:null,vs:{w:0,l:0},vsPts:0,
    winStreak:9,bossReady:false,homeReturns:0,tutorialDone:true,entryTipDone:true,senpaiIntro:true};
  c.equipped=buildBestEquip(c);
  return c;
}

function newCareer(name,styleId,region,charId){
  const uid="u"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);
  return{v:9,uid,name,charId:charId||null,skills:[],useSkill:null,vsSeason:null,frames:[],hardWins:0,hardItems:[],hardItemUse:null,style:styleId,region,rank:"A3",stats:{pow:10,spd:10,sta:10,tec:10},fatigue:20,trainLeft:3,points:0,money:0,owned:[],equipped:{},rec:{races:0,wins:0,podium:0,gp:0},bestAgari:null,vs:{w:0,l:0},vsPts:0,winStreak:0,bossReady:false,homeReturns:0,tutorialDone:false,entryTipDone:false,senpaiIntro:false};
}

// ─── インタースティシャル広告 ────────────────────────────────

// ─── レース中バナー広告コンポーネント（AdSense） ────────────────
function RaceAdBanner(){
  useEffect(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}},[]);
  return(
    <div className="racead-adsense">
      <ins className="adsbygoogle"
        style={{display:"block",width:"100%",height:50}}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT_BANNER}
        data-ad-format="horizontal"
        data-full-width-responsive="false"/>
    </div>
  );
}

function InterstitialAd({onClose}){
  const[left,setLeft]=useState(3);
  const[ad]=useState(()=>pick(ADS));
  useEffect(()=>{if(left<=0)return;const t=setTimeout(()=>setLeft(l=>l-1),1000);return()=>clearTimeout(t);},[left]);
  // AdSense ユニット push
  useEffect(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}},[]);
  return(
    <div className="adoverlay">
      <div className="adcard">
        <div className="adbar">
          <span className="adlabel">広告</span>
          {left>0?<span className="adcount">{left}</span>:<button className="adclose" onClick={onClose}>✕ 閉じる</button>}
        </div>
        <div className="adbody-adsense">
          <ins className="adsbygoogle"
            style={{display:"block",width:"100%",minHeight:250}}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT_INTERSTITIAL}
            data-ad-format="rectangle"
            data-full-width-responsive="true"/>
        </div>
        <div className="adnote">Google 広告{left>0?` ・ ${left}秒後に閉じられます`:""}</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────
export default function App(){
  const[screen,setScreen]=useState("title");
  const[career,setCareer]=useState(null);
  const[hasSave,setHasSave]=useState(false);
  const[hasRealSave,setHasRealSave]=useState(false);
  const[savedRealData,setSavedRealData]=useState(null);
  const[raceCtx,setRaceCtx]=useState(null);
  const[strategy,setStrategy]=useState(null);
  const[raceMode,setRaceMode]=useState("real"); // "real" | "mock" | "versus"
  const[vsOpp,setVsOpp]=useState(null);
  const[vsGhost,setVsGhost]=useState(false);
  const[vsResult,setVsResult]=useState(null);
  const[results,setResults]=useState(null);
  const[gains,setGains]=useState(null);
  const[tele,setTele]=useState(null);
  const[raceKey,setRaceKey]=useState(0);
  const[entryTip,setEntryTip]=useState(false);
  const[savedData,setSavedData]=useState(null);
  const[showAd,setShowAd]=useState(false);

  // AdSense スクリプト読み込み & 広告ユニット初期化
  useEffect(()=>{
    if(document.getElementById('adsense-script'))return;
    const s=document.createElement('script');
    s.id='adsense-script';
    s.async=true;
    s.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin='anonymous';
    document.head.appendChild(s);
  },[]);

  useEffect(()=>{loadGame().then(d=>{if(d){if(!d.uid)d.uid="u"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);if(!d.vs)d.vs={w:0,l:0};if(d.homeReturns==null)d.homeReturns=0;d=migrateCareer(d);setSavedData(d);setHasSave(true);}});},[]);
  useEffect(()=>{loadRealGame().then(d=>{if(d){setSavedRealData(d);setHasRealSave(true);}});},[]);

  useEffect(()=>{
    const h=(e)=>{
      resumeAudio();
      const t=e.target&&e.target.closest?e.target.closest("button,.stylecard,.traincard,.regionbtn,.catbtn,.zukancard,.shopbuy"):null;
      if(t&&!t.disabled&&!(e.target.closest&&e.target.closest(".mashzone,.posbtn")))clickSound();
    };
    document.addEventListener("pointerdown",h,true);
    return()=>document.removeEventListener("pointerdown",h,true);
  },[]);

  const onNew=()=>{bgm.start("theme");setScreen("intro");};
  const onMaxTest=()=>{const c=newMaxCareer();setCareer(c);saveGame(c);bgm.start("theme");setScreen("home");};
  const onContinue=()=>{const c=savedData&&!savedData.uid?{...savedData,uid:"u"+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36)}:savedData;setCareer(c);bgm.start("theme");setScreen("home");};
  const onIntroDone=()=>setScreen("create");
  const onCreate=(name,style,region,charId)=>{const c=newCareer(name,style,region,charId);setCareer(c);saveGame(c);setScreen("senpai");};
  const onSenpaiDone=()=>{const c={...career,senpaiIntro:true};setCareer(c);saveGame(c);setScreen("home");};

  // ── リアルモード：モード切替・作成・継続 ──
  const onRealMode=()=>setScreen("real-title");
  const onRealBack=()=>setScreen("title");
  const onNewReal=()=>setScreen("real-create");
  const onContinueReal=()=>{const c=savedRealData&&savedRealData.retired?savedRealData:ensureOffer(savedRealData);setCareer(c);if(c!==savedRealData)saveRealGame(c);bgm.start("theme");setScreen(c&&c.retired?"real-retire":"real-home");};
  const onCreateReal=(name,style,region,charId)=>{const c=ensureOffer(newRealCareer(name,style,region,charId));setCareer(c);saveRealGame(c);bgm.start("theme");setScreen("real-home");};
  const doRealTrain=()=>{
    if(!career||career.trainLeft<=0)return;
    const keys=["pow","spd","sta","tec"];const k=pick(keys);
    const gain=3+irnd(0,2); // P1では簡易固定成長（練習メニュー個別選択は今後拡張）
    const c={...career,stats:{...career.stats,[k]:clamp(career.stats[k]+gain,0,500)},trainLeft:career.trainLeft-1};
    setCareer(c);saveRealGame(c);
  };
  // 負傷による静養（P3）：1週進めて負傷残週数を減らす。期末なら審査・代謝判定も行う
  const doRest=()=>{
    if(!career||!(career.injuredWeeks>0))return;
    const prevCal=career.calendar;
    let c={...career,injuredWeeks:career.injuredWeeks-1};
    const termEnded=prevCal.week>=24;
    let review=null;
    if(termEnded){
      review=termReview(c);
      const ret=checkRetirement(c,review);
      c={...c,rank:review.newRank,ptsHistory:[],lowStreak:ret.lowStreak,
        reviews:[...(c.reviews||[]),{year:prevCal.year,term:prevCal.term,...review}]};
      if(RANKS.indexOf(c.rank)>RANKS.indexOf(c.bestRank||"A3"))c.bestRank=c.rank;
      if(ret.retiring)c.retired=true;
    }
    c.calendar=advanceRealWeek(prevCal);
    if(c.injuredWeeks<=0&&!c.retired)c=ensureOffer(c);
    setCareer(c);saveRealGame(c);
    if(c.retired)setScreen("real-retire");
  };
  const onRealResultNext=()=>setScreen(career&&career.retired?"real-retire":"real-home");
  // 引退後、新しい選手で再挑戦（旧セーブは削除）
  const onRestartReal=()=>{deleteRealSave();setCareer(null);setHasRealSave(false);setSavedRealData(null);setScreen("real-create");};

  const doTrain=id=>{
    const t=TRAININGS.find(x=>x.id===id);let c={...career,stats:{...career.stats}};let res;
    if(t.stat){const cur=c.stats[t.stat];const g=TRAIN_GAIN[c.rank]||TRAIN_GAIN.A3;const crit=Math.random()<0.18;const gain=crit?g.c:g.n;c.stats[t.stat]=clamp(cur+gain,0,500);c.fatigue=clamp(c.fatigue+t.fat,0,100);res={crit,text:(crit?"🌟 大成功！！ ":"✅ ")+t.name+"で"+STAT_LABEL[t.stat]+" +"+gain+"！",sub:"疲労 +"+t.fat,senpai:crit?{m:"happy",t:"いいぞ！その伸びだ！その調子で食らいついてこい！"}:pick(SENPAI_TRAIN)};}
    else{c.fatigue=clamp(c.fatigue+t.fat,0,100);res={crit:false,text:"🛌 ゆっくり休んで疲労がスッキリ回復！",sub:"体調を整えるのもプロの仕事",senpai:{m:"calm",t:"休むのも実力のうちだ。無理して怪我したら元も子もねえからな。"}};}
    c.trainLeft=Math.max(0,c.trainLeft-1);setCareer(c);saveGame(c);return res;
  };

  const doBuy=(item,price)=>{
    const pay=price!=null?price:item.price;
    let c={...career,stats:{...career.stats},owned:[...(career.owned||[])],equipped:{...(career.equipped||{})}};
    c.money-=pay;
    if(item.cat==="supply"){
      // サプリ・ケアは即時効果。何度でも購入できる（ownedに入れない）
      if(item.use){
        if(item.use.fatigue)c.fatigue=clamp(c.fatigue+item.use.fatigue,0,100);
        if(item.use.train)c.trainLeft=c.trainLeft+item.use.train;
      }
    }else{
      c.owned.push(item.id);
      // 装備品なら、そのスロットが空いていれば自動装備
      if(item.slot&&!c.equipped[item.slot])c.equipped[item.slot]=item.id;
    }
    setCareer(c);saveGame(c);beep(1046,0.2,0.08,"sine");
  };

  const doEquip=(slot,itemId)=>{
    const c={...career,equipped:{...(career.equipped||{})}};
    if(itemId)c.equipped[slot]=itemId;else delete c.equipped[slot];
    setCareer(c);saveGame(c);beep(itemId?880:520,0.12,0.06,"sine");
  };

  const doEquipAll=map=>{
    const c={...career,equipped:{...map}};
    setCareer(c);saveGame(c);beep(1046,0.18,0.08,"sine");
  };

  // キャラ切替：解放済みキャラのみ許可。脚質もキャラに合わせて更新する。
  const doSwitchChar=charId=>{
    if(!isCharUnlocked(career,charId))return;
    const ch=charById(charId);if(!ch)return;
    const c={...career,charId,style:ch.style};
    setCareer(c);saveGame(c);beep(880,0.14,0.07,"sine");
    setScreen("home");
  };

  // 特別アイテム（ハード報酬）の装着切替
  const doSelectHardItem=id=>{
    if(id&&!(career.hardItems||[]).includes(id))return;
    const c={...career,hardItemUse:id||null};
    setCareer(c);saveGame(c);beep(id?880:520,0.12,0.06,"sine");
  };

  // 必殺技の装備切替：null=キャラ固有スキル / 獲得スキルIDを指定
  const doSelectSkill=skillId=>{
    if(skillId&&!(career.skills||[]).includes(skillId))return;
    const c={...career,useSkill:skillId||null};
    setCareer(c);saveGame(c);beep(1046,0.14,0.07,"sine");
  };

  // ── シーズン切替：新シーズンを検知したら前シーズンの最終順位で報酬を配布し、VSポイントをリセット ──
  useEffect(()=>{
    if(!career)return;
    const cur=seasonInfo().id;
    if(career.vsSeason===cur)return;
    let cancelled=false;
    (async()=>{
      let frames=career.frames||[];
      if(career.vsSeason&&(career.vsPts||0)>0){
        const board=await loadVsRank(career.vsSeason); // 前シーズンの最終ランキング
        const idx=board.findIndex(e=>e.uid===uidOf(career));
        const fid=career.vsSeason+"_"+seasonRewardSuffix(idx>=0?idx+1:999);
        if(!frames.includes(fid))frames=[...frames,fid];
      }
      if(cancelled)return;
      const c={...career,vsSeason:cur,vsPts:0,frames};
      setCareer(c);saveGame(c);
    })();
    return()=>{cancelled=true;};
  },[career&&career.uid,career&&career.vsSeason]);

  const goRace=mode=>{const ctx=buildRace(career);setRaceCtx(ctx);setRaceMode(mode);setVsOpp(null);setVsGhost(false);if(mode==="real"&&!career.entryTipDone)setEntryTip(true);bgm.start(mode==="real"&&ctx.isGP?"gp":"theme");setScreen("entry");};

  // ── リアルモード：現在の開催イベント(career.currentEvent)の「今のラウンド」を走る ──
  const goRealRace=()=>{
    const ev=career.currentEvent;if(!ev)return;
    const ctx=buildRace(career);
    ctx.realGrade=ev.grade;ctx.realEventName=ev.gradeName;
    ctx.realRoundLabel=ev.consolation?"敗者戦（順位決定戦）":ROUND_LABEL[ev.rounds[ev.roundIdx]];
    ctx.gearId=career.gearId||"g370"; // P6：ギア倍数（Entry画面で変更可）
    setRaceCtx(ctx);setRaceMode("real");setVsOpp(null);setVsGhost(false);
    bgm.start(ev.grade==="GP"?"gp":"theme");
    setScreen("entry");
  };
  const doSetGear=gearId=>{if(!career||career.mode!=="real")return;const c={...career,gearId};setCareer(c);saveRealGame(c);};
  // 車券（P6）：仮想コイン残高を更新（実通貨には一切接続しない）
  const doSetCoins=coins=>{if(!career||career.mode!=="real")return;const c={...career,coins:Math.max(0,coins)};setCareer(c);saveRealGame(c);};

  // 斡旋の受諾／欠場（P2）
  const doAcceptOffer=()=>{
    if(!career||!career.pendingOffer)return;
    const c=acceptEvent({...career,currentEvent:startEventFromOffer(career.pendingOffer),pendingOffer:null});
    setCareer(c);saveRealGame(c);
  };
  const doDeclineOffer=()=>{
    if(!career||!career.pendingOffer||career.suspended)return; // 斡旋停止中は欠場できない
    const c=ensureOffer({...declineEvent(career),pendingOffer:null});
    setCareer(c);saveRealGame(c);
  };

  const startBoss=()=>{const ctx=buildBossRace(career);setRaceCtx(ctx);setRaceMode("boss");setVsOpp(null);setVsGhost(false);bgm.start("boss");setScreen("entry");};

  const startVersus=(opps)=>{setVsOpp(opps);const ctx=buildVersusRace(career,opps||[]);setVsGhost(ctx.realCount===0);setRaceCtx(ctx);setRaceMode("versus");bgm.start("theme");setScreen("entry");};

  const closeEntryTip=()=>{const c={...career,entryTipDone:true};setCareer(c);saveGame(c);setEntryTip(false);};

  const startRace=strat=>{setStrategy(strat);setRaceKey(k=>k+1);setScreen("race");};

  const onRaceFinish=(resList,teleData)=>{
    setResults(resList);setTele(teleData);
    const me=resList.find(r=>r.isP);const place=me.place;
    const agari=computeAgari(teleData,effStats(career));
    if(career.mode==="real"){
      const ev=career.currentEvent;
      const grade=ev?ev.grade:(raceCtx.realGrade||"F2");
      const prevCal=career.calendar;
      const step=ev?nextEventStep(ev,place):{done:true,finalPlace:place,consolation:false};
      const termEnded=prevCal.week>=24;
      let review=null,c={...career};
      if(!step.done){
        c.currentEvent=step; // 勝ち上がり／敗者戦へ：開催継続
      }else{
        const reward=eventFinalReward(grade,step.finalPlace,step.consolation);
        c=recordRealRaceResult(c,grade,step.finalPlace,reward.mul,me.raceStats); // B/H/S・決まり手も記録(P3)
        c.currentEvent=null;
        c=ensureOffer(c); // 開催終了→次の斡旋をすぐ提示
      }
      // ── P3：落車・審議失格の追加ペナルティ ──
      let incidentInfo=null;
      if(me.dnf&&me.incident==="crash"){
        const weeks=irnd(1,3);
        c.injuredWeeks=(c.injuredWeeks||0)+weeks;
        incidentInfo={type:"crash",weeks};
      }else if(me.dnf&&me.incident==="foul"){
        c.violationPts=(c.violationPts||0)+3;
        if(c.violationPts>=9)c.suspended=true; // 違反点の累積で斡旋停止（強制出場扱い）
        incidentInfo={type:"foul",violationPts:c.violationPts,foulKind:me.foulKind,foulLabel:FOUL_KINDS[me.foulKind]?.label,foulDesc:FOUL_KINDS[me.foulKind]?.desc};
      }
      if(!c.tutorialDone)c={...c,tutorialDone:true}; // 初回レースのチュートリアルは1回だけ
      let retirement=null;
      if(termEnded){
        review=termReview(c);
        const ret=checkRetirement(c,review);
        c={...c,rank:review.newRank,ptsHistory:[],lowStreak:ret.lowStreak,
          reviews:[...(c.reviews||[]),{year:prevCal.year,term:prevCal.term,...review}]};
        // 最高到達級班の更新（RANKS配列の並び=昇順）
        if(RANKS.indexOf(c.rank)>RANKS.indexOf(c.bestRank||"A3"))c.bestRank=c.rank;
        if(ret.retiring){c.retired=true;retirement={retiring:true};}
        else if(ret.warned)retirement={warned:true};
      }
      c.calendar=advanceRealWeek(prevCal);
      c.trainLeft=3; // 週送りに合わせて練習回数を回復
      setCareer(c);saveRealGame(c);
      const curRoundLabel=ev?(ev.consolation?"敗者戦（順位決定戦）":ROUND_LABEL[ev.rounds[ev.roundIdx]]):null;
      const nextRoundLabel=(!step.done)?(step.consolation?"敗者戦（順位決定戦）":ROUND_LABEL[step.rounds[step.roundIdx]]):null;
      setGains({real:true,place,grade,gradeName:ev?ev.gradeName:REAL_GRADE_LABEL[grade],roundLabel:curRoundLabel,
        eventDone:step.done,consolation:step.consolation,finalPlace:step.done?step.finalPlace:null,
        pts:step.done?eventFinalReward(grade,step.finalPlace,step.consolation).pts:null,nextRoundLabel,
        incident:incidentInfo,retirement,
        avgPts:c.avgPts,rank:c.rank,agari:agari.time,review,calendarLabel:realCalendarLabel(prevCal)});
      bgm.start(place===1?"victory":"theme");setScreen("real-result");return;
    }
    if(raceMode==="versus"){
      const realCount=raceCtx.realCount||0;
      // 着順ポイント: 1着+32 → 5着0 → 9着-32（CPUのみのマッチは半減）
      let delta=(5-place)*8;
      if(realCount===0)delta=Math.round(delta/2);
      const outcome=place<=4?"win":"lose";
      let c={...career,vs:{w:(career.vs&&career.vs.w)||0,l:(career.vs&&career.vs.l)||0}};
      c.vsPts=Math.max(0,(c.vsPts||0)+delta);
      if(realCount>0){if(outcome==="win")c.vs.w++;else c.vs.l++;}
      setCareer(c);saveGame(c);
      submitVsRun(c,agari.time);  // 対戦プールへ自分の記録を登録
      submitVsRank(c);            // VSポイントランキングへ反映
      setVsResult({outcome,myPlace:place,myAgari:agari.time,delta,newPts:c.vsPts,realCount,ghost:realCount===0});
      bgm.start(place===1?"victory":"theme");setScreen("vsresult");return;
    }
    if(raceMode==="boss"){
      const bossRider=resList.find(r=>r.isBoss);
      // フラグ欠落時は敗北扱い（誤って昇級させない安全側フォールバック）
      const bossPlace=bossRider?bossRider.place:1;
      const won=place<bossPlace;
      const boss=raceCtx.boss;
      let c={...career,stats:{...career.stats},rec:{...career.rec}};
      c.fatigue=clamp(c.fatigue+14,0,100);
      if(won){
        // 昇級！ポイントリセット・挑戦権消費・報酬
        // さらに撃破したボスのスキルを獲得（重複獲得はしない）
        const beatenRank=c.rank; // 昇級前のランク＝倒したボスのキー
        const nextRank=RANKS[RANKS.indexOf(c.rank)+1];
        c.rank=nextRank;c.points=0;c.bossReady=false;c.winStreak=0;
        c.money+=boss.reward;
        let gainedSkill=null;
        const rewardId=BOSS_SKILL_REWARD[beatenRank];
        if(rewardId&&!(c.skills||[]).includes(rewardId)){
          c.skills=[...(c.skills||[]),rewardId];
          gainedSkill=acquiredById(rewardId);
        }
        setCareer(c);saveGame(c);
        setVsResult({boss:true,outcome:"win",myPlace:place,oppPlace:bossPlace,myAgari:agari.time,oppName:boss.name,bossIcon:boss.icon,promoted:nextRank,reward:boss.reward,gainedSkill});
        bgm.start("victory");
      }else{
        setCareer(c);saveGame(c);
        setVsResult({boss:true,outcome:"lose",myPlace:place,oppPlace:bossPlace,myAgari:agari.time,oppName:boss.name,bossIcon:boss.icon,promoted:null,reward:0});
        bgm.start("theme");
      }
      setScreen("vsresult");return;
    }
    if(raceMode==="mock"){setGains({gpWin:false,agari:agari.time});bgm.start("theme");setScreen("interview");return;}
    const prevRank=career.rank;const pts=Math.round(PLACE_PTS[place-1]*RANK_MULT[prevRank]);const money=Math.round(PLACE_MONEY[place-1]*RANK_MULT[prevRank]);const statKey=pick(["pow","spd","sta","tec"]);const statAmt=place<=3?8:4;
    let c={...career,stats:{...career.stats},rec:{...career.rec}};
    c.stats[statKey]=clamp(c.stats[statKey]+statAmt,0,500);const pk=careerPerks(c);const moneyEarned=Math.round(money*(1+pk.money));c.money+=moneyEarned;c.rec.races+=1;if(place===1)c.rec.wins+=1;if(place<=3)c.rec.podium+=1;
    // ライン上位独占（1・2・3着を自ラインで独占）→ 疲労が増えるどころか-15回復！
    const lineSweep=lineSweepAchieved(raceCtx,strategy,resList);
    c.fatigue=clamp(c.fatigue+(lineSweep?-15:Math.max(4,12-pk.fatigue)),0,100);c.trainLeft=3+pk.train;
    if(!c.tutorialDone)c={...c,tutorialDone:true};
    const prevBest=c.bestAgari;
    let agariPB=false;
    if(prevBest==null||agari.time<prevBest){c.bestAgari=agari.time;agariPB=true;}
    // 連勝トラッキング（1着で+1、それ以外でリセット）
    if(place===1)c.winStreak=(c.winStreak||0)+1;else c.winStreak=0;
    // 昇級はボス戦勝利が必須。規定Pt到達 or 9連勝で挑戦権が解放される
    let newPoints=Math.max(0,c.points+pts);
    let bossUnlocked=false,streakChallenge=false;
    if(c.rank!=="SS"){
      if(newPoints>=RANK_REQ[c.rank]){
        newPoints=RANK_REQ[c.rank];
        if(!c.bossReady){c.bossReady=true;bossUnlocked=true;}
      }
      if(!c.bossReady&&(c.winStreak||0)>=9){c.bossReady=true;bossUnlocked=true;streakChallenge=true;}
    }
    const promoted=null,rank=c.rank;
    c.points=newPoints;
    let gpWin=false,gainedSkill=null,gainedItem=null;
    if(raceCtx.isGP&&place===1){
      gpWin=true;c.rec.gp+=1;c.money+=10000;/* 優勝賞金1億円 */
      // GP初制覇で「王者の風格」を獲得
      if(!(c.skills||[]).includes("ouja")){c.skills=[...(c.skills||[]),"ouja"];gainedSkill=acquiredById("ouja");}
    }
    // ── ハードモード周回報酬：勝利数を数え、10勝ごとに特別アイテム、100/200/300勝でスキル ──
    if(raceCtx.hardMode&&place===1){
      c.hardWins=(c.hardWins||0)+1;
      for(const it of HARD_REWARDS){
        if(c.hardWins>=it.at&&!(c.hardItems||[]).includes(it.id)){
          c.hardItems=[...(c.hardItems||[]),it.id];gainedItem=it;
        }
      }
      const msId=HARD_SKILL_MILESTONES[c.hardWins];
      if(msId&&!(c.skills||[]).includes(msId)){c.skills=[...(c.skills||[]),msId];gainedSkill=acquiredById(msId);}
    }
    setCareer(c);saveGame(c);
    if(agariPB)submitRanking(c);
    setGains({pts,money,statKey,statAmt,promoted,gpWin,gainedSkill,gainedItem,lineSweep,hardWins:c.hardWins||0,isHard:!!raceCtx.hardMode,prevRank:rank,newPoints,agari:agari.time,agariPB,agariBest:c.bestAgari,bossUnlocked,streakChallenge,winStreak:c.winStreak,bossName:BOSSES[c.rank]?BOSSES[c.rank].name:null});
    bgm.start("theme");setScreen("interview");
  };

  const onReset=async()=>{await deleteSave();setCareer(null);setSavedData(null);setHasSave(false);bgm.stop();setScreen("title");};

  const goHomeFromResult=()=>{
    let show=false;
    setCareer(prev=>{
      if(!prev)return prev;
      const n=((prev.homeReturns||0)+1);
      show=(n%3===0);
      const c={...prev,homeReturns:n};saveGame(c);return c;
    });
    if(show)setShowAd(true);else setScreen("home");
  };
  const closeAd=()=>{setShowAd(false);setScreen("home");};

  return(
    <div className="app"><style>{CSS}</style>
      <div className="frame">
        {showAd&&<InterstitialAd onClose={closeAd}/>}
        {screen==="title"&&<TitleScreen hasSave={hasSave} onNew={onNew} onContinue={onContinue} onMaxTest={onMaxTest} onRealMode={onRealMode}/>}
        {screen==="real-title"&&<RealTitleScreen hasSave={hasRealSave} onNew={onNewReal} onContinue={onContinueReal} onBack={onRealBack}/>}
        {screen==="real-create"&&<CreateScreen onDone={onCreateReal}/>}
        {screen==="real-home"&&career&&career.mode==="real"&&<RealHomeScreen career={career} onTrain={doRealTrain} onAccept={doAcceptOffer} onDecline={doDeclineOffer} onRace={goRealRace} onRest={doRest} onWatch={()=>setScreen("real-watch")} onBack={()=>setScreen("real-title")}/>}
        {screen==="real-watch"&&career&&career.mode==="real"&&<RealWatchScreen career={career} onCoinsChange={doSetCoins} onBack={()=>setScreen("real-home")}/>}
        {screen==="real-result"&&<RealResultScreen gains={gains} onNext={onRealResultNext}/>}
        {screen==="real-retire"&&career&&career.mode==="real"&&<RealRetireScreen career={career} onRestart={onRestartReal}/>}
        {screen==="intro"&&<IntroScreen onDone={onIntroDone}/>}
        {screen==="create"&&<CreateScreen onDone={onCreate}/>}
        {screen==="senpai"&&career&&<SenpaiIntroScreen career={career} onDone={onSenpaiDone}/>}
        {screen==="home"&&career&&<HomeScreen career={career} onTrain={()=>setScreen("training")} onRace={()=>goRace("real")} onSwitchChar={()=>setScreen("charswitch")} onShop={()=>setScreen("shop")} onEquip={()=>setScreen("equip")} onRanking={()=>setScreen("ranking")} onVersus={()=>setScreen("versus")} onBoss={startBoss} onReset={onReset}/>}
        {screen==="charswitch"&&career&&<CharSwitchScreen career={career} onSelect={doSwitchChar} onSelectSkill={doSelectSkill} onBack={()=>setScreen("home")}/>}
        {screen==="training"&&career&&<TrainingScreen career={career} onPick={doTrain} onBack={()=>setScreen("home")}/>}
        {screen==="shop"&&career&&<ShopScreen career={career} onBuy={doBuy} onBack={()=>setScreen("home")}/>}
        {screen==="equip"&&career&&<EquipScreen career={career} onEquip={doEquip} onEquipAll={doEquipAll} onHardItem={doSelectHardItem} onBack={()=>setScreen("home")}/>}
        {screen==="ranking"&&career&&<RankingScreen career={career} onBack={()=>setScreen("home")}/>}
        {screen==="versus"&&career&&<OnlineVersusScreen career={career} onStartVersus={startVersus} onBack={()=>setScreen("home")}/>}
        {screen==="entry"&&career&&raceCtx&&<EntryScreen career={career} ctx={raceCtx} mode={raceMode} onStart={startRace} onBack={()=>setScreen(raceMode==="versus"?"versus":career.mode==="real"?"real-home":"home")}  showTip={entryTip} onTipClose={closeEntryTip} onGearChange={doSetGear}/>}
        {screen==="race"&&career&&raceCtx&&strategy&&<RaceScreen key={raceKey} ctx={raceCtx} career={career} strategy={strategy} mode={raceMode} onFinish={onRaceFinish}/>}
        {screen==="interview"&&results&&<WinnerInterviewScreen results={results} isPlayerWon={results[0]?.isP} career={career} onDone={()=>setScreen("result")}/>}
        {screen==="result"&&results&&gains&&<ResultScreen results={results} gains={gains} career={career} tele={tele} isMock={raceMode==="mock"} onHome={goHomeFromResult} onEnding={()=>setScreen("ending")}/>}
        {screen==="vsresult"&&results&&vsResult&&<VersusResultScreen results={results} vsResult={vsResult} career={career} onAgain={()=>{if(vsResult.boss){if(vsResult.outcome==="win")setScreen("home");else startBoss();}else setScreen("versus");}} onHome={()=>setScreen("home")}/>}
        {screen==="ending"&&career&&<EndingScreen career={career} onClose={()=>setScreen("home")}/>}
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.app{min-height:100vh;background:#060a14;display:flex;justify-content:center;font-family:'Zen Kaku Gothic New','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;color:#e8ecf6;user-select:none;-webkit-user-select:none;}
.frame{width:100%;max-width:480px;min-height:100vh;background:linear-gradient(180deg,#090f1e 0%,#0c1224 100%);position:relative;overflow:hidden;}
.screen{min-height:100vh;display:flex;flex-direction:column;}
.screen.center{justify-content:center;align-items:center;padding:24px 20px;}
.screen.pad{padding:18px 16px 36px;}
.screen.race{padding:0 0 16px;}
.h2{font-family:'DotGothic16',sans-serif;font-size:21px;margin:2px 2px 12px;letter-spacing:1px;}
.mini{font-size:11.5px;}.dim{color:#8d9cbe;}.bold{font-weight:700;}.em{color:#ffd34d;font-weight:700;}.plus{color:#7ee08a;}.money{color:#ffd34d;font-weight:700;}
.orange{color:#f0a05a;}.green{color:#7ee08a;}
.rowbetween{display:flex;justify-content:space-between;align-items:center;gap:8px;}
.card{background:#131c33;border:1px solid #283655;border-radius:14px;padding:14px;margin-bottom:12px;}
.card.gold{background:#2a2310;border-color:#806a23;}
.btn{border:none;border-radius:14px;font-family:inherit;font-weight:700;cursor:pointer;padding:10px 16px;font-size:14px;color:#e8ecf6;background:#283655;transition:transform .06s;line-height:1.4;}
.btn:active{transform:scale(.97);}.btn.big{width:100%;padding:15px;font-size:16px;}
.btn.primary{background:linear-gradient(135deg,#e8442e,#d12a55);box-shadow:0 4px 16px rgba(232,68,46,.35);}
.btn.ghost{background:#1a2440;border:1px solid #34456e;}
.btn.race{background:linear-gradient(135deg,#e8442e,#f0892e);box-shadow:0 4px 14px rgba(232,68,46,.3);color:#fff;}
.btn.danger{background:#b03030;}.btn:disabled{opacity:.4;}
.btnrow{display:flex;gap:10px;margin-top:10px;}.btn.half{flex:1;font-size:13px;padding:13px 8px;}
.linkbtn{background:none;border:none;color:#5f7099;font-size:11px;text-decoration:underline;cursor:pointer;}
.pulse{animation:pulse 1.6s infinite;}
@keyframes pulse{0%,100%{box-shadow:0 4px 16px rgba(232,68,46,.35);}50%{box-shadow:0 4px 26px rgba(232,68,46,.7);}}

.titlescreen{position:relative;overflow:hidden;}
.flamebg{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
.flame{position:absolute;bottom:-28px;border-radius:50% 50% 48% 48%/64% 64% 36% 36%;background:linear-gradient(to top,#ffd34d 0%,#ff8a2e 38%,#e8442e 70%,rgba(209,42,46,0) 100%);filter:blur(5px);opacity:.82;transform-origin:bottom center;animation:flameUp 1.3s ease-in-out infinite;mix-blend-mode:screen;}
@keyframes flameUp{0%,100%{transform:scaleY(1) scaleX(1) translateY(0);opacity:.78;}25%{transform:scaleY(1.28) scaleX(.86) translateY(-8px);opacity:.95;}55%{transform:scaleY(.82) scaleX(1.12) translateY(2px);opacity:.7;}75%{transform:scaleY(1.16) scaleX(.92) translateY(-5px);opacity:.9;}}
.flameglow{position:absolute;left:0;right:0;bottom:0;height:46%;background:radial-gradient(ellipse at 50% 120%,rgba(232,68,46,.55),rgba(232,68,46,0) 70%);}
.titlewrap{text-align:center;width:100%;max-width:380px;position:relative;z-index:2;}
.zoomstart{opacity:0;transform:scale(2.6);}
.zoomin{animation:zoomIn 1.1s cubic-bezier(.2,.8,.2,1) forwards;}
@keyframes zoomIn{0%{opacity:0;transform:scale(2.6);filter:blur(6px);}60%{opacity:1;filter:blur(0);}100%{opacity:1;transform:scale(1);}}
.titletag{display:inline-block;font-size:11px;background:rgba(26,36,64,.7);border:1px solid #34456e;padding:4px 12px;border-radius:99px;color:#cfd9f0;margin-bottom:14px;}
.gametitle{font-family:'DotGothic16',sans-serif;font-size:52px;margin:0;letter-spacing:3px;font-weight:400;}
.flametitle{position:relative;background:linear-gradient(to top,#ff6a1a 0%,#ffd34d 45%,#fff5cc 80%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:none;filter:drop-shadow(0 0 18px rgba(255,138,46,.7));animation:titleFlicker 2.4s ease-in-out infinite;}
@keyframes titleFlicker{0%,100%{filter:drop-shadow(0 0 18px rgba(255,138,46,.7)) brightness(1);}45%{filter:drop-shadow(0 0 28px rgba(255,180,60,.9)) brightness(1.18);}70%{filter:drop-shadow(0 0 14px rgba(255,100,40,.6)) brightness(.92);}}
.titlesub{color:#ffcaa0;font-size:14px;margin-top:8px;letter-spacing:3px;font-weight:700;}
.flamesub{text-shadow:0 0 12px rgba(232,68,46,.5);}
.titledots{margin:22px 0 26px;display:flex;justify-content:center;gap:7px;}
.titledot{width:15px;height:15px;border-radius:50%;border:1.5px solid #0b0e18;animation:bounce 1.4s infinite;}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-9px);}}
.titlebtns{display:flex;flex-direction:column;gap:10px;}.titlefoot{margin-top:22px;font-size:11.5px;color:#aeb9d6;line-height:1.9;}
.endtrophy{font-size:64px;animation:bounce 1.6s infinite;position:relative;z-index:2;}

.intro{position:relative;}
.skipbtn{position:absolute;top:18px;right:16px;background:rgba(26,36,64,.8);border:1px solid #34456e;color:#cfd9f0;font-size:12px;font-weight:700;padding:8px 14px;border-radius:99px;cursor:pointer;z-index:5;}
.introcard{width:100%;max-width:380px;text-align:center;animation:popin .35s;}
.introicon{font-size:60px;margin-bottom:14px;}.introtitle{font-family:'DotGothic16',sans-serif;font-size:24px;color:#ffd34d;margin-bottom:12px;}
.introbody{font-size:14px;line-height:1.95;color:#dbe3f5;padding:0 6px;}
.introdots{display:flex;gap:8px;margin:26px 0 18px;}.idot{width:9px;height:9px;border-radius:50%;background:#2a3550;transition:all .3s;}.idot.on{background:#ffd34d;width:24px;border-radius:99px;}
.introbtns{width:100%;max-width:380px;}
@keyframes popin{from{transform:scale(.85);opacity:0;}to{transform:scale(1);opacity:1;}}

.fieldlabel{font-size:13px;font-weight:700;color:#b9c6e2;}
.textinput{width:100%;margin-top:8px;padding:13px;border-radius:12px;border:1px solid #34456e;background:#0d1426;color:#fff;font-size:16px;font-family:inherit;}
.regiongrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
.regionbtn{display:flex;align-items:center;justify-content:center;gap:4px;background:#131c33;border:1.5px solid #283655;border-radius:10px;padding:9px 2px;color:#c3cee8;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}
.regionbtn.sel{background:#0d1426;}.regiondot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
.stylecard{display:block;width:100%;text-align:left;background:#131c33;border:1.5px solid #283655;border-radius:14px;padding:13px;margin-bottom:9px;color:inherit;font-family:inherit;cursor:pointer;}
.stylecard.sel{border-color:#e8442e;background:#1d1626;}
.stylehead{display:flex;justify-content:space-between;align-items:center;}.stylename{font-weight:700;font-size:16px;}.selmark{color:#ff8a73;font-size:12px;font-weight:700;}
.styledesc{font-size:12px;color:#9fb0d0;margin-top:5px;line-height:1.6;}.strathint{font-size:11.5px;color:#ffd34d;margin-top:6px;}

.senpaibox{display:flex;gap:10px;align-items:flex-start;}
.senpaiface{font-size:38px;flex-shrink:0;width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:#1a2440;border:2px solid #3a4c7a;border-radius:14px;}
.senpaiface.big{font-size:52px;width:74px;height:74px;}
.senpaibubble{flex:1;background:#141e38;border:1.5px solid #3a4c7a;border-radius:14px;border-top-left-radius:4px;padding:10px 13px;}
.senpainame{font-size:11px;font-weight:800;color:#ff8a73;margin-bottom:3px;}.senpaitag{font-size:9px;background:#3a2418;color:#ffb088;padding:1px 6px;border-radius:99px;margin-left:6px;}
.senpaitext{font-size:13px;line-height:1.7;color:#e6ecfa;}

.reporterbox{display:flex;gap:10px;align-items:flex-start;}
.reporterface{font-size:36px;flex-shrink:0;width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:#1a2440;border:2px solid #3a4c7a;border-radius:14px;}
.reporterbubble{flex:1;background:#0e1c30;border:1.5px solid #2a4060;border-radius:14px;border-top-left-radius:4px;padding:10px 13px;}
.reportername{font-size:11px;font-weight:800;color:#7ee0ff;margin-bottom:3px;}.reportertext{font-size:13px;line-height:1.7;color:#cfe3fa;}

.homeheader{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.homename{font-family:'DotGothic16',sans-serif;font-size:24px;}
.homerank{display:flex;gap:6px;margin-top:5px;align-items:center;flex-wrap:wrap;}
.rankbadge{background:linear-gradient(135deg,#e8442e,#d12a55);font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;}
.stylebadge{background:#283655;font-size:11px;padding:3px 9px;border-radius:99px;}
.regionbadge{font-size:11px;font-weight:700;}
.condbox{border:1.5px solid;border-radius:12px;padding:6px 12px;text-align:center;}.condicon{font-size:19px;}.condlabel{font-size:10.5px;font-weight:700;}
.statrow{display:flex;align-items:center;gap:9px;margin:7px 0;}
.statlabel{width:64px;font-size:12px;color:#9fb0d0;}
.statbarbg{flex:1;height:9px;background:#0d1426;border-radius:99px;overflow:hidden;}
.statbarfill{height:100%;border-radius:99px;transition:width .4s;}.statval{width:30px;text-align:right;font-weight:700;font-size:13px;}
.progbg{height:11px;background:#0d1426;border-radius:99px;overflow:hidden;margin-top:6px;}
.progfill{height:100%;background:linear-gradient(90deg,#e8442e,#ffd34d);border-radius:99px;transition:width .8s;}

.traincard{display:flex;width:100%;gap:12px;align-items:center;text-align:left;background:#131c33;border:1px solid #283655;border-radius:14px;padding:13px;margin-bottom:9px;color:inherit;font-family:inherit;cursor:pointer;}
.traincard:active{background:#1a2440;}.trainicon{font-size:26px;}
.trainbody{display:flex;flex-direction:column;gap:3px;}.trainresult{animation:popin .35s;}

.catbar{display:flex;gap:7px;margin-bottom:14px;overflow-x:auto;}
.catbtn{flex-shrink:0;background:#131c33;border:1.5px solid #283655;border-radius:99px;padding:8px 14px;color:#c3cee8;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}
.catbtn.sel{background:#1d1626;border-color:#e8442e;color:#ff8a73;}
.shopitem{display:flex;gap:12px;align-items:center;background:#131c33;border:1px solid #283655;border-radius:14px;padding:12px;margin-bottom:10px;}
.shopitem.owned{opacity:.6;}.shopicon{font-size:28px;flex-shrink:0;}
.shopbody{flex:1;min-width:0;}.shopname{font-size:14px;font-weight:700;}.shopdesc{font-size:11.5px;color:#9fb0d0;margin-top:3px;line-height:1.5;}
.shopbonus{font-size:11px;color:#7ee08a;margin-top:4px;font-weight:700;}
.shopright{flex-shrink:0;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
.shopprice{font-size:13px;font-weight:700;color:#ffd34d;}.shopbuy{padding:8px 12px;font-size:13px;}.shopowned{font-size:11px;color:#7ee08a;font-weight:700;padding:4px 0;}
.shopitem.soldout{opacity:.5;}
.shopitem.locked{opacity:.45;filter:grayscale(.5);}
.locktag{font-size:9px;background:#333;color:#bbb;padding:1px 6px;border-radius:99px;margin-right:5px;font-weight:700;}.shopitem.deal{border-color:#e8442e;background:#1f1622;}
.dealtag{font-size:9px;background:#e8442e;color:#fff;padding:1px 6px;border-radius:99px;margin-right:5px;font-weight:700;}
.oldprice{font-size:11px;color:#7a8299;text-decoration:line-through;margin-right:3px;}
.shopsoldout{font-size:11px;color:#8d9cbe;font-weight:700;padding:4px 0;}
.slottag{font-size:9px;background:#1a3550;color:#7ee0ff;padding:1px 6px;border-radius:99px;margin-right:5px;font-weight:700;}
.equipplus{color:#7ee08a;font-size:10px;font-weight:800;margin-left:2px;}
.equipslot{background:#131c33;border:1px solid #283655;border-radius:14px;margin-bottom:9px;overflow:hidden;}
.equipslot.open{border-color:#3a4c7a;}
.equipslot-head{display:flex;width:100%;align-items:center;gap:11px;background:none;border:none;color:inherit;font-family:inherit;padding:13px 14px;cursor:pointer;text-align:left;}
.equipslot-icon{font-size:24px;flex-shrink:0;}
.equipslot-body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.equipslot-label{font-size:11px;color:#8d9cbe;font-weight:700;}
.equipslot-item{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.equipslot-bonus{font-size:10.5px;color:#7ee08a;font-weight:700;margin-left:4px;}
.tierstars{color:#ffd34d;font-size:9px;margin-right:4px;letter-spacing:1px;vertical-align:1px;}
.seriestag{font-size:9px;border:1px solid currentColor;border-radius:99px;padding:1px 6px;margin-left:6px;font-weight:700;white-space:nowrap;}
.setgrid{display:flex;flex-wrap:wrap;gap:6px;}
.setchip{display:flex;flex-direction:column;gap:1px;border:1.5px solid;border-radius:10px;padding:5px 9px;min-width:86px;background:#0d1426;transition:all .2s;}
.setchip.on{background:#101c30;box-shadow:0 0 10px currentColor inset;}
.setchip-name{font-size:10px;font-weight:800;}
.setchip-cnt{font-size:12px;font-weight:800;}
.setchip-fx{font-size:9px;font-weight:700;}
.equipdiff{font-size:10px;margin-top:2px;color:#8d9cbe;}
.diffup{color:#7ee08a;font-weight:800;}
.diffdown{color:#f06a6a;font-weight:800;}
.equipslot-empty{font-size:13px;color:#5a6c98;}
.equipslot-arrow{color:#5a6c98;font-size:11px;}
.equipslot-list{border-top:1px solid #1e2d45;padding:6px 10px 10px;}
.equipitem{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid #17223a;}
.equipitem:last-child{border-bottom:none;}
.equipitem.on{background:#14251a;border-radius:9px;padding:8px;}
.equipitem-body{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}

.rankhero{display:flex;justify-content:space-between;align-items:flex-end;background:#131c33;border:1px solid #283655;border-radius:14px;padding:14px 16px;margin-bottom:12px;}
.rankbig{font-family:'DotGothic16',sans-serif;font-size:34px;color:#7ee0ff;line-height:1.1;}
.rankpos{font-family:'DotGothic16',sans-serif;font-size:30px;color:#ffd34d;line-height:1.1;}
.ranksec{font-size:14px;margin-left:2px;}
.rankrow{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:9px;}
.rankrow.me{background:linear-gradient(90deg,#2a2310,#1f1d12);border:1px solid #c9a227;}
.rankno{width:26px;text-align:right;font-weight:800;font-size:13px;color:#8d9cbe;}
.rankmedal{width:18px;font-size:13px;}
.rankname{flex:1;font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rankrow.me .rankname{font-weight:800;color:#ffd34d;}
.ranktime{font-family:'DotGothic16',sans-serif;font-size:15px;color:#cfe3fa;}
.rankrow.me .ranktime{color:#ffd34d;}
.rankgap{text-align:center;color:#5a6c98;font-size:14px;padding:2px 0;letter-spacing:2px;}
.rankbadge2{font-size:9.5px;color:#cfd9f0;background:#283655;padding:2px 7px;border-radius:99px;white-space:nowrap;}
.rankrow.me .rankbadge2{background:#5a4a1a;color:#ffd9a0;}

.agaribox{margin-top:10px;background:#0e1c2e;border:1px solid #234058;border-radius:11px;padding:10px 12px;}
.agaritime{font-family:'DotGothic16',sans-serif;font-size:22px;color:#7ee0ff;}
.agaripb{margin-top:6px;font-size:12px;color:#ffd34d;font-weight:700;line-height:1.6;}

.lineband{display:flex;align-items:center;gap:8px;padding:6px 12px 2px;}
.lineband-label{font-size:10px;font-weight:800;color:#8d9cbe;flex-shrink:0;letter-spacing:1px;}
.lineband-scroll{display:flex;gap:7px;overflow-x:auto;padding-bottom:2px;}
.lineband-grp{display:flex;align-items:center;gap:3px;border:1.5px solid;border-radius:9px;padding:3px 6px 3px 5px;flex-shrink:0;background:#10182c;}
.lineband-grp.solo{background:#1a1608;}
.lineband-region{font-size:9.5px;font-weight:700;margin-right:2px;}
.lineband-chip{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:5px;font-size:11px;font-weight:800;border:1px solid;}
.lineband-chip.me{box-shadow:0 0 0 2px #ffd34d;}

.racead-adsense{width:100%;min-height:50px;background:#0a1120;overflow:hidden;}
.adbody-adsense{min-height:250px;background:#0a1120;display:flex;align-items:center;justify-content:center;}

.linegroup{border:1.5px solid;border-radius:13px;padding:9px 11px;margin-bottom:9px;background:#10182c;}
.linehead{font-size:11px;font-weight:700;margin-bottom:5px;letter-spacing:1px;}
.riderrow{display:flex;align-items:center;gap:9px;padding:5px 2px;}.riderrow.me{background:#2a2310;border-radius:9px;padding:5px 7px;}
.riderrow.opp{background:#2a1620;border:1px solid #7a3050;border-radius:9px;padding:5px 7px;}.riderrow.opp .ridername{color:#ff8a73;font-weight:700;}
.carchip{display:inline-flex;align-items:center;justify-content:center;border-radius:7px;font-weight:800;flex-shrink:0;}
.ridername{flex:1;font-size:13px;font-weight:500;}.riderstyle{font-size:11px;color:#9fb0d0;background:#283655;padding:2px 7px;border-radius:99px;}
.riderstars{font-size:10px;color:#ffd34d;letter-spacing:1px;}.placecell{width:38px;font-weight:800;font-size:13px;color:#ffd34d;}

.racetop{display:flex;justify-content:space-between;align-items:center;padding:10px 16px 6px;}
.racemode{font-size:13px;font-weight:800;color:#ffd34d;}.racestrat{font-size:11.5px;color:#9fb0d0;}
.racevenue{font-size:11px;color:#9fb0d0;flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

.vsturn{font-family:'DotGothic16',sans-serif;font-size:26px;}
.vsbike{font-size:54px;width:96px;height:96px;display:flex;align-items:center;justify-content:center;border:3px solid;border-radius:24px;background:#10182c;}
.vsbigtime{font-family:'DotGothic16',sans-serif;font-size:52px;line-height:1.1;}
.sweepbar{position:relative;width:100%;max-width:340px;height:42px;background:#10182c;border:1.5px solid #283655;border-radius:12px;overflow:hidden;}
.sweepzone{position:absolute;left:calc(50% - 26px);top:0;bottom:0;width:52px;background:linear-gradient(90deg,rgba(126,224,138,0.15),rgba(126,224,138,0.4),rgba(126,224,138,0.15));border-left:2px solid #7ee08a;border-right:2px solid #7ee08a;}
.sweepmarker{position:absolute;top:3px;bottom:3px;width:6px;border-radius:3px;background:#ffd34d;box-shadow:0 0 10px rgba(255,211,77,0.8);animation:sweep 1.1s linear infinite alternate;}
@keyframes sweep{from{left:4px;}to{left:calc(100% - 10px);}}
.vsmashtimerwrap{width:100%;max-width:320px;height:7px;background:#0d1426;border-radius:99px;overflow:hidden;margin:14px 0 4px;}
.vsmashtimer{height:100%;width:100%;border-radius:99px;background:#ffd34d;animation:mashtimer 3s linear forwards;}
@keyframes mashtimer{from{width:100%;}to{width:0%;}}
.vswinner{font-family:'DotGothic16',sans-serif;font-size:30px;color:#ffd34d;text-align:center;text-shadow:0 0 18px rgba(255,211,77,0.5);}
.vscompare{display:flex;align-items:center;gap:12px;margin-top:24px;}
.vscol{background:#131c33;border:1.5px solid #283655;border-radius:16px;padding:16px 18px;text-align:center;min-width:96px;}
.vscol.win{border-color:#c9a227;background:#2a2310;box-shadow:0 4px 18px rgba(201,162,39,0.3);}
.vscolname{font-size:12px;font-weight:700;margin-bottom:6px;}
.vscoltime{font-family:'DotGothic16',sans-serif;font-size:30px;color:#fff;line-height:1.1;}
.vsvs{font-family:'DotGothic16',sans-serif;font-size:18px;color:#5a6c98;}
.vsrecord{font-size:11px;font-weight:700;color:#9fb0d0;background:#1a2440;border:1px solid #34456e;border-radius:99px;padding:3px 10px;}
.vsoppcard{margin-top:12px;background:#131c33;border:1.5px solid #3a4c7a;border-radius:18px;padding:18px 22px;text-align:center;animation:popin .35s;}
.vsoppava{font-size:46px;line-height:1;}
.vsoppname{font-family:'DotGothic16',sans-serif;font-size:20px;margin-top:6px;}
.vsoppmeta{margin-top:8px;display:flex;align-items:center;justify-content:center;}
.vsoppghost{margin-top:10px;font-size:13px;color:#5a6c98;letter-spacing:1px;}

.adoverlay{position:fixed;inset:0;background:rgba(3,5,10,0.92);display:flex;align-items:center;justify-content:center;padding:20px;z-index:200;animation:popin .25s;}
.adcard{width:100%;max-width:360px;background:#0c1120;border:1px solid #283655;border-radius:18px;overflow:hidden;}
.adbar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#10182c;}
.adlabel{font-size:10px;font-weight:800;color:#8d9cbe;background:#0a1120;border:1px solid #34456e;border-radius:4px;padding:2px 7px;letter-spacing:1px;}
.adcount{font-size:13px;font-weight:800;color:#8d9cbe;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:2px solid #34456e;border-radius:50%;}
.adclose{background:#283655;border:none;color:#e8ecf6;font-size:12px;font-weight:700;padding:6px 12px;border-radius:8px;cursor:pointer;}
.adbody{padding:34px 20px;text-align:center;}
.adicon{font-size:54px;line-height:1;}
.adtitle{font-family:'DotGothic16',sans-serif;font-size:26px;margin-top:12px;letter-spacing:1px;}
.adsub{font-size:12px;opacity:0.85;margin-top:8px;}
.adcta{display:inline-block;margin-top:18px;background:rgba(0,0,0,0.25);border:1.5px solid rgba(255,255,255,0.5);color:inherit;font-size:13px;font-weight:700;padding:8px 20px;border-radius:99px;}
.adnote{font-size:10px;color:#5a6c98;text-align:center;padding:9px 12px;background:#10182c;}
.canvaswrap{position:relative;}.canvaswrap canvas{display:block;width:100%;}
.banner{position:absolute;top:34%;left:0;right:0;text-align:center;animation:bannerin .3s;pointer-events:none;}
@keyframes bannerin{from{transform:scale(1.5);opacity:0;}to{transform:scale(1);opacity:1;}}
.bannermain{font-family:'DotGothic16',sans-serif;font-size:30px;color:#ffd34d;text-shadow:0 2px 14px rgba(0,0,0,.9),0 0 24px rgba(255,211,77,.5);letter-spacing:2px;}
.bannersub{font-size:13px;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.9);margin-top:3px;}
.feed{position:absolute;left:8px;bottom:58px;right:8px;pointer-events:none;}
.feedline{font-size:11.5px;color:#fff;background:rgba(8,12,24,.7);border-left:2px solid #ff8a73;padding:3px 8px;border-radius:4px;margin-top:3px;display:inline-block;animation:feedin .25s;text-shadow:0 1px 4px rgba(0,0,0,.8);}
@keyframes feedin{from{transform:translateX(-12px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.phaselabel{text-align:center;font-size:12px;color:#ffd34d;padding:6px 12px 2px;font-weight:700;}
.stamwrap{display:flex;align-items:center;gap:9px;padding:6px 16px 4px;}
.stambg{flex:1;height:15px;background:#0d1426;border:1px solid #283655;border-radius:99px;overflow:hidden;}
.stamfill{height:100%;border-radius:99px;transition:width .15s,background .3s;}.draftind{font-size:10.5px;color:#7ee0ff;width:64px;transition:opacity .3s;}
.controls{padding:8px 16px 0;min-height:172px;}
.posrow{display:flex;gap:9px;margin-bottom:9px;}
.posbtn{flex:1;background:#1a2440;border:1.5px solid #34456e;border-radius:14px;color:#fff;font-size:19px;font-weight:800;padding:13px 4px;font-family:inherit;cursor:pointer;line-height:1.4;}
.posbtn:active{background:#34456e;}.poscenter{width:86px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.5;}
.spurtwait{text-align:center;padding:13px;background:#10182c;border-radius:12px;line-height:1.7;}
.spurtbtn{width:100%;padding:19px;border:none;border-radius:16px;font-family:'DotGothic16',sans-serif;font-size:25px;letter-spacing:2px;color:#fff;background:linear-gradient(135deg,#e8442e,#d12a55);box-shadow:0 4px 22px rgba(232,68,46,.55);cursor:pointer;animation:pulse 1.1s infinite;}
.mashzone{text-align:center;cursor:pointer;padding-top:4px;}
.sprinter{margin:0 auto;width:168px;height:148px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 30%,#ff7a5c,#e8442e 55%,#b51f3c);box-shadow:0 5px 26px rgba(232,68,46,.6);}
.sprbike{font-size:62px;line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.4));transition:transform .06s;}
.sprpush{font-family:'DotGothic16',sans-serif;font-size:26px;color:#fff;letter-spacing:2px;margin-top:2px;}
.sprinter.a .sprbike{transform:translateX(-7px) rotate(-7deg) scale(1.04);}
.sprinter.b .sprbike{transform:translateX(7px) rotate(7deg) scale(1.04);}

.interviewtag{display:inline-block;background:linear-gradient(135deg,#e8442e,#d12a55);font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px;margin-bottom:14px;letter-spacing:1px;}
.wincard{background:#1a2438;border:1.5px solid #c9a227;border-radius:16px;padding:16px;text-align:center;margin-bottom:4px;}

.resulthero{text-align:center;padding:19px;border-radius:16px;background:#131c33;border:1px solid #283655;margin-bottom:12px;}
.resulthero.podium{background:#1d2a18;border-color:#4a7a3a;}.resulthero.win{background:#2a2310;border-color:#c9a227;animation:popin .4s;}
.resultplace{font-family:'DotGothic16',sans-serif;font-size:52px;color:#ffd34d;line-height:1.1;}.resultchaku{font-size:22px;margin-left:3px;}
.promo{animation:popin .45s;}
.streakbadge{font-size:10px;font-weight:800;color:#ffb066;background:#2a1810;border:1px solid #7a4020;border-radius:99px;padding:2px 8px;}

.overlay{position:fixed;inset:0;background:rgba(4,7,14,.78);display:flex;align-items:center;justify-content:center;padding:22px;z-index:50;}
.tutcard{width:100%;max-width:400px;background:#141e38;border:1.5px solid #3a4c7a;border-radius:18px;padding:20px;animation:popin .3s;}
.tutstep{font-size:10.5px;color:#ff8a73;font-weight:800;letter-spacing:2px;margin-bottom:5px;}
.tuttitle{font-family:'DotGothic16',sans-serif;font-size:21px;color:#ffd34d;margin-bottom:9px;}
.tutbody{font-size:13.5px;line-height:1.9;color:#dbe3f5;margin-bottom:13px;}
.tutunlock{font-size:11.5px;color:#7ee0ff;background:#0e2233;border-radius:9px;padding:8px 11px;margin-bottom:13px;}

/* ── キャラクター選択カード ── */
.charcard{display:flex;gap:12px;width:100%;text-align:left;align-items:stretch;background:#131c33;border:1.5px solid #283655;border-radius:16px;padding:12px;margin-bottom:10px;color:inherit;font-family:inherit;cursor:pointer;transition:border-color .15s,background .15s;}
.charcard.sel{background:#161f38;box-shadow:0 4px 20px rgba(0,0,0,.35);}
.charface{flex-shrink:0;width:60px;height:60px;display:flex;align-items:center;justify-content:center;font-size:34px;border:2px solid;border-radius:14px;transition:background .15s;}
.charbody{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;}
.charhead{display:flex;align-items:center;gap:8px;}
.charname{font-family:'DotGothic16',sans-serif;font-size:17px;font-weight:400;}
.charstyle{font-size:11px;font-weight:800;background:#0d1426;border-radius:99px;padding:2px 9px;}
.charcatch{font-size:11.5px;color:#aeb9d6;font-style:italic;}
.charskill{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;background:#0d1426;border-radius:9px;padding:6px 9px;margin-top:2px;}
.charskill-icon{font-size:14px;}
.charskill-name{font-size:12px;font-weight:800;flex-shrink:0;}
.charskill-desc{font-size:10.5px;color:#9fb0d0;line-height:1.5;}

/* ── レース中：手動スキル発動ボタン ── */
.skillbtn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;margin-bottom:9px;padding:11px 10px;border-radius:14px;border:2px solid;background:#0d1426;font-family:'DotGothic16',sans-serif;font-size:17px;letter-spacing:1px;cursor:pointer;transition:transform .06s;}
.skillbtn.ready{animation:skillpulse 0.9s infinite;}
.skillbtn.ready:active{transform:scale(.96);}
.skillbtn.used{opacity:.55;font-size:14px;cursor:default;}
.skillbtn-sub{font-family:'Zen Kaku Gothic New',sans-serif;font-size:10.5px;font-weight:700;opacity:.85;letter-spacing:0;}
@keyframes skillpulse{0%,100%{box-shadow:0 0 12px var(--glow,rgba(255,211,77,.4));transform:scale(1);}50%{box-shadow:0 0 26px var(--glow,rgba(255,211,77,.8));transform:scale(1.02);}}
.sprinter.skillon{background:radial-gradient(circle at 40% 30%,#fff0a0,#ffb42e 50%,#e8622e);box-shadow:0 5px 30px rgba(255,180,46,.85);animation:skillflash .4s;}
@keyframes skillflash{from{filter:brightness(2.2);}to{filter:brightness(1);}}

/* ── スキル カットイン演出（画面いっぱいの一瞬の見せ場）── */
.skillcut{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;z-index:12;animation:skillcutfade 1.5s forwards;}
@keyframes skillcutfade{0%{opacity:0;}8%{opacity:1;}82%{opacity:1;}100%{opacity:0;}}
.skillcut-rays{position:absolute;width:200%;height:200%;background:repeating-conic-gradient(from 0deg,var(--skc,#ffd34d) 0deg 5deg,transparent 5deg 12deg);opacity:.16;animation:skillrays 1.5s linear;}
@keyframes skillrays{from{transform:rotate(0deg) scale(1);}to{transform:rotate(60deg) scale(1.15);}}
.skillcut-body{position:relative;text-align:center;animation:skillbodyin .45s cubic-bezier(.15,.9,.2,1) forwards;}
@keyframes skillbodyin{0%{transform:translateY(26px) scale(.7);opacity:0;}60%{transform:translateY(0) scale(1.08);opacity:1;}100%{transform:translateY(0) scale(1);opacity:1;}}
.skillcut-icon{font-size:52px;line-height:1;filter:drop-shadow(0 2px 10px rgba(0,0,0,.7));animation:skilliconspin .6s ease-out;}
@keyframes skilliconspin{from{transform:rotate(-30deg) scale(1.6);}to{transform:rotate(0) scale(1);}}
.skillcut-name{font-family:'DotGothic16',sans-serif;font-size:40px;letter-spacing:3px;margin-top:4px;color:#fff;text-shadow:0 0 4px var(--skc,#ffd34d),0 0 18px var(--skc,#ffd34d),0 3px 8px rgba(0,0,0,.9);}
.skillcut-tag{display:inline-block;margin-top:6px;font-size:11px;font-weight:800;letter-spacing:3px;color:#0b0e18;background:var(--skc,#ffd34d);padding:3px 14px;border-radius:99px;box-shadow:0 2px 10px rgba(0,0,0,.5);}
/* 敵（ボス）スキルのカットイン：赤の警告色＋暗転で「くらった」感を出す */
.skillcut.enemy{background:rgba(40,4,8,.35);}
.skillcut.enemy .skillcut-rays{opacity:.22;}
.skillcut.enemy .skillcut-name{text-shadow:0 0 4px #ff4a3a,0 0 22px #ff4a3a,0 3px 8px rgba(0,0,0,.9);}
.skillcut.enemy .skillcut-tag{color:#fff;background:#b02020;}
/* P6：車券チップボタン（賭式・車番・枠番・賭け枚数の選択に共用）*/
.chipbtn{padding:8px 14px;border-radius:99px;border:1.5px solid #34456e;background:#131c33;color:#e8ecf6;font-size:13px;cursor:pointer;}
.chipbtn.sel{border-color:#ffd34d;color:#ffd34d;background:#2a2310;}
`;
