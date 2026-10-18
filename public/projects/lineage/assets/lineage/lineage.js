/* ============================================================
 * lineage.js —— 帝王世系图引擎模块（跨王朝壳页面共享）
 *
 * 壳页面只需：
 *   1. <link> han.css 与 lineage.css
 *   2. <main id="main-content" tabindex="0"> 内放画板骨架 markup
 *      （.board-frame / .bankou(svg×2 + .bt×2 + .sp) / #heading(h1+p) /
 *        svg#lines，可从 ming_lineage.html 原样复制）+ <footer>
 *   3. <script type="text/plain" id="lineage-data"> 数据块 </script>
 *   4. <script src="assets/lineage/lineage.js"></script>
 *
 * 数据块 v5 格式：
 *   缩进（Tab 或 2 空格）= 下一辈
 *   每行：名字|称号|母亲|即位年|在位年   （后诸段均可留空或整段省略，
 *     只有名字一行亦合法；各栏空位自动向内递补）
 *     称号栏＝纯称号（通体朱书），多称号空格接写、余节为次run分槽；
 *     年号＝独立段「年號 正統 天順」（简繁均认、位置无关、一行至多一个），
 *     显示拼接于称号后为朱色次run——旧式称号后空格接写年号已废；
 *     位次（前缀＋第N位＋位次用字）与排行「皇長子」两栏自动生成、无需书写；
 *     即位年/在位年君主与藩王行书于行尾按段（复辟按段顺 |1435|14|1457|8），
 *     年与年数各自可单书不必成对（|1617 只即位年、|9月 只在位年）：
 *     行尾裸数逐字段归类——负数或 ≥100＝即位年（纪年皆三位以上、负号
 *     自明公元前），<100 裸数或缀 月/天 ＝在位年（无在位及百载者）；
 *     即位栏串有年诸段（每段自足「前＋数＋年」、段间「与」接）结名单结词
 *     （@throne 内嵌括号对「前缀[首位,后续]:」定之，如 明朝[開國,即位]:、
 *     趙藩[受封,襲封]:；结词书繁照显；漏书兜底「開國/即位」并告警），
 *     在位栏合有年数诸段大写；两栏各按有无独立生成、缺栏递补贴位；
 *     在位年得带单位缀（月/天，缺省即年，如 |1月、|60天）：年月并月
 *     （1年=12月）、天自为计——天不升格为月，大单位在场时天径弃；
 *     纯年显年、满一年显年（弃月弃天）、满一月显月（弃天）、纯天显天，
 *     数皆大写；
 *     排行栏得附序齒：行内独立段「序齒N」（N 阿拉伯数字，简繁均认；
 *     位置无关——习惯收行尾，年段之后亦合法；一行至多一个），解析时
 *     先摘（不占字段位、不误触年段归类告警），显示为排行后空一字接排
 *     「序齒N子」（序數同齿序用字：1 長、2 次、叁起大写；同墨黑）；
 *     不写即无（殤夭未序齒者省）
 *     排行栏得缀無嗣：行内独立段「無嗣」（简繁均认；位置无关、一行至多
 *     一个，解析先摘同上），显示为排行（有序齒则序齒）后空一字接排
 *     「無嗣」（显示统一繁体；同墨黑、同随栏加粗）；無嗣而有后则告警
 *   # 开头为说明行；@key=value 为页面设置：
 *     @title    卷端大题（如：大明帝系）
 *     @subtitle 卷端副题（可空）
 *     @juan     书口刻书题（默认 @title + 「卷一」）
 *     @leaf     书口叶码（默认「一」）
 *     @seal     右端题识下方印图径（省略即无；方印边长定值 100px、题识块下
 *               居中，恒坐题识文字实际底缘之下留距、不覆字）
 *     @throne   君位传承有序名单（一行一名单、可多行，按书写序；带序号键
 *             @throneN＝检索排序 N 级——@throne 为 1 级（帝王）、@throne2
 *             为 2 级（藩王）、@throne3 为 3 级（郡王），越号照号认；同号
 *             多行＝同级按书写序；坏号告警后按 1 级视、不弃行；一人挂多
 *             名单取最小号，不属任何名单者（宗室）＝最大级＋1 垫底），
 *             条目＝名字|称号（与
 *             人物行严格匹配——称号＝称号栏首节或全串（多称号行如
 *             「趙惠王 安陽王」整串亦中，次节单写不中），重名赖称号甄别；
 *             裸名为旧式，歧义即告警跳过），
 *             值可带「前缀[首位,后续]:」——前缀（如 明朝: / 晉國:）用作
 *             位次前缀，括号对＝该名单首条/后续条即位栏结词（如
 *             明朝[開國,即位]:、趙藩[受封,襲封]:；书繁照显，漏书
 *             兜底 開國/即位并告警），
 *             位次按各名单独立编序（复辟重入列不占号）；
 *             前缀含「藩」（如 趙藩:、鄭藩新平:）＝藩王传承名单：成员不
 *             加粗、其子排行不冠皇字，位次＝「@prince-prefix 值＋第N位＋
 *             藩名王」（藩名＝藩后诸字、无则藩前：明朝第壹位趙王、
 *             明朝第壹位新平王），浮层照进（@focus-skip=藩前缀 可剔）；
 *             藩设计仅限明壳（2026-10-14 用户定谳，勿扩他朝）
 *     @rank-word  位次用字（缺省「皇帝」）；值非「皇帝」时排行不冠皇字，
 *             先秦壳可改 國君（位次即「晉國第壹位國君」）
 *     @prince-prefix  藩位次展示前缀（可省，省则用书写前缀「趙藩」）：
 *             明壳书 明朝 → 藩位次显「明朝第壹位趙王」
 *
 * 图渲染数据块全部人物；名单成员（君）诸栏加粗（君主至七栏）、位次带前缀编号；
 * 连线仅父子血缘墨线（梳式正交），帝位传承不画线。
 * 本模块负责：墨洇滤镜 defs 注入、版框/书口/题识骨架搭建、
 * 字体逐字回落、竖排树布局、父子墨线、悬浮传位层、开卷主干居中。
 * @focus-skip=前缀,…  该前缀名单不入悬浮传位层（其成员悬停无反应）
 * @throne-link=前缀A>前缀B,…  跨名单传位边：A 名单末位→B 名单首位，
 *             入悬浮传位层与顺接边同权（前缀未匹配告警跳过；位次编序不受影响）
 * @alias=主名[|称号]>别名1,别名2  别名条（可多行）：别名只入检索不渲染——
 *             寻人即中（名次并入名字级：全同=0、子串=1）、#别名 深链亦定位
 *             （定位后地址栏回写主名）；候选小笺仍只显主名。
 *             匹配规则同 @throne：裸名须全树唯一，重名赖称号甄别，
 *             歧义或无人匹配经告警跳过
 * ============================================================ */
"use strict";

/* 引擎自身脚本源址（含 ?v= 令牌）：罕字墨图分册 rare-ink.js 与之同目录
   同令牌派生。document.currentScript 只在本脚本同步求值期间有效——IIFE
   首个 await 之后即空，故必须在此顶层捕获 */
const ENGINE_SRC = (document.currentScript && document.currentScript.src) || "";

(async function () {

/* 网络字体（文悦古体仿宋2 / 霞鹜文楷等宽 Light 子集）就绪后再探测与渲染：
   canvas 比对依赖字形已加载。allSettled 而非 all——一库加载失败（如观者
   侧网络断）不得取消对另一库的等待，否则探针在主字库未就绪时误判含字 */
try {
  await Promise.allSettled([
    document.fonts.load('64px "文悦古体仿宋2"', "朱元璋帝系世號母親卷一"),
    document.fonts.load('64px "LXGW WenKai Fallback"', "朱元璋帝系世號母親卷一")
  ]);
} catch (e) { /* 加载失败则沿字体链回落，不阻塞渲染 */ }

/* ---------- 合成加粗探测：部分移动端引擎（典型：iOS WebKit）对无 Bold 面
   之网字体不做合成加粗（font-weight:700 渲染与 400 全同），君主行/大题/
   代标诸 700 处加粗尽失（用户真机报「皇帝加粗无法感知」）。引擎系谱不可
   恃——Windows 版 WebKit 仿形实测有合成——故以 canvas 行为探针定谳：
   文悦上已显式预载，以 400/700 两度渲染「帝」比 alpha 指纹：全同＝无合成，
   html 挂 .nosyn，css 将七处 700 改 400＋描边仿粗（袭 .bb 既有校准常量
   .05em，观感与 Chromium 合成加粗齐平）；有合成之引擎（Chromium 系桌面
   与安卓）不挂类，桌面观感像素不动。文悦缺席（离线回落）则不判——
   挂类与否皆改现状，宁守旧观。探针先于建板，类名早挂无后闪。 */
try {
  if (document.fonts.check('64px "文悦古体仿宋2"', "帝")) {
    const sbCv = document.createElement("canvas");
    sbCv.width = sbCv.height = 96;
    const sbCtx = sbCv.getContext("2d", { willReadFrequently: true });
    const sbShot = function (w) {
      sbCtx.clearRect(0, 0, 96, 96);
      sbCtx.font = w + ' 64px "文悦古体仿宋2", serif';
      sbCtx.textAlign = "center"; sbCtx.textBaseline = "middle";
      sbCtx.fillStyle = "#000";
      sbCtx.fillText("帝", 48, 48);
      return sbCtx.getImageData(0, 0, 96, 96).data;
    };
    const sbA = sbShot(400), sbB = sbShot(700);
    let sbDiff = 0;
    for (let i = 3; i < sbA.length; i += 4) if (sbA[i] !== sbB[i]) sbDiff++;
    if (sbDiff < 24) document.documentElement.classList.add("nosyn");
  }
} catch (e) { /* 探针失败守现状：不挂类 */ }

/* ---------- 墨洇滤镜 defs 注入（版框/鱼尾用；文字与连线不洇） ---------- */
document.body.insertAdjacentHTML("afterbegin", `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <!-- 墨线＝位移溢边 × 浓淡掩模 × 枯笔掩模：低频噪声调透明度成浓淡，
       高频噪声出飞白枯笔，均为透明度渐变模拟（国风水墨笔意） -->
  <filter id="ink-bleed" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.005 0.007" numOctaves="2" seed="21" result="tone"/>
    <feColorMatrix in="tone" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.8 0 0 0 0.62" result="mA"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves="2" seed="33" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.3 0 0 0 0.35" result="gA"/>
    <feComposite in="mA" in2="gA" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="mask"/>
    <feComposite in="disp" in2="mask" operator="in"/>
  </filter>
  <filter id="ink-halo" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="11" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="1.8" result="b"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="41" result="tone2"/>
    <feColorMatrix in="tone2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0.5" result="m2"/>
    <feComposite in="b" in2="m2" operator="in"/>
  </filter>
  <filter id="ink-bleed-sm" x="-15%" y="-15%" width="130%" height="130%">
    <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" seed="5" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="27" result="tone3"/>
    <feColorMatrix in="tone3" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 0.55" result="m3"/>
    <feComposite in="disp" in2="m3" operator="in"/>
  </filter>
</svg>`);

/* ---------- 几何令牌：从 lineage.css 读取，与样式单一事实来源 ---------- */
const cssVars = getComputedStyle(document.documentElement);
const px = function (name) { return parseFloat(cssVars.getPropertyValue(name)); };
const COL_W = px("--lineage-col-w");
const GAP_X = px("--lineage-gap-x");           /* 列间距（通道机器已撤，纯留白） */
const PITCH = COL_W + GAP_X;                   /* 列步长＝一格 + 一间距 */
const GAP_Y = px("--lineage-gap-y");
const PAD_TOP = px("--lineage-off-y");
const GEN_W = px("--lineage-gen-w");          /* 版框内左侧代标带 */
const NAME_FS = px("--lineage-name-fs");
const ANNO_FS = px("--lineage-anno-fs");
const SIDE_GAP = px("--lineage-side-gap");
/* 版框常量（与 .board-frame inset 一致） */
const FR_T = 14, FR_R = 14, FR_B = 14, FR_L = 64;

/* ---------- 逐字回落判定：主字库文悦古体仿宋2 是否真含某字 ----------
   两级判定：①确定性清单 MAIN_MISSING（工具以 fontTools 实测源字库生成：
   cmap 未登记 ∪ 登记但轮廓与 .notdef 逐字节同——源字库对缺字登记空框槽）
   命中即缺，跨引擎一致；②未列者走 canvas 空框指纹探针兜底
   （数据已改而工具未重跑之页）——源字库 cmap 对缺字也登记，「单字库 vs
   字库链」比对会误判为含字，故比空框指纹；cmap 全未登记的字（如 BMP 外）
   canvas 静默回落，再比回落链指纹补判。探针恃引擎对非字符的 .notdef
   渲染行为，Firefox 类引擎有误判之虞——清单在则不倚之。
   注：2026-10-13 起子集分区，缺字已不入 woff2 子集 cmap（浏览器逐字回落
   只看 cmap，未包裹语境遂天然落霞鹜一级）；本判定仍为板上 .fbc/.ink
   逐字包裹之据——横排几何中和与粗栏描边仿粗，唯包裹可控。 */
const probeCv = document.createElement("canvas");
probeCv.width = probeCv.height = 96;
const probeCtx = probeCv.getContext("2d", { willReadFrequently: true });
const probeCache = new Map();
const MAIN_PROBE_FONT = '64px "文悦古体仿宋2"';   /* 与 lineage.css @font-face 同步 */
const FALLBACK_PROBE_FONT = '64px "LXGW WenKai Fallback", "LXGW WenKai Mono", "LXGW WenKai", "霞鹜文楷等宽", "霞鹜文楷", "Songti SC", "STSong", "SimSun", "宋体", "NSimSun", "SimSun-ExtB", "SimSun-ExtG", serif';   /* 与 .fbc 回落链同源 */
let notdefSig = null;

/* ===== 工具生成区（tools/subset-fonts.mjs 维护，标记之间勿手改）=====
   MAIN_MISSING＝采集字集中文悦子集实测缺字（cmap 未登记者 ∪ cmap 登记但
   字形轮廓与 .notdef 逐字节同者）；mainHas 命中即判缺，确定性、跨引擎
   一致。RARE_CHARS＝两库俱缺之扩展B/G罕字字表（纯字符集，判懒加载之用）；
   墨图本体已外置 assets/lineage/rare-ink.js（2026-10-15 分册，引擎本体
   自此不带约四百 KB base64）——数据块含罕字才注入，载毕补墨，详见下方
   「罕字墨图懒加载」节。 */
/*==subset-tool:main-missing:start==*/
const MAIN_MISSING = new Set("≥〃〄々〆〒〓〘〙〚〛〜〝〞〟〠〡〢〣〤〥〦〧〨〩〪〭〮〯〫〬〰〱〲〳〴〵〶〷〸〹〺〻〼〽〾〿㙂㙊㙺㡑㬙㭎㭕㭶㭿㮧㮵㰒㰘㳛㳻㴋㷑㸅䂵䄉䄔䦃䵺佰倛僰僵勲圳坅坋坖坺坾垍垐垝垬垶垸垹埈埌埢埨堈堉堼塎塙塽墒墡墣墭墱墲墽墿壄壐壡妞巃悊愨慭憖昐晀晥暚曕曣朾杙杬枔枟枬栃栐栭桱梈梮梸棅棆棌棡棪棿椫椮楎楒楧楩楪楬榉榐榑榘榰槆槚槢槮樉樘樿橏橒橓橚橞檍檟檡檭檽櫍櫑櫭櫸欘汌沄沋沘泘泴泿洐洤浤涪淓淔淕淰淲淴渲渻渼湉湢湳溆溙滏漎漵潚潾澋澐濍瀷灂灮炆炔炟炣烃烇烨烱烴烶烷烺焀焆焌焟焯焴煃熜熞熠熥熧熲熽熿燀燁燝爃爔爥獳玟珔珹琭琼瑆瑍瑢瑸璂璔璘璸碽祄祎祹禌禐禑禕禛禟禵禶蕹虮蟣訢詝詥誴譓譞釴鈜鈦鈱鉁鉷鉹鉾銑鋐鋙鋡鋥鋮鋹鋿錝錥鍈鍉鍗鍺鎀鎙鎡鏋鏐鏓鏳鏴鏵鏸鏼鐄鐭鐯钛铖铣铧铻锃锗锳镃镕镠颎颙馞鯈鱓黡黶＂＃＄％＆＇＊＋－０１２３４５６７８９＜＝＞＠ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ＾＿｀ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ｛｝～𡑆𡒊𢣴𣜬𣵧𣹟𤀰𤇅𤇥𤈑𤊟𤋜𤬪𨥌𨧆𨧨𨨰𨰜𭏬𰉠𰉬𰊊𰋁𰛭𰜴𰝠𰞬𰽅");
/*==subset-tool:main-missing:end==*/
/*==subset-tool:rare-chars:start==*/
const RARE_CHARS = new Set("〚〛〪〭〮〯〫〬〱〲𡑆𡒊𢣴𣜬𣵧𣹟𤀰𤇅𤇥𤈑𤊟𤋜𤬪𨥌𨧆𨧨𨨰𨰜𭏬𰉠𰉬𰊊𰋁𰛭𰜴𰝠𰞬𰽅");
/*==subset-tool:rare-chars:end==*/

/* ---------- 罕字墨图懒加载（2026-10-15 外置分册） ----------
   墨图 base64（约四百 KB）不再内嵌引擎，分册同目录 rare-ink.js
   （tools/subset-fonts.mjs 同轮生成，挂 window.__RARE_INK__；路径与
   ?v= 令牌自 ENGINE_SRC 派生，与引擎天然同进）。数据块含 RARE_CHARS
   字才注入（扫描在填充骨架处）——无罕字之壳零请求；在途/加载失败
   期间罕字由 setWrapped/emitInkText 以 .fbc 挂真文本暂代（系统
   SimSun-ExtB/G 链承显：可见、不豆腐、不隐身），载毕 fillPendingInk
   按名补墨（换 .ink 挂图；竖排盒 left 清零重校、朱点加式复核——
   calibrateFallback 幂等收敛）。加载失败（离线/镜像缺册）优雅降级，
   字仍留系统级兜底实形。 */
let RARE_INK = {};
let rareLoaded = false, rareFailed = false, rareAsked = false;
const pendingInk = [];   /* 待补墨之 span（包裹时记名，填毕清零） */
const fillPendingInk = function () {
  if (!pendingInk.length) return;
  let touchedCh = false;
  for (const sp of pendingInk) {
    if (!sp.isConnected) continue;               /* 小笺重建等已离场之盒：跳过 */
    const url = rareUrl(sp.dataset.inkCh, sp.dataset.inkB === "1");
    if (!url) continue;
    sp.style.backgroundImage = "url(" + url + ")";
    sp.classList.remove("fbc");
    sp.classList.add("ink");
    if (sp.classList.contains("ch")) { sp.style.left = ""; touchedCh = true; }
  }
  pendingInk.length = 0;
  if (touchedCh) calibrateFallback();            /* .fbc→.ink 块轴残差重校（朱点加式复核同函） */
};
const loadRareInk = function () {
  if (rareAsked) return;
  rareAsked = true;
  const src = ENGINE_SRC
    ? ENGINE_SRC.replace(/lineage\.js(\?.*)?$/, "rare-ink.js$1")
    : "assets/lineage/rare-ink.js";
  const sc = document.createElement("script");
  sc.src = src;
  sc.onload = function () {
    RARE_INK = window.__RARE_INK__ || {};
    rareLoaded = true;
    fillPendingInk();
  };
  sc.onerror = function () {
    rareFailed = true;
    console.warn("[lineage] 罕字墨图分册（rare-ink.js）加载失败：罕字留字体链回落");
  };
  document.head.appendChild(sc);
};

function probeSig(ch, font) {
  probeCtx.clearRect(0, 0, 96, 96);
  probeCtx.font = font;
  probeCtx.textAlign = "center";
  probeCtx.textBaseline = "middle";
  probeCtx.fillText(ch, 48, 48);
  return probeCtx.getImageData(0, 0, 96, 96).data;
}

function mainHas(ch) {
  if (MAIN_MISSING.has(ch)) return false;   /* 工具实测清单：确定性优先，免探针 */
  if (probeCache.has(ch)) return probeCache.get(ch);
  if (!notdefSig) notdefSig = probeSig(String.fromCharCode(0xFFFF), MAIN_PROBE_FONT);
  const s = probeSig(ch, MAIN_PROBE_FONT);
  let has = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== notdefSig[i]) { has = true; break; }
  }
  /* 主字库 cmap 全未登记的字（如 BMP 外扩展 G）：canvas 会静默回落系统字体，
     空框指纹测不出——再与回落链指纹比对：两指纹逐像素同＝主字库未出力，判缺 */
  if (has) {
    const f = probeSig(ch, FALLBACK_PROBE_FONT);
    let same = true;
    for (let i = 0; i < s.length; i++) { if (s[i] !== f[i]) { same = false; break; } }
    if (same) has = false;
  }
  probeCache.set(ch, has);
  return has;
}

/* 合成加粗坏字清单：主字库「氏」轮廓绕向有误，Chromium 的合成加粗
   （font-weight:700，DOM 走轮廓描边）使填充相消、只剩空心描边，观感如
   异色；400 权重与 canvas 多重击打加粗均不复现，探针不可测，故按字 curated
   ——加粗栏（.imp）内命中者不走 700，改 400 权重 + text-stroke 描边仿粗
   （span.bb，保文悦本字不换字库）。换主字库时以 700 权重接触表重验
   （见 tools/ 下 sheet 脚本用法注释） */
const MAIN_BOLD_BAD = new Set(["氏"]);

/* 罕字墨图取址：键＝码位 hex；加粗栏（.imp，badSet 在场为凭）优先 b 描边
   变体（预烘 strokeText，栅格无从 CSS 加粗），无变体则退正体 */
const rareUrl = function (ch, bold) {
  const hex = ch.codePointAt(0).toString(16);
  return RARE_INK[hex + (bold ? "b" : "")] || RARE_INK[hex] || null;
};
/* 罕字待补判据：RARE_CHARS 在册而墨图分册未达（未载且未败）——此刻
   rareUrl 必空，字先以 .fbc 挂起（系统链可见），载毕由 fillPendingInk 补墨 */
const rarePend = function (ch) { return !rareLoaded && !rareFailed && RARE_CHARS.has(ch); };
const inkWarned = new Set();

/* 将文本按字拆分：两库俱缺之罕字发 span.ink 烘墨图（真文本仍在 DOM——
   无障碍/页内查找/子集采集可见，color:transparent 隐去，图挂 background）；
   主字库缺字包 span.fbc 单独回落；
   perChar 时（竖排各栏）每字独立字盒 span.ch，隔离混排度量；
   badSet 时（加粗栏）命中合成加粗坏字清单者加 span.bb 仿粗（不回落） */
function setWrapped(el, text, perChar, badSet) {
  el.textContent = "";
  let run = "";
  const flush = function () {
    if (run) { el.appendChild(document.createTextNode(run)); run = ""; }
  };
  const impCtx = !!badSet;   /* 加粗栏上下文＝badSet 在场（唯君主行传入） */
  for (const ch of text) {
    const ink = ch && rareUrl(ch, impCtx);
    if (ink) {
      flush();
      const s = document.createElement("span");
      s.className = perChar ? "ch ink" : "ink";
      s.textContent = ch;
      s.style.backgroundImage = "url(" + ink + ")";
      if (el.matches && el.matches(".ti, .mo, .yr") && !inkWarned.has(ch)) {
        inkWarned.add(ch);
        console.warn("[lineage] 罕字「" + ch + "」现于朱书栏：墨图烘色为 ink-800，需重烘朱色变体");
      }
      el.appendChild(s);
      continue;
    }
    const has = ch && mainHas(ch);
    const bad = has && badSet && badSet.has(ch);
    if (has && !bad && !perChar) { run += ch; continue; }
    flush();
    const s = document.createElement("span");
    s.className = perChar ? (has ? (bad ? "ch bb" : "ch") : "ch fbc") : (bad ? "bb" : "fbc");
    s.textContent = ch;
    if (!has && rarePend(ch)) {   /* 两库俱缺罕字而墨图分册在途：.fbc 暂挂（不隐身、不豆腐），
                                     记名待补——rare-ink.js 载毕 fillPendingInk 换 .ink 着墨 */
      s.dataset.inkCh = ch;
      if (impCtx) s.dataset.inkB = "1";
      pendingInk.push(s);
      if (el.matches && el.matches(".ti, .mo, .yr") && !inkWarned.has(ch)) {
        inkWarned.add(ch);
        console.warn("[lineage] 罕字「" + ch + "」现于朱书栏：墨图烘色为 ink-800，需重烘朱色变体");
      }
    }
    el.appendChild(s);
  }
  flush();
}

/* 横排语境逐字发射（寻人候选小笺用）：罕字换 span.ink 烘墨图、主字库
   缺字换 span.fbc 径落霞鹜（子集分区后缺字已不在文悦 cmap，裸文本链亦
   自落——包裹仍不可省：横排几何中和、粗栏 400＋.04em 描边仿粗，皆唯
   包裹可控），余常字发文本 run 原样。小笺横排语境之 .fbc 几何由
   css `#seek-list .fbc` 中和为普通行内（竖排棋盘盒规不适用）。
   输入框回显（<input> value）无法逐字着墨，赖分区天然回落：文悦缺字
   由霞鹜子集承显；两库俱缺之罕字仍落字体链，Windows 观者得系统
   SimSun-ExtB/G 实形，iOS 无之则豆腐：已知且接受的边界（见 lineage.css
   #seek 注） */
const emitInkText = function (el, text, bold) {
  let run = "";
  const flush = function () {
    if (run) { el.appendChild(document.createTextNode(run)); run = ""; }
  };
  for (const ch of text) {
    const ink = rareUrl(ch, bold);
    if (ink) {
      flush();
      const s = document.createElement("span");
      s.className = "ink";
      s.textContent = ch;
      s.style.backgroundImage = "url(" + ink + ")";
      el.appendChild(s);
    } else if (!mainHas(ch)) {
      flush();
      const s = document.createElement("span");
      s.className = "fbc";
      s.textContent = ch;
      if (rarePend(ch)) {   /* 小笺罕字同法待补（横排盒，fillPendingInk 换 .ink 即承 #seek-list .ink 定值） */
        s.dataset.inkCh = ch;
        if (bold) s.dataset.inkB = "1";
        pendingInk.push(s);
      }
      el.appendChild(s);
    } else run += ch;
  }
  flush();
};

/* 回落/墨图字盒一次性对齐校准（朱点校准同法推广）：.fbc/.ink 横排盒在
   竖排行内块轴（水平）落点余引擎间微差（strut/基线合成各异），逐盒以同栏
   首个主字库字盒中线实测差抹平（实测：同栏诸盒偏差非恒定，首例推全栏会
   余残差，故逐盒各量各的）。移位用 position:relative 之 left（css 已立
   relative）而非 marginLeft——middle 对齐取齐的是含 margin 之盒，负 margin
   只挪半程（实测 -5px 仅移 2.5px）；relative left 系布局后平移，足额、
   跨引擎同义，且 offsetLeft 含之（复核仍准）。随后按移位后字盒加法式复核
   朱点（原一次性公式重跑会清零，故 cur+Δ）。
   幂等：已带 inline left 者跳过。offset 系自洽，zoom 无关。 */
function calibrateFallback() {
  for (const box of document.querySelectorAll(".ch.fbc, .ch.ink")) {
    if (box.style.left) continue;
    const p = box.parentElement;
    const refs = Array.prototype.filter.call(p.children, function (c) {
      return c.classList && c.classList.contains("ch") && !c.classList.contains("fbc") &&
             !c.classList.contains("ink") && c.textContent.trim();   /* 空格 gap 盒不作参照 */
    });
    if (!refs.length) continue;   /* 全回落栏无参照：vertical-align:middle 落点即终 */
    const ref = refs[0];
    const d = (ref.offsetLeft + ref.offsetWidth / 2) - (box.offsetLeft + box.offsetWidth / 2);
    box.style.left = (d ? d.toFixed(2) : "0") + "px";   /* 0 亦写：标记已校准 */
  }
  for (const dot of document.querySelectorAll(".fym")) {
    const chs = dot.parentElement.querySelectorAll(".ch");
    const lc = chs[chs.length - 1];
    if (!lc) continue;
    const cur = parseFloat(dot.style.marginLeft) || 0;
    const d = cur + (lc.offsetLeft + lc.offsetWidth / 2 - dot.offsetLeft - dot.offsetWidth / 2);
    dot.style.marginLeft = d.toFixed(2) + "px";
  }
}

/* ---------- 繁体数字 ---------- */
const HAN_DIG = "零壹貳叁肆伍陸柒捌玖";
/* 1..999 大写合成：位次「第壹位」/ 代标「第拾壹代」/ 在位数用（天数得至百位） */
function hanNum(n) {
  if (n < 10) return HAN_DIG[n];
  if (n < 20) return "拾" + (n % 10 ? HAN_DIG[n % 10] : "");
  if (n < 100) return HAN_DIG[Math.floor(n / 10)] + "拾" + (n % 10 ? HAN_DIG[n % 10] : "");
  const s = HAN_DIG[Math.floor(n / 100)] + "佰", r = n % 100;
  return r ? s + (r < 10 ? "零" : "") + hanNum(r) : s;
}
/* 即位年逐字大写：1368 → 壹叁陸捌（公元前负号由调用方冠「前」） */
const hanDigits = function (y) {
  return String(y).split("").map(function (c) { return HAN_DIG[+c]; }).join("");
};
/* ---------- 解析数据块（v5：名字|称号|母亲；年号＝独立段「年號 …」；
   君主/藩王行尾按段追加即位年/在位年，年与年数各自可单书） ----------
   称号栏＝纯称号（多称号空格接写；通体朱书，次run仅语义分槽）；
   年号移独立段「年號 X [Y]」（简繁均认、位置无关、一行至多一个），
   渲染拼接于称号后为朱色次run（不另占栏）——旧式称号后空格接写已废；
   旧式第四栏单独在位年已废——今为行尾追加的即位年/在位年段字段
   （每段年与年数得只书其一，复辟按段顺续），派生即位/在位两栏
   （各按有无独立生成）；
   位置无关的独立段共四种：年號、序齒N（排行栏接排齿序）、死于非命
   （名栏末字下缀一点朱）与 無嗣（排行栏末缀「無嗣」，显示统一繁体）
   ——均简繁并认、均不占栏位；@alias 别名条只入检索不渲染 */
function parseData(text) {
  const meta = { title: "", subtitle: "", juan: "", leaf: "", seal: "", thrones: [], aliases: [] };
  const root = { name: "", ti: "", nh: "", mo: "", children: [] };
  const stack = [{ node: root, level: -1 }];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, "  ");
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t.startsWith("@")) {
      const m = t.match(/^@(title|subtitle|juan|leaf|seal|rank-word|prince-prefix|focus-skip|watermark|watermark-art|throne-link|throne[^=]*|alias)=(.*)$/);
      if (m) {
        if (m[1] === "alias") meta.aliases.push(m[2].trim());   /* 别名条可多行，按书写序 */
        else if (m[1] !== "throne-link" && m[1].startsWith("throne")) {
          /* @throneN 键号＝检索排序级（2026-10-15 用户定谳）：@throne＝1级
             （帝王）、@throne2＝2级（藩王）、@throne3＝3级（郡王），越号照
             号认；坏号（非正整数）告警后按 1 级视、不弃行；多名单按书写序 */
          const dig = m[1].slice(6);
          let lvl = 1;
          if (dig && !/^[1-9][0-9]*$/.test(dig))
            console.warn("[lineage] @" + m[1] + " 号非法（应正整数如 @throne2），已按裸 @throne 1级视：", t);
          else if (dig) lvl = +dig;
          meta.thrones.push({ val: m[2].trim(), lvl: lvl });
        }
        else meta[m[1]] = m[2].trim();
      }
      continue;
    }
    const indent = line.match(/^ */)[0].length;
    const level = Math.floor(indent / 2);
    /* 独立段先摘：序齒N、死于非命、無嗣 与 年號（均简繁并认、位置无关——
       收行尾、年段之后亦合法），摘于字段定位与年段归类之前——不占栏位、
       不误触年段告警 */
    let xc = 0, fym = false, ws = false, nh = "";
    const parts = t.split("|").filter(function (s) {
      const x = s.trim();
      if (/^死[于於]非命$/.test(x)) {   /* 非自然死亡标记：名栏末字下缀一点朱 */
        if (fym) console.warn("[lineage] 死于非命段一行只取其一，多余已弃：", t);
        else fym = true;
        return false;
      }
      if (/^[無无]嗣$/.test(x)) {   /* 无后标记：排行栏末缀「無嗣」（显示统一繁体） */
        if (ws) console.warn("[lineage] 無嗣段一行只取其一，多余已弃：", t);
        else ws = true;
        return false;
      }
      const ym = x.match(/^年[號号](?:\s+(.+))?$/);   /* 年号段：称号栏外独立维护，渲染拼接于称号后（朱色次run） */
      if (ym) {
        if (nh) console.warn("[lineage] 年號段一行只取其一，多余已弃：", t);
        else if (!ym[1] || !ym[1].trim()) console.warn("[lineage] 年號段为空，已弃：", t);
        else nh = ym[1].trim().replace(/\s+/g, " ");
        return false;
      }
      const m = x.match(/^序[齒齿](\d+)$/);
      if (!m) return true;
      if (xc) console.warn("[lineage] 序齒段一行只取其一，多余已弃：", t);
      else if (+m[1] < 1) console.warn("[lineage] 序齒须正整数，此段已弃：", t);
      else xc = +m[1];
      return false;
    });
    /* 行尾年段：即位年与在位年各自可单书（不必成对，2026-10-14 起解耦）。
       逐字段独立归类——裸数负或 ≥100＝即位年（历史纪年皆三位以上；公元前
       负号自明），开新段；<100 裸数或缀 月/天 ＝在位年（无在位及百载者，
       小裸数无歧义），归入末段年数空位；末段年数已书再书者告警弃之；
       空字段静默跳过（留空位合法）；复辟按段顺续（|1435|14|1457|8），
       段年/段数俱得单书（|1617、|9月） */
    const segs = [];                          /* 即位/在位段（{y,n,u}；y/n 各得为 null＝该段单书） */
    for (let i = 3; i < parts.length; i++) {
      const s = (parts[i] || "").trim();
      if (!s) continue;                       /* 空字段＝留空位，静默跳过 */
      if (/^-?\d+$/.test(s) && (+s < 0 || +s >= 100)) {
        segs.push({ y: +s, n: null, u: "年" });   /* 即位年开新段（年数待续或永缺） */
        continue;
      }
      const dm = s.match(/^(\d+)(月|天)?$/);   /* 在位年：裸数（<100）＝年，或带 月/天 缀 */
      if (dm) {
        const last = segs[segs.length - 1];
        if (!last) segs.push({ y: null, n: +dm[1], u: dm[2] || "年" });   /* 只书在位年：自立段 */
        else if (last.n === null) { last.n = +dm[1]; last.u = dm[2] || "年"; }
        else console.warn("[lineage] 一段只书一个在位年，此字段已弃：", t);
        continue;
      }
      if (s === "未蒞" || s === "未莅") {       /* 未蒞＝受封而未莅任（2026-10-18 用户定谳）：
                                                   正字「蒞」，异体「莅」照收折正；入在位段
                                                   u="未蒞"，显示整栏只此二字（详在位栏注） */
        const last = segs[segs.length - 1];
        if (!last) segs.push({ y: null, n: 0, u: "未蒞" });   /* 只书未蒞：自立段（无即位年则年检索不中） */
        else if (last.n === null) { last.n = 0; last.u = "未蒞"; }
        else console.warn("[lineage] 一段只书一个在位年，此字段已弃：", t);
        continue;
      }
      console.warn("[lineage] 行尾字段非即位年（负数或 ≥100 裸数）亦非在位年（<100 裸数或缀 月/天）亦非「未蒞」，已弃：", t);
    }
    const node = {
      name: parts[0].trim(),
      ti: (parts[1] || "").trim().replace(/\s+/g, " "),   /* 称号（纯称号，多称号空格接写；首节墨黑、余节朱run） */
      nh: nh,                                   /* 年号（独立段「年號 …」手书，可空；渲染拼接于称号后朱run） */
      mo: (parts[2] || "").trim(),            /* 母亲（可空） */
      segs: segs,                             /* 即位/在位段（可空；y/n 各得 null＝该段单书；君主藩王之外不书） */
      xc: xc,                                 /* 序齒（数据行手书；0＝未书，不显示） */
      fym: fym,                               /* 死于非命（true＝名栏末字下缀一点朱；缺省无点） */
      ws: ws,                                 /* 無嗣（true＝排行栏末缀「無嗣」；缺省无） */
      children: []
    };
    while (stack[stack.length - 1].level >= level) stack.pop();
    node.parent = stack[stack.length - 1].node;
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, level });
  }
  /* @alias=主名[|称号]>别名1,别名2（可多行）：别名只入检索（寻人/深链），
     不渲染。匹配规则同 @throne——带称号按 name+ti 甄别，裸名须全树唯一；
     歧义或无人匹配经告警后跳过。附着于展树之后、返回之前 */
  if (meta.aliases.length) {
    const all = [];
    (function walk(nd) { all.push(nd); nd.children.forEach(walk); })(root.children[0] || { children: [] });
    meta.aliases.forEach(function (entry) {
      const gt = entry.split(/[>>]/);
      if (gt.length < 2) { console.warn("[lineage] @alias 条目须含「>」（主名>别名,…），已跳过：", entry); return; }
      const names = gt.slice(1).join(">").split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      const key = gt[0].split("|").map(function (s) { return s.trim(); });
      if (!key[0] || !names.length) { console.warn("[lineage] @alias 主名或别名为空，已跳过：", entry); return; }
      const hits = all.filter(function (n) {
        return n.name === key[0] && (key.length < 2 || !key[1] || n.ti === key[1]);
      });
      if (!hits.length) { console.warn("[lineage] @alias 主名无人匹配，已跳过：", entry); return; }
      if (hits.length > 1 && key.length < 2) { console.warn("[lineage] @alias 裸名重名歧义（须带|称号甄别），已跳过：", entry); return; }
      hits.forEach(function (n) { n.alias = (n.alias || []).concat(names); });
    });
  }
  return { meta, root: root.children[0] || null };
}

/* ---------- 遍历 ---------- */
function collect(node, depth, list) {
  node.depth = depth;
  node.uid = list.length;                        /* 节点序号：浮层来回对键控用（不赖名字，重名无歧） */
  list.push(node);
  node.children.forEach(function (c) { collect(c, depth + 1, list); });
}

/* ---------- 填充骨架（壳页面已带：版框/书口/题识/连线层 markup） ---------- */
const dataText = document.getElementById("lineage-data").textContent;
/* 罕字墨图按需挂载：数据块真含 RARE_CHARS 字才注入 rare-ink.js——
   无罕字之壳零请求（引擎本体自此不带四百 KB 墨图，2026-10-15 外置） */
for (const ch of dataText) if (RARE_CHARS.has(ch)) { loadRareInk(); break; }
const parsed = parseData(dataText);
const meta = parsed.meta, root = parsed.root;

const main  = document.getElementById("main-content");
const board = document.getElementById("board");
main.setAttribute("aria-label", (meta.title || "帝王世系") + "世系图（可横向滚动）");

/* 书口：刻书题与叶码取自数据块设置，缺省用大题拼「卷一」 */
const bts = board.querySelectorAll(".bankou .bt");
setWrapped(bts[0], meta.juan || ((meta.title || "帝系") + "卷一"), true);
setWrapped(bts[1], meta.leaf || "一", true);

const heading = document.getElementById("heading");
const svg = document.getElementById("lines");
setWrapped(heading.querySelector("h1"), meta.title);
setWrapped(heading.querySelector("p"),  meta.subtitle);
heading.querySelector("p").style.display = meta.subtitle ? "" : "none";

/* 水印（可选，@watermark 与 @watermark-art 二择一，均缺即不产此层）：
   DOM 居 body 之首，故 z 序自然落纸纹之上、版框墨线与节点之下；
   固定视口极淡墨（透明度与字系见 lineage.css #watermark）。
   其一 @watermark=中心字：蒸馏团窠——单线外环＋云龙环＋轮廓心盘＋中心字，
   全线描无填充；其二 @watermark-art=线稿掩模路径：用户母本抽 alpha 后
   以墨色经 mask-image 透出（美术稿，如盘龙椭圆章） */
if (meta.watermark) {
  /* 中环＝云龙纹（蒸馏线描）：波状龙身（密折代曲）＋首（圈＋角须）＋
     放射双足带趾＋尾叉，相间如意云气（三条平行弧＋卷头）；六单元旋转
     重复。只投资剪影：鳞甲瓣叶等高频细纹在 5% 透明度下必糊，一概不画 */
  const P = function (r, deg) {          /* 0° 居顶、顺时针；极坐标→viewBox */
    const t = deg * Math.PI / 180;
    return [200 + r * Math.sin(t), 200 - r * Math.cos(t)];
  };
  const pt = function (r, deg) { const q = P(r, deg); return q[0].toFixed(1) + " " + q[1].toFixed(1); };
  const line = function (r1, d1, r2, d2, w) {
    return '<path d="M' + pt(r1, d1) + " L" + pt(r2, d2) + '" stroke-width="' + w + '"/>';
  };
  const unit = function (off) {
    let body = "";
    for (let a = 0; a <= 40; a += 2.5) {   /* 波状身：一龙一起伏 */
      const q = P(170 + 12 * Math.sin(a * Math.PI / 20), a + off);
      body += (body ? " L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
    }
    const hc = P(172, 43 + off);
    let d = '<path d="' + body + '" stroke-width="3"/>';
    d += '<circle cx="' + hc[0].toFixed(1) + '" cy="' + hc[1].toFixed(1) + '" r="7" stroke-width="2.5"/>';
    d += line(168, 38 + off, 160, 32 + off, 2);          /* 角 */
    d += line(176, 37 + off, 174, 29 + off, 2);          /* 角二 */
    d += line(178, 47 + off, 186, 51 + off, 2);          /* 须 */
    d += line(164, 12 + off, 150, 14 + off, 2);          /* 内足 */
    d += line(150, 14 + off, 146, 10 + off, 2);          /* 趾 */
    d += line(150, 14 + off, 147, 19 + off, 2);
    d += line(176, 28 + off, 188, 30 + off, 2);          /* 外足 */
    d += line(188, 30 + off, 192, 26 + off, 2);
    d += line(188, 30 + off, 191, 35 + off, 2);
    d += line(170, 0 + off, 182, -6 + off, 2);           /* 尾叉 */
    d += line(170, 0 + off, 158, -6 + off, 2);
    for (const r of [160, 170, 180])                     /* 云气三弧 */
      d += '<path d="M' + pt(r, 46 + off) + " A" + r + " " + r + " 0 0 1 " + pt(r, 58 + off) + '" stroke-width="2"/>';
    const cc = P(170, 46 + off);                          /* 云卷头 */
    d += '<circle cx="' + cc[0].toFixed(1) + '" cy="' + cc[1].toFixed(1) + '" r="3" stroke-width="2"/>';
    return d;
  };
  let ring = "";
  for (const off of [0, 60, 120, 180, 240, 300]) ring += unit(off);
  document.body.insertAdjacentHTML("afterbegin",
    '<div id="watermark" aria-hidden="true"><svg viewBox="0 0 400 400" aria-hidden="true">' +
    '<circle cx="200" cy="200" r="194" stroke-width="2.5"/>' + ring +
    '<circle cx="200" cy="200" r="146" stroke-width="2.5"/>' +
    '</svg><span class="wm-char"></span></div>');
  setWrapped(document.querySelector("#watermark .wm-char"), meta.watermark);
} else if (meta["watermark-art"]) {
  /* 美术水印（@watermark-art=线稿图路径）：用户提供母本经 tools/make-mask.mjs
     亮度→alpha 抽成墨色透底线稿（滤掉母本自带纸底，免低透明度下浮出矩形
     纸色斑；墨色烘入 PNG）。直挂 <img> 而非 CSS mask-image——后者被
     Chromium 行 CORS 校验，file:// 协议下（origin null）必拒 */
  document.body.insertAdjacentHTML("afterbegin",
    '<div id="watermark" class="art" aria-hidden="true"><img src="' +
    meta["watermark-art"] + '" alt=""></div>');
}

/* 题识条内字盒内缩（供结构保护推导右侧净距） */
heading.style.width = COL_W + "px";
let hInsR = Infinity;
for (const c of heading.children) {
  if (c.style.display === "none") continue;
  hInsR = Math.min(hInsR, COL_W - (c.offsetLeft + c.offsetWidth));
}
if (!isFinite(hInsR)) hInsR = 0;

if (!root) {
  document.body.insertAdjacentHTML("afterbegin", "<p style='padding:40px'>数据块为空。</p>");
  return;
}

/* 1. 建 DOM：一格至七栏（排行·位次·称号含年号次run左 · 名字中 ·
   母亲·即位·在位右；即位/在位君主/藩王行尾书年段者有）；测量格高 */
const nodes = [];
collect(root, 0, nodes);

/* 君位传承名单（@throne / @throneN，一行一名单、可多行，按书写序；
   键号＝检索排序级——裸＝1级（帝王）、2＝藩王、3＝郡王、越号照认，
   详 _lvl 算处注；值可带「前缀[首位,后续]:」如 明朝[開國,即位]: /
   晉國[受封,即位]:——前缀作位次前缀，括号对＝该名单首条/后续条即位栏
   结词，书繁照显、漏书或不成对兜底 開國/即位并告警）：
   条目＝名字|称号，与人物行严格匹配（称号＝称号栏首节，或称号栏全串
   ——多称号行如「趙惠王 安陽王」整串亦中；次节单写不中），
   重名者赖称号甄别（如 姬某|晉殤叔 只命中殤叔、不涉其余「姬某」）；
   裸名条目为旧式，仅全树名字唯一时可用；歧义（多命中）与未匹配条目
   console.warn 后跳过、不占号。成员诸栏加粗；各名单独立编序
   （位次＝首现序数，复辟重入列不占号）；名单不画线（君位传承不画线，
   连线仅父子血缘墨线）。
   藩名单：前缀含「藩」（如 趙藩:、鄭藩新平:）者——成员入 princeSet 不入
   throneSet：诸栏不加粗、其子排行不冠皇字；位次栏＝「@prince-prefix
   值＋第N位＋藩名王」，藩名＝藩后诸字、无则藩前（趙藩→明朝第壹位趙王，
   鄭藩新平→明朝第壹位新平王；@prince-prefix 省则用书写前缀）；
   浮层照进（每藩独立小链，@focus-skip=藩前缀 可剔除）。
   藩设计仅限明壳（2026-10-14 用户定谳，勿扩他朝）；空名单（冒号后无
   条目）合法无害——占位待填，不告警 */
const groups = (meta.thrones || []).map(function (thr) {
  const val = thr.val;
  /* 前缀[结词对]:条目…——括号为独立捕获组，前缀恒净（藩判定/位次/
     @focus-skip/@throne-link 引用皆用净前缀）；括号仅认冒号前一处，
     条目内括号原样保留 */
  const mm = val.match(/^(.+?)(?:\[([^\]]*)\])?[:：](.*)$/);
  const pfx = mm ? mm[1].trim() : "";
  /* 结词对「首位,后续」（逗号简繁均认）：书繁照显，引擎不做简→繁转换；
     漏书或不成对兜底「開國/即位」并告警 */
  const sw = (mm && mm[2] !== undefined)
    ? mm[2].split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
  if (sw.length !== 2)
    console.warn("[lineage] @throne 名单漏书结词对（应书 前缀[首位,后续]:），已兜底 開國/即位：",
                 pfx || val.slice(0, 16));
  const fi = pfx.indexOf("藩");   /* 藩名单＝前缀含「藩」（2026-10-14 用户定谳，藩设计仅限明壳、他朝前缀无藩字自然不触发）；
                                     藩名＝藩后诸字（鄭藩新平→新平），藩后无字则取藩前（趙藩→趙） */
  return {
    prefix: pfx,
    level: thr.lvl,   /* 检索排序级＝键号（裸＝1）；只驱动寻人/年检索排序 */
    prince: fi >= 0,
    pname: fi >= 0 ? (pfx.slice(fi + 1) || pfx.slice(0, fi)) : "",
    firstWord: sw.length === 2 ? sw[0] : "開國",
    nextWord: sw.length === 2 ? sw[1] : "即位",
    entries: (mm ? mm[3] : val).split(/[,,]/).map(function (s) { return s.trim(); })
      .filter(Boolean).map(function (s) {
        const i = s.indexOf("|");
        return i < 0 ? { name: s, ti: null }
                     : { name: s.slice(0, i).trim(), ti: s.slice(i + 1).trim() };
      })
  };
});
/* 位次用字：@rank-word（缺省「皇帝」）；非「皇帝」时排行不冠皇字（先秦径称長子）。
   藩位次展示前缀：@prince-prefix（如 明朝；省则用书写前缀「趙藩」） */
const RANK_WORD = meta["rank-word"] || "皇帝";
const PRINCE = RANK_WORD === "皇帝" ? "皇" : "";
const PRINCE_PREFIX = meta["prince-prefix"] || "";
/* 名字/名字+称号 → 节点索引：名单条目解析为节点引用，
   此后加粗、位次、排行冠字、浮层一律以节点为键，重名歧义根除 */
const byKey = new Map();       /* 「名\0称号首节」→ [节点] */
const byKeyFull = new Map();   /* 「名\0称号栏全串」→ [节点]（多称号条目全串匹配用；年号段不入匹配） */
const byNameAll = new Map();   /* 「名」→ [节点]（裸名旧式条目用） */
for (const n of nodes) {
  const ti1 = n.ti ? n.ti.split(" ")[0] : "";   /* n.ti 已归一单空格分隔 */
  for (const pair of [[byKey, n.name + "\u0000" + ti1], [byNameAll, n.name]]) {
    if (!pair[0].has(pair[1])) pair[0].set(pair[1], []);
    pair[0].get(pair[1]).push(n);
  }
  if (n.ti.includes(" ")) {   /* 多称号行：全串另索引 */
    const k = n.name + "\u0000" + n.ti;
    if (!byKeyFull.has(k)) byKeyFull.set(k, []);
    byKeyFull.get(k).push(n);
  }
}
function resolveEntry(g, e) {
  const cands = e.ti === null ? byNameAll.get(e.name) || []
    : byKey.get(e.name + "\u0000" + e.ti) ||
      byKeyFull.get(e.name + "\u0000" + e.ti.replace(/\s+/g, " ").trim()) || [];
  if (cands.length === 1) return cands[0];
  console.warn("[lineage] @throne 条目" + (cands.length ? "歧义（命中 " + cands.length + " 人）" : "未匹配") +
               "，已跳过：", g.prefix + ":" + e.name + (e.ti === null ? "" : "|" + e.ti));
  return null;
}
const throneSet = new Set();       /* 帝系名单成员节点（加粗、排行冠皇、深链代钉） */
const princeSet = new Set();       /* 藩名单成员节点（位次照授；不加粗、不冠皇） */
const throneTitle = new Map();     /* 节点 → 「前缀＋第N位＋位次用字」（藩＝藩名王） */
groups.forEach(function (g) {
  let ord = 0;
  g.resolved = g.entries.map(function (e) {
    const n = resolveEntry(g, e);
    if (n) {
      (g.prince ? princeSet : throneSet).add(n);
      if (!throneTitle.has(n)) {   /* 复辟重入不占号：仅首现授位次时递增 */
        throneTitle.set(n, g.prince
          ? (PRINCE_PREFIX || g.prefix) + "第" + hanNum(++ord) + "位" + g.pname + "王"
          : g.prefix + "第" + hanNum(++ord) + "位" + RANK_WORD);
      }
    }
    return n;
  });
});
/* 即位栏结词：按节点所属名单首现之位取词——首条＝firstWord、
   后续＝nextWord；复辟重入或跨名单者以首次指派为定（与位次首现序同则）。
   名单外节点偶书年段者兜底结「即位」（见即位栏渲染处） */
const nodeSuffix = new Map();
groups.forEach(function (g) {
  g.resolved.forEach(function (n, i) {
    if (n && !nodeSuffix.has(n)) nodeSuffix.set(n, i === 0 ? g.firstWord : g.nextWord);
  });
});
/* 检索排序级 _lvl（2026-10-15 用户定谳）：名单键号即级——@throne＝1级
   （帝王）、@throne2＝2级（藩王）、@throne3＝3级（郡王）、@throneN 照号
   认级；一人挂多名单取最小号；不属任何名单者（宗室）＝在场名单最大级
   ＋1（只有 1/2/3 时恰为第四级，书 @throne5 则自动落第 6 级恒垫底）。
   排序只作用检索候选——名检索（名次＞级＞代数）、年检索（起始年＞级＞
   代数）；位次栏、加粗、悬浮层一切如旧，@focus-skip 只豁免悬浮不豁免级 */
let LVL_MAX = 0;
for (const g of groups) if (g.level > LVL_MAX) LVL_MAX = g.level;
for (const n of nodes) n._lvl = LVL_MAX + 1;
for (const g of groups) g.resolved.forEach(function (n) {
  if (n && g.level < n._lvl) n._lvl = g.level;
});

/* 悬浮传位层：overlay 边＝名单顺接相邻对（@focus-skip 之前缀名单除外）
   ＋@throne-link 跨名单接续边；hover 或点击钉住名单成员时浮层：
   朱线连以该节点为端点的顺接边，无关者半透明，墨线退为背景。
   单人名单成员无顺接边，悬浮仍生效（2026-10-14 用户定谳）：只淡出
   无关者、墨线退背景，不画朱线——悬浮资格以「在非 focus-skip 名单中」
   （hoverables）为判，不赖边之有无 */
const skip = new Set((meta["focus-skip"] || "").split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean));
const hoverables = new Set();   /* 非 @focus-skip 名单之全部已解析成员（含单人名单） */
groups.forEach(function (g) {
  if (skip.has(g.prefix)) return;
  g.resolved.forEach(function (n) { if (n) hoverables.add(n); });
});
const focusEdges = [];
groups.forEach(function (g) {
  if (skip.has(g.prefix)) return;
  for (let i = 0; i + 1 < g.resolved.length; i++) {
    const a = g.resolved[i], b = g.resolved[i + 1];
    if (!a || !b) continue;
    /* 四人上下文：出线者前序（名单上一传）与入线者后序（名单下一传），
       供路由考量——路线只依赖边自身、存在期间不变（见全局定算注） */
    let pre = null, suc = null;
    for (let j = i - 1; j >= 0 && !pre; j--) pre = g.resolved[j];
    for (let j = i + 2; j < g.resolved.length && !suc; j++) suc = g.resolved[j];
    focusEdges.push(Object.assign([a, b], { pre: pre, suc: suc }));
  }
});
/* 跨名单传位（@throne-link=前缀A>前缀B，逗号可多）：A 名单末位已解析成员
   →B 名单首位已解析成员成边，与名单内顺接边同权；前缀未匹配或两端
   无人者告警跳过。须建 focusInc/来回对之前入列 */
(meta["throne-link"] || "").split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean)
  .forEach(function (pair) {
    const ab = pair.split(/[>>]/).map(function (s) { return s.trim(); });
    const ga = groups.find(function (g) { return g.prefix === ab[0]; });
    const gb = groups.find(function (g) { return g.prefix === ab[1]; });
    const ra = ga ? ga.resolved.filter(Boolean) : [];
    const rb = gb ? gb.resolved.filter(Boolean) : [];
    const a = ra.length ? ra[ra.length - 1] : null;
    const b = rb.length ? rb[0] : null;
    if (a && b) focusEdges.push(Object.assign([a, b],
      { pre: ra.length > 1 ? ra[ra.length - 2] : null, suc: rb.length > 1 ? rb[1] : null }));
    else console.warn("[lineage] @throne-link 前缀未匹配或端点无人，已跳过：", pair);
  });
/* 跨名单去重（2026-10-14 用户定谳）：同一人得身兼数名单（如 朱見𣹟 既在
   鄭藩主名单、又在 鄭藩東垣名单）——各名单传承边照常分别生成、尽入悬浮层，
   唯同向同端点之重复边只绘一道（留首算者之 pre/suc 四人上下文；来回对
   反向边不算重复）。去重须在 focusInc/来回对定算之前 */
(function () {
  const seen = new Set();
  for (let i = 0; i < focusEdges.length; ) {
    const k = focusEdges[i][0].uid + ">" + focusEdges[i][1].uid;
    if (seen.has(k)) focusEdges.splice(i, 1);   /* 同向重复边：去后留前 */
    else { seen.add(k); i++; }
  }
})();
const focusInc = new Map();   /* 节点 → 以其为端点的 overlay 边 */
focusEdges.forEach(function (e) {
  for (const n of e) { if (!focusInc.has(n)) focusInc.set(n, []); focusInc.get(n).push(e); }
});
/* 来回对（同一节点对的双向边，如 祁鎮⇄祁鈺 复辟）：直连双道均布，
   顺接序在前者走上道（lane<0）、在后者走下道（lane>0）；
   lane 仅作符号标记——道高由 laneY 按行高四分位布道（顺接走上四分位、
   回返走下四分位），单向一道仍居名字中线高 */
(function () {
  const firstIdx = new Map();
  focusEdges.forEach(function (e, i) {
    const k = e[0].uid + "\u0000" + e[1].uid;
    if (!firstIdx.has(k)) firstIdx.set(k, i);
  });
  focusEdges.forEach(function (e, i) {
    const r = firstIdx.get(e[1].uid + "\u0000" + e[0].uid);
    e.lane = (r === undefined) ? 0 : (i < r ? -1 : 1);
  });
})();

/* 显示范围：图渲染数据块全部人物（宗室尽入图）；显示树即全树
   （childrenD/parentD＝children/parent）。@throne 名单只做节点属性与线：
   位次前缀编号、诸栏加粗、朱色传承线——不参与显示取舍 */
const shown = nodes;
for (const n of shown) { n.childrenD = n.children; n.parentD = n.parent; }

const els = new Map();
for (const n of shown) {
  const d = document.createElement("div");
  const isImp = throneSet.has(n);
  d.className = isImp ? "node imp" : "node";
  d.style.visibility = "hidden";
  const bad = isImp ? MAIN_BOLD_BAD : null;   /* 加粗栏绕开合成加粗坏字 */
  const name = document.createElement("div");
  name.className = "name"; setWrapped(name, n.name, true, bad);
  if (n.fym) {   /* 死于非命：名栏末字下一点朱（CSS 画圆，无文字、不赖字体子集）；
                    入名栏流故 nameH 自动含之——墨线下口、悬停障碍、行高皆自然避让 */
    const dot = document.createElement("span");
    dot.className = "fym";
    name.appendChild(dot);
  }
  d.appendChild(name);
  let pos = null, ti = null, rk = null, mo = null;
  if (throneTitle.has(n)) {
    pos = document.createElement("div"); pos.className = "pos";
    setWrapped(pos, throneTitle.get(n), true, bad);
    d.appendChild(pos);
  }
  if (n.ti || n.nh) {   /* 称号栏：通体朱书；首节为称号，追加称号与年号各为
      次run（空一字距接排，观感同旧混排式——年号已移独立段，语义分槽） */
    ti = document.createElement("div"); ti.className = "ti";
    const runs = n.ti ? n.ti.split(" ") : [];
    setWrapped(ti, runs[0] || "", true, bad);
    [runs.length > 1 ? runs.slice(1).join(" ") : "", n.nh].forEach(function (x) {
      if (!x) return;
      const gap = document.createElement("span");
      gap.className = "ch"; gap.textContent = " ";
      const yr = document.createElement("span"); yr.className = "yr";
      setWrapped(yr, x, true, bad);
      ti.appendChild(gap); ti.appendChild(yr);
    });
    d.appendChild(ti);
  }
  if ((n.parent && n.parent.name) || n.ws) {   /* 排行（左最外·黑）：父下齿序自动——長子/次子/叁子…（叁起大写），父在任一 @throne 名单者冠皇字（仅 @rank-word 为「皇帝」时；先秦用字则径称長子）；根无父不栏——惟書無嗣者虽无父亦立栏（标记不丢，排行/序齒文本仍须有父方发） */
    rk = document.createElement("div"); rk.className = "rk";
    if (n.parent && n.parent.name) {
      const idx = n.parent.children.indexOf(n) + 1;
      setWrapped(rk, (throneSet.has(n.parent) ? PRINCE : "") +
                     (idx === 1 ? "長" : idx === 2 ? "次" : hanNum(idx)) + "子", true, bad);
    }
    if (n.xc) {   /* 序齒（数据行手书）：排行后空一字接排「序齒N子」，
                     同墨黑（不似年号着朱）、同随栏加粗 */
      const gap = document.createElement("span");
      gap.className = "ch"; gap.textContent = " ";
      const xcs = document.createElement("span");
      setWrapped(xcs, "序齒" + (n.xc === 1 ? "長" : n.xc === 2 ? "次" : hanNum(n.xc)) + "子", true, bad);   /* 同齿序用字：長/次/叁起大写 */
      rk.appendChild(gap); rk.appendChild(xcs);
    }
    if (n.ws) {   /* 無嗣（独立段手书）：排行（有序齒则序齒）后空一字接排，
                     同墨黑、同随栏加粗；数据自校——無嗣而有后则告警（不删标） */
      if (n.children.length) console.warn("[lineage] 無嗣而有后，数据自相矛盾：", n.name);
      const gap = document.createElement("span");
      gap.className = "ch"; gap.textContent = " ";
      const wss = document.createElement("span");
      setWrapped(wss, "無嗣", true, bad);
      rk.appendChild(gap); rk.appendChild(wss);
    }
    d.appendChild(rk);
  }
  if (n.mo) { mo = document.createElement("div"); mo.className = "mo"; setWrapped(mo, n.mo, true, bad); d.appendChild(mo); }
  let ji = null, zai = null;
  if (n.segs && n.segs.length) {   /* 即位/在位（君主/藩王行尾年段）：两栏各按有无
      独立生成（年与年数得单书，缺栏递补贴位）——即位栏串有年诸段「与」接结
      名单结词（nodeSuffix，@throne 括号对定之）；在位栏合有年数诸段：年月并月
      （1年=12月）、天自为计——天不升格为月，数皆大写：纯年显年（按单位判，
      裸 0 含零年）、满一年显年（弃月弃天）、满一月显月（弃天）、纯天显天
      （0天 显零天）；未蒞段整栏优先只显「未蒞」二字（异体「莅」折正字「蒞」）；
      即位段数与年号 run 数互校 */
    const ySegs = n.segs.filter(function (s) { return s.y !== null; });
    const dSegs = n.segs.filter(function (s) { return s.n !== null; });
    if (ySegs.length) {
      ji = document.createElement("div"); ji.className = "ji";
      setWrapped(ji, ySegs.map(function (s) {
        return (s.y < 0 ? "前" : "") + hanDigits(Math.abs(s.y)) + "年";
      }).join("与") +   /* 段年自足「前＋数＋年」、段间「与」顺接：壹肆叁伍年与壹肆伍柒年即位 */
         (nodeSuffix.get(n) || "即位"), true, bad);   /* 名单外书年段者兜底「即位」 */
      d.appendChild(ji);
    }
    if (dSegs.length) {
      zai = document.createElement("div"); zai.className = "zai";
      if (dSegs.some(function (s) { return s.u === "未蒞"; })) {
        /* 未蒞整栏优先（2026-10-18 用户定谳）：只显「未蒞」二字，不冠「在位」、
           不带数字；与数字段并书之矛盾由 validate 报 WARN，引擎径以未蒞覆盖 */
        setWrapped(zai, "未蒞", true, bad);
      } else {
        let yrs = 0, mons = 0, dys = 0;
        dSegs.forEach(function (s) {
          if (s.u === "天") dys += s.n;
          else if (s.u === "月") mons += s.n;
          else yrs += s.n;
        });
        const mAll = yrs * 12 + mons;               /* 年月并月（1年=12月） */
        /* 纯年支按单位判（诸段皆「年」），不按累计数值真假——0天 之 dys=0
           系假值，旧式误落纯年支显「零年」；改判后 0天→零天、裸0→零年各归其位 */
        setWrapped(zai, "在位" + (dSegs.every(function (s) { return s.u === "年"; }) ? hanNum(yrs) + "年"
                                : mAll >= 12 ? hanNum(Math.floor(mAll / 12)) + "年"
                                : mAll >= 1 ? hanNum(mAll) + "月"    /* 有天段并存时弃天（栏简） */
                                : hanNum(dys) + "天"), true, bad);   /* 天恒显天，不升格为月（含零天） */
      }
      d.appendChild(zai);
    }
    const runs = n.nh ? n.nh.split(/\s+/).filter(Boolean).length : 0;
    if (ySegs.length > 1 && runs && runs !== ySegs.length)   /* 互校仅在书年号时——藩王复段（废而复立）恒无年号，无据可校 */
      console.warn("[lineage] " + n.name + "：即位段数 " + ySegs.length +
                   " 与年号 run 数 " + runs + " 不符");
  }
  /* 各栏空位向内递补：名字恒居格心；左侧自名字向外依次 称号（含年号次run）→
     位次→排行（排行居最左），右侧依次 母亲→即位→在位（在位居最右），
     缺栏不占位，外栏递补贴到上一档 */
  const step = ANNO_FS + SIDE_GAP;
  [ti, pos, rk].filter(Boolean).forEach(function (el, i) {
    el.style.right = "calc(50% + " + (NAME_FS / 2 + SIDE_GAP + i * step) + "px)";
  });
  [mo, ji, zai].filter(Boolean).forEach(function (el, i) {
    el.style.left = "calc(50% + " + (NAME_FS / 2 + SIDE_GAP + i * step) + "px)";
  });
  board.appendChild(d);
  els.set(n, d);
  if (n.fym) {   /* 朱点横对中柱：vertical-align 之对齐有字体基线微差，
                    以末字实测中线平移校准（一次性，改 font/zoom 不漂） */
    const dot = name.lastElementChild;
    const chs = name.querySelectorAll(".ch");
    const lc = chs[chs.length - 1];
    dot.style.marginLeft = (lc.offsetLeft + lc.offsetWidth / 2 -
                            dot.offsetLeft - dot.offsetWidth / 2) + "px";
  }
  n.nameH = name.offsetHeight;
  n.posH = pos ? pos.offsetHeight : 0;
  n.tiH = ti ? ti.offsetHeight : 0;
  n.moH = mo ? mo.offsetHeight : 0;
  n.rkH = rk ? rk.offsetHeight : 0;
  n.jiH = ji ? ji.offsetHeight : 0;
  n.zaiH = zai ? zai.offsetHeight : 0;
}
calibrateFallback();   /* 先校准再量垫：marginLeft 位移入 insL/insR 与侧端口 */

/* 1b. 结构保护：量每格字盒相对格缘的内缩，推导布局四边垫，
   使版框线/列线与任何字盒恒保持 ≥ --lineage-guard 净距（数据换字换宽不破） */
let insL = Infinity, insR = Infinity;
for (const n of shown) {
  const d = els.get(n);
  let minOff = Infinity, maxOff = -Infinity;
  for (const c of d.children) {
    minOff = Math.min(minOff, c.offsetLeft);
    maxOff = Math.max(maxOff, c.offsetLeft + c.offsetWidth);
    insL = Math.min(insL, c.offsetLeft);
    insR = Math.min(insR, COL_W - (c.offsetLeft + c.offsetWidth));
  }
  n.minOff = minOff; n.maxOff = maxOff;   /* 左右最外文字块缘（相对格左缘），供浮层侧端口 */
}
const GUARD = px("--lineage-guard");
const padL = Math.max(12, GUARD - insL);          /* 版框左线 → 树最左字盒 */
const padR = Math.max(12, GUARD - hInsR);         /* 题识最右字盒 → 版框右线 */
const padT = Math.max(PAD_TOP, GUARD);            /* 版框上线 → 首行字盒 */
const padB = Math.max(PAD_TOP + FR_B + 8, GUARD); /* 末行字盒 → 版框下线 */
const padM = 12;                                  /* 树右缘 → 题识条（无线层，仅留白） */

/* 2. 竖排世系：辈分=行（上起，行＝全树深度），显示树同辈按子树宽横向展开；
   最右留题名条。树区原点＝版框左内缘 + 代标带 + 左垫。
   列半步方案（补位空列已废——「空洞」根除）：宽与列位同源——跨度恒为
   诸子列数之和（span = k·PITCH − GAP_X），父中心＝首末子中心均值，得落
   半列（m 取 .5，父悬两子列正中——经典树画），偶跨不再插空列凑整；
   兄弟跨度以列预算记账（c.S 累加）、互不重叠，宽度公式与列位同出 k——
   旧「人名覆盖」缺陷之根因（宽与列位不同源致同格双树、列位逆序）仍无从产生 */
const ORIGIN = FR_L + GEN_W + padL;
const dRoot = shown[0];
(function layoutCells(node) {
  const cs = node.childrenD;
  if (!cs.length) { node.k = 1; node.m = 0; node.w = COL_W; return; }
  let S = 0;
  for (const c of cs) { layoutCells(c); c.S = S; S += c.k; }   /* c.S＝此前兄弟的列数和 */
  const first = cs[0], last = cs[cs.length - 1];
  node.k = S;                                 /* 跨度＝诸子列数和，无补列 */
  node.m = (first.S + first.m + last.S + last.m) / 2;   /* 中心列序（相对本跨度；得取 .5——父悬两子列正中） */
  node.w = node.k * PITCH - GAP_X;
})(dRoot);
const NAME_CX_OFF = COL_W / 2;   /* 格左缘 → 名字中线（格心） */
(function placeX(node, x0) {
  for (const c of node.childrenD) placeX(c, x0 + c.S * PITCH);
  node.nx = x0 + node.m * PITCH + NAME_CX_OFF;
})(dRoot, ORIGIN);
/* 侧端口：该侧最外文字块外缘 ±4px 气口——浮层直连线紧贴其人而不划穿自身诸栏 */
for (const n of shown) {
  n.portL = n.nx - NAME_CX_OFF + n.minOff - 4;
  n.portR = n.nx - NAME_CX_OFF + n.maxOff + 4;
}

/* 3. 行高与行顶（行间留走线道）；无显示节点的辈分不占行（行带/代标亦跳过），
   代标仍按真实辈序编号（第N代），跳辈处留空不补号 */
const levelH = [];
for (const n of shown) {
  levelH[n.depth] = Math.max(levelH[n.depth] || 0, n.nameH, n.posH, n.tiH, n.moH, n.rkH, n.jiH, n.zaiH);
}
const depths = [];
for (let d = 0; d < levelH.length; d++) if (levelH[d]) depths.push(d);
const levelTop = [];
let acc = FR_T + padT;
for (const d of depths) { levelTop[d] = acc; acc += levelH[d] + GAP_Y; }
const boardH = acc - GAP_Y + padB;

const boardW = ORIGIN + dRoot.w + padM + COL_W + padR + FR_R;  /* 树区 + 题名条 */

/* 3b. 代标：版框内最左代标带，逐辈竖排「第壹代…」，与该辈行带垂直居中 */
for (const d of depths) {
  const g = document.createElement("div");
  g.className = "gen";
  g.setAttribute("aria-hidden", "true");
  setWrapped(g, "第" + hanNum(d + 1) + "代", true);
  g.style.left = (FR_L + 8) + "px";
  g.style.width = (GEN_W - 12) + "px";
  g.style.top = (levelTop[d] + levelH[d] / 2) + "px";
  board.appendChild(g);
}
calibrateFallback();   /* 幂等复跑：收代标带（.gen 宽度已定，无布局副作用） */

/* 4. 题头：竖题居右，如挂轴卷端题识（无栏线，仅留白条） */
heading.style.left = (ORIGIN + dRoot.w + padM) + "px";
heading.style.top = (FR_T + 26) + "px";

/* 4b. 方印（可选 @seal=图径）：右端题识正下之方印，边长定值 100px、
   题识块（COL_W 130）下居中；正片叠底令白文透纸。
   定位规则：恒在题识「文字实际 extent 底缘」之下再空 SEAL_GAP，不覆字——
   盒高（offsetHeight）不保证等于竖排文字实 extent，故以 Range 量文字
   底缘（视觉px 经 scale 折算回布局px）；字体 swap 完毕度量或变，重定位一次 */
if (meta.seal) {
  const sealEl = document.createElement("img");
  sealEl.className = "seal";
  sealEl.src = meta.seal;
  sealEl.alt = "";
  sealEl.setAttribute("aria-hidden", "true");
  board.appendChild(sealEl);
  sealEl.style.width = sealEl.style.height = "100px";
  sealEl.style.left = (heading.offsetLeft + (COL_W - 100) / 2) + "px";
  const SEAL_GAP = 24;                          /* 文字底缘与印顶之距（布局px） */
  const placeSeal = function () {
    const scale = (sealEl.getBoundingClientRect().width / 100) || 1;   /* 视觉px/布局px（根 zoom） */
    const hb = heading.getBoundingClientRect();
    const rr = document.createRange();
    rr.selectNodeContents(heading);
    const textBottom = heading.offsetTop + (rr.getBoundingClientRect().bottom - hb.top) / scale;
    sealEl.style.top = (textBottom + SEAL_GAP) + "px";
  };
  placeSeal();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSeal);
}

/* 5. 连线：仅父子血缘墨线——每父一梳式正交墨线：父名底垂下至辈间廊道
   之横担（横担横贯其全部子列），各子自横担垂下收于名顶，无箭镞。
   帝位传承不画线（@throne 名单仅驱动位次与加粗）。墨线竖段只走辈间
   廊道与名顶上方间隙，不穿字盒。
   LINE_GAP：出线/入线两端与人名字盒之间的气口——线不触名，观感不连笔 */
const LINE_GAP = 8;
let inkPaths = "";
(function draw(node) {
  const cs = node.childrenD;
  if (!cs.length) return;
  const y0    = levelTop[node.depth] + node.nameH + LINE_GAP;
  const railY = levelTop[node.depth] + levelH[node.depth] + GAP_Y / 2;
  let minX = Infinity, maxX = -Infinity;
  for (const c of cs) { minX = Math.min(minX, c.nx); maxX = Math.max(maxX, c.nx); }
  inkPaths += "M" + node.nx + " " + y0 + " V" + railY + " ";
  inkPaths += "M" + minX + " " + railY + " H" + maxX + " ";
  for (const c of cs) {
    inkPaths += "M" + c.nx + " " + railY + " V" + (levelTop[c.depth] - LINE_GAP) + " ";
    draw(c);
  }
})(dRoot);

/* 5b. 辈分行带：淡墨虚线矩形，横贯树区（树区左缘→右缘），
   上下缘自该行字盒区各内缩 6px，把行间道留给父子墨线横担 */
let bandPaths = "";
for (const d of depths) {
  const y1 = levelTop[d] - 6, y2 = levelTop[d] + levelH[d] + 6;
  bandPaths += "M" + ORIGIN + " " + y1 + " H" + (ORIGIN + dRoot.w) +
               " V" + y2 + " H" + ORIGIN + " Z ";
}

svg.setAttribute("width", boardW);
svg.setAttribute("height", boardH);
svg.innerHTML =
  (bandPaths ? '<path class="band" d="' + bandPaths.trim() + '"/>' : "") +
  (inkPaths ? '<path class="ink" d="' + inkPaths.trim() + '"/>' : "");

/* 6. 定位节点（名字中线对齐 nx） */
for (const n of shown) {
  const d = els.get(n);
  d.style.left = (n.nx - NAME_CX_OFF) + "px";
  d.style.top = levelTop[n.depth] + "px";
  d.style.visibility = "";
}

/* 7. 悬浮传位层（渐进增强：默认面无浮层）——hover 浮现、移开即净；
   点击钉住（再点同帝解除、点他帝改钉、点空白解除），钉住中 hover 不生效。
   路由（R1–R7）：
   R1 父死子继（继任＝前任之子）→ 复用父子墨线梳路（父垂→廊道横担→子垂），
      朱线覆描墨线，箭镞收于子名顶；
   R2 同辈非父子 → 侧端口水平直连（端口＝该侧最外文字块外缘＋4px 气口，
      不划穿自身诸栏），横跨淡影无妨；邻格侧口行程容不下箭镞时改梳形
      顶/底入（源顶/底出名柱→廊道横穿→目标顶/底入，R1 同形）；
      来回对双道按行高四分位均布（顺接走上四分位、回返走下四分位），
      单向一道居名字中线高；
   R3 跨辈非父子：继任在下＝单肘 L（源侧端口出→水平→目标顶端口入）；
      继任在上＝双肘（源侧端口出→水平→垂直→目标侧端口入）；
      两向另备侧出早升/早降侧入（侧出即于源格外短距处直升/直降，至
      目标行中线高横穿侧入，少折且不骑名柱）；
      源端出线非独侧出——亦得顶/底出，以转折少者优（见 R7）；
   R4 箭镞恒在受端端口、指向端口内；线与镞同朱色；
   R5 竖让：竖直段不走任一端点名柱——名柱上恒有墨线/R1 之顶入底出竖段，
      走之必与他线重描；唯一例外＝该线本身即此柱唯一顶入线（R1/R3a 收顶
      端口者）。故 R3b 之垂直段改贴目标受侧文字块外缘外 18px（≥MIN_RUN，
      末段容得下箭镞），两不沾名柱；
   R6 跨让：同层浮层线互不相交、亦不穿不淡者——R3b 竖段所跨廊道内若同层
      有 R1 梳线横担，禁入区＝横担跨度向其两端各外扩一格宽（横担本身＋
      两端节点之格＋气口；落跨度内于廊道成 X，落两端格内穿其名栏），
      竖段入区即让至区外（源在区左取 lo−(COL_W/2+12)、右取 hi+(COL_W/2+12)）；
      无横担时仍守 R5 贴缘值。
   R7 避层与转折省：朱线不得穿越四人上下文（本边两端点除外）之字格，
      淡者仍可穿，唯同折数候补中以少穿淡者优（尽量不越淡影，软规则）。
      四人上下文＝{出线者前序、出线者、入线者、入线者后序}（pre/suc 取名单
      邻接，首尾缺省）；pre/suc 纵在当前层淡出亦恒视为不可穿硬障——
      路线只依赖边自身，悬停任一端点皆同形（连线存在期间不变）。
      每边生成候补序列——
      首位恒标准路由；备选者源端得顶/底出名柱（底出降本辈廊道、顶出升上辈
      廊道，免穿自身字格），廊道横穿后垂降目标顶/底端口或折回侧端口
      （R3a 底出与 R1 同形之梳路；R2 邻格梳形顶/底入；R3b 顶出→目标行
      上廊→顶入；R3 侧出早升/早降→至目标行中线高横穿侧入）；
      侧出者附侧翼竖段两档（字格外 12px / 格外一格宽）。
      候补逐段校验（穿障字格、与已画线相交或共线叠行均出局；唯同父兄弟
      继任梳路之共轴出口段天生共干，叠不算重描——共干豁免，2026-10-14
      用户定谳），洁净者中
      取转折最少，同折取少穿淡者，再同先列者优；末段行程不足 MIN_RUN（容不下箭镞）者
      降为次选，仅在无合格者时用；R1 梳路天生无穿，先画作底供后线避让；
      全部落选则回退标准路由并告警。
   全局定算：布局毕所有边按规范序（R1 梳路先、余按全局边序）一次路由、
      每边存路；互避 taken 依此序累积——任一焦点所画集皆全局集之
      子集且保相对序，子集内互避不破。applyFocus 不再路由、仅拼存路。
   淡出仅人员：无关者 .dim 半透明，墨线整条退 0.35 作背景，行带/代标不淡 */
const focusPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
focusPath.setAttribute("class", "focus");
svg.appendChild(focusPath);
const inkEl = svg.querySelector("path.ink");
const arrowD = function (x, y) {   /* 下向尖：收于顶端口 */
  return " M" + (x - 5) + " " + (y - 7) + " L" + x + " " + y + " L" + (x + 5) + " " + (y - 7);
};
const arrowR = function (x, y) {   /* 右向尖：收于左端口 */
  return " M" + (x - 7) + " " + (y - 5) + " L" + x + " " + y + " L" + (x - 7) + " " + (y + 5);
};
const arrowL = function (x, y) {   /* 左向尖：收于右端口 */
  return " M" + (x + 7) + " " + (y - 5) + " L" + x + " " + y + " L" + (x + 7) + " " + (y + 5);
};
const arrowU = function (x, y) {   /* 上向尖：收于底端口 */
  return " M" + (x - 5) + " " + (y + 7) + " L" + x + " " + y + " L" + (x + 5) + " " + (y + 7);
};
const nameMidY = function (n) { return levelTop[n.depth] + n.nameH / 2; };
/* R2 道高：单向一道居名字中线；来回对双道按行高四分位布道——
   顺接（lane<0）走上四分位、回返（lane>0）走下四分位，两道均分行带 */
const laneY = function (e, n) {
  if (!e.lane) return nameMidY(n);
  const t = levelTop[n.depth], h = levelH[n.depth];
  return e.lane < 0 ? t + h / 4 : t + 3 * h / 4;
};
const routeEdge = function (e, runs) {
  const a = e[0], b = e[1];
  runs = runs || [];
  if (b.parentD === a) {                        /* R1 父死子继：复用墨线梳路 */
    const railY = levelTop[a.depth] + levelH[a.depth] + GAP_Y / 2;
    const yA = levelTop[a.depth] + a.nameH + LINE_GAP;
    const yB = levelTop[b.depth] - LINE_GAP;
    return "M" + a.nx + " " + yA + " V" + railY + " H" + b.nx + " V" + yB + arrowD(b.nx, yB);
  }
  if (a.depth === b.depth) {                    /* R2 同辈非父子：侧端口水平直连 */
    const y = laneY(e, a);
    if (a.nx < b.nx) return "M" + a.portR + " " + y + " H" + b.portL + arrowR(b.portL, y);
    return "M" + a.portL + " " + y + " H" + b.portR + arrowL(b.portR, y);
  }
  if (b.depth > a.depth) {                      /* R3a 继任在下：侧出→水平→顶入 */
    const yB = levelTop[b.depth] - LINE_GAP;
    if (b.nx === a.nx) {                        /* 同柱正下退化（如祖→孙隔代继，成皋 載垸→常㳛 例）：
                                                   侧口出线之横段必回穿自身字格（端点豁免致 R7 不拦、
                                                   折少反胜），多出一段骑名横担——改沿 R1 梳路轴底出
                                                   直降顶入（朱覆墨重描、零横段）2026-10-16 */
      const yA = levelTop[a.depth] + a.nameH + LINE_GAP;
      return "M" + a.nx + " " + yA + " V" + yB + arrowD(a.nx, yB);
    }
    const y = nameMidY(a);
    const sx = b.nx > a.nx ? a.portR : a.portL;
    return "M" + sx + " " + y + " H" + b.nx + " V" + yB + arrowD(b.nx, yB);
  }
  {                                             /* R3b 继任在上：侧出→水平→垂直→侧入（R5 竖让、R6 跨让） */
    const yS = nameMidY(a), yT = nameMidY(b);
    const right = b.nx > a.nx;
    let vx = right ? b.portL - 18 : b.portR + 18;
    for (const r of runs) {                     /* R6：竖段让出同层 R1 横担禁入区（跨度＋两端格宽） */
      const pad = NAME_CX_OFF + 12;
      if (r.c >= b.depth && r.c < a.depth && vx >= r.lo - pad && vx <= r.hi + pad)
        vx = a.nx < r.lo ? r.lo - pad : r.hi + pad;
    }
    if (right) return "M" + a.portR + " " + yS + " H" + vx + " V" + yT + " H" + b.portL + arrowR(b.portL, yT);
    return "M" + a.portL + " " + yS + " H" + vx + " V" + yT + " H" + b.portR + arrowL(b.portR, yT);
  }
};
/* ---- R7 避层：候选生成与逐段校验（规则详上注 R7） ---- */
const railYOf = function (d) { return levelTop[d] + levelH[d] + GAP_Y / 2; };
const cellH = function (n) { return Math.max(n.nameH, n.posH, n.tiH, n.rkH, n.moH, n.jiH, n.zaiH); };
const obsRect = function (n) {   /* 字格：横＝侧端口跨度（含 4px 气口），纵＝行顶至其最深栏底 */
  return { l: n.portL, r: n.portR, t: levelTop[n.depth] - 2,
           b: levelTop[n.depth] + cellH(n) + 2 };
};
const routeSegs = function (d) {   /* 路由 d → H/V 线段表（箭镞仅 L 指令，自然滤除） */
  const segs = [];
  let x = 0, y = 0;
  for (const cmd of d.match(/[MHVL][^MHVL]*/g) || []) {
    const op = cmd.charAt(0), v = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    if (op === "M") { x = v[0]; y = v[1]; }
    else if (op === "H") { segs.push({ o: "H", y: y, x1: Math.min(x, v[0]), x2: Math.max(x, v[0]) }); x = v[0]; }
    else if (op === "V") { segs.push({ o: "V", x: x, y1: Math.min(y, v[0]), y2: Math.max(y, v[0]) }); y = v[0]; }
    else if (op === "L") { x = v[0]; y = v[1]; }
  }
  return segs.filter(function (s) { return (s.o === "H" ? s.x2 - s.x1 : s.y2 - s.y1) > 0.5; });
};
const R7_EPS = 2;
const MIN_RUN = 16;   /* 收端段最短行程：箭镞长 7，过短即吞杆（七栏君主邻格侧口仅 8px）——与 R1/R3a 末垂 18px 同标 */
const segHits = function (s, r) {   /* H/V 段是否穿入字格 r（留气口） */
  return s.o === "H" ? (s.y > r.t + R7_EPS && s.y < r.b - R7_EPS && s.x1 < r.r - R7_EPS && s.x2 > r.l + R7_EPS)
                     : (s.x > r.l + R7_EPS && s.x < r.r - R7_EPS && s.y1 < r.b - R7_EPS && s.y2 > r.t + R7_EPS);
};
const segsCross = function (s1, s2) {   /* H×V 相交（严格内部；端点相触、平行叠行不计） */
  const h = s1.o === "H" ? s1 : s2, v = s1.o === "H" ? s2 : s1;
  if (h.o !== "H" || v.o !== "V") return false;
  return v.x > h.x1 + R7_EPS && v.x < h.x2 - R7_EPS && h.y > v.y1 + R7_EPS && h.y < v.y2 - R7_EPS;
};
const segsOverlap = function (s1, s2) {   /* 同向共线叠行（朱线重描朱线，防上下源出名柱与他线叠迹） */
  if (s1.o !== s2.o) return false;
  return s1.o === "H"
    ? (Math.abs(s1.y - s2.y) <= R7_EPS && Math.min(s1.x2, s2.x2) - Math.max(s1.x1, s2.x1) > R7_EPS)
    : (Math.abs(s1.x - s2.x) <= R7_EPS && Math.min(s1.y2, s2.y2) - Math.max(s1.y1, s2.y1) > R7_EPS);
};
/* 候选序列：首位恒标准路由；后附诸备选变体——源端非独侧出，亦得顶/底出
   名柱经辈间廊道横穿（底出配本辈下廊、顶出配上辈上廊，免穿自身字格）；
   同层边另附梳形顶/底入两式（邻格专备，见 R2）；侧出者附侧翼竖段两档
   （字格外 12px / 格外一格宽）与早升/早降侧入（R3，侧出即升/降至
   目标行中线高横穿侧入）、晚升/晚降侧入（竖段改贴目标受缘外两档，
   长横先行——与早式同折而得零穿者，2026-10-18 补族）。当选以洁净候补中转折最少、末段行程
   ≥ MIN_RUN 者（同折取少穿淡者，再同先列者优，标准路由天然同数即胜） */
const routeCandidates = function (e, runs) {
  const a = e[0], b = e[1];
  const cands = [routeEdge(e, runs)];
  if (b.parentD === a) return cands;            /* R1 梳路：廊道天生无穿，单候选即足 */
  const FLANKS = [12, NAME_CX_OFF + 12];
  const right = b.nx > a.nx, sgn = right ? 1 : -1;
  const yBt = levelTop[b.depth] - LINE_GAP;
  const topIn = " H" + b.nx + " V" + yBt + arrowD(b.nx, yBt);   /* 廊道横穿→垂降顶入 */
  const yBot = levelTop[a.depth] + a.nameH + LINE_GAP;          /* 源底出口（名柱，R1 同式） */
  const yTop = levelTop[a.depth] - LINE_GAP;                    /* 源顶出口（名柱） */
  const railDn = railYOf(a.depth);
  const railUp = a.depth > 0 ? railYOf(a.depth - 1) : null;
  if (a.depth === b.depth) {                    /* R2 同辈：绕行折回目标侧端口入 */
    const yA = laneY(e, a), yB = laneY(e, b);
    const out = right ? a.portR : a.portL, inn = right ? b.portL : b.portR;
    const tail = " V" + yB + " H" + inn + (right ? arrowR(inn, yB) : arrowL(inn, yB));
    /* 梳形直达（邻格专备）：侧口行程容不下箭镞、或中行有阻时，源底出降本廊／
       顶出升上廊横穿，目标底入（上向箭）／顶入——与 R1 同形，末垂 ≥18px */
    const yBotB = levelTop[b.depth] + cellH(b) + LINE_GAP;   /* 目标底端口 */
    cands.push("M" + a.nx + " " + yBot + " V" + railDn + " H" + b.nx + " V" + yBotB + arrowU(b.nx, yBotB));
    if (railUp !== null)
      cands.push("M" + a.nx + " " + yTop + " V" + railUp + " H" + b.nx + " V" + yBt + arrowD(b.nx, yBt));
    FLANKS.forEach(function (off) {
      const x2 = inn - sgn * off;
      cands.push("M" + a.nx + " " + yBot + " V" + railDn + " H" + x2 + tail);   /* 底出 */
      if (railUp !== null)
        cands.push("M" + a.nx + " " + yTop + " V" + railUp + " H" + x2 + tail); /* 顶出 */
      [railDn, railUp].forEach(function (ry) {                                   /* 侧出贴翼 */
        if (ry === null) return;
        cands.push("M" + out + " " + yA + " H" + (out + sgn * off) + " V" + ry + " H" + x2 + tail);
      });
    });
  } else if (b.depth > a.depth) {               /* R3a 继任在下 */
    const sx = right ? a.portR : a.portL, yA = nameMidY(a);
    /* 侧出早降侧入（与 R3b 早升对称）：侧出即于源格外短距处直降，
       至目标行中线高横穿侧入 */
    const yT = nameMidY(b), inn = right ? b.portL : b.portR;
    const arrS = right ? arrowR(inn, yT) : arrowL(inn, yT);
    FLANKS.forEach(function (off) {
      cands.push("M" + sx + " " + yA + " H" + (sx + sgn * off) + " V" + yT + " H" + inn + arrS);
    });
    /* 晚降侧入（与 R3b 贴目标受缘竖段对称）：长横先行越过障碍，竖段贴
       目标受缘外短距处直降，短横即入——与早降同折；早降骑淡名时此式
       零穿即胜（見潚→祐橺 穿祐欘/祐棿 例，2026-10-18 用户定谳补族） */
    FLANKS.forEach(function (off) {
      cands.push("M" + sx + " " + yA + " H" + (inn - sgn * off) + " V" + yT + " H" + inn + arrS);
    });
    cands.push("M" + a.nx + " " + yBot + " V" + railDn + topIn);   /* 底出梳路（与 R1 同形） */
    FLANKS.forEach(function (off) {
      [railDn, railUp].forEach(function (ry) {                      /* 侧出贴翼 */
        if (ry === null) return;
        cands.push("M" + sx + " " + yA + " H" + (sx + sgn * off) + " V" + ry + topIn);
      });
    });
  } else if (b.depth > 0) {                     /* R3b 继任在上 */
    const sx = right ? a.portR : a.portL, yS = nameMidY(a), yT = nameMidY(b);
    const ryB = railYOf(b.depth - 1);           /* 目标行上廊 */
    const inn = right ? b.portL : b.portR;
    const arr = right ? arrowR(inn, yT) : arrowL(inn, yT);
    /* 侧出早升侧入：侧出即于源格外短距处直升，至目标行中线高横穿侧入——
       比顶入变体少折且不骑名柱（如 圉→重耳 之理想路） */
    FLANKS.forEach(function (off) {
      cands.push("M" + sx + " " + yS + " H" + (sx + sgn * off) + " V" + yT + " H" + inn + arr);
    });
    cands.push("M" + a.nx + " " + yTop + " V" + ryB + topIn);      /* 顶出→上廊→顶入 */
    FLANKS.forEach(function (off) {
      const x2 = inn - sgn * off;
      cands.push("M" + a.nx + " " + yBot + " V" + railDn + " H" + x2 + " V" + yT + " H" + inn + arr);   /* 底出→下廊→侧入 */
      cands.push("M" + sx + " " + yS + " H" + (sx + sgn * off) + " V" + ryB + topIn);                   /* 侧出贴翼→顶入 */
    });
    let vx = right ? b.portL - 18 : b.portR + 18;   /* 贴目标受缘竖段（R5/R6 让法同式，18＝末段容箭） */
    for (const r of runs) {
      const pad = NAME_CX_OFF + 12;
      if (r.c >= b.depth - 1 && r.c < a.depth && vx >= r.lo - pad && vx <= r.hi + pad)
        vx = a.nx < r.lo ? r.lo - pad : r.hi + pad;
    }
    cands.push("M" + sx + " " + yS + " H" + vx + " V" + ryB + topIn);
  }
  return cands;
};
/* R7 选录：候补逐段校验取首个洁净者——正选须末段行程 ≥ MIN_RUN，
   次选洁净而末段短者兜底，全败回退标准路由并告警 */
const routeOne = function (e, runs, taken, obs, dimObs) {
  const cands = routeCandidates(e, runs);
  let pick = null, pickTurns = Infinity, pickDim = Infinity;   /* 正选：洁净且末段行程 ≥ MIN_RUN */
  let soft = null, softTurns = Infinity, softDim = Infinity;   /* 次选：洁净但末段短（聊胜穿格/无解） */
  for (let i = 0; i < cands.length; i++) {
    const segs = routeSegs(cands[i]);
    const turns = segs.length - 1;            /* 转折数＝段数减一 */
    const clean =
      obs.every(function (r) { return segs.every(function (s) { return !segHits(s, r); }); }) &&
      taken.every(function (s2) { return segs.every(function (s) { return !segsCross(s, s2) && !segsOverlap(s, s2); }); });
    if (!clean) continue;
    const dimN = dimObs.reduce(function (c, r) {   /* 所穿淡者人数（按人计，不按栏） */
      return c + (segs.some(function (s) { return segHits(s, r); }) ? 1 : 0);
    }, 0);
    const fin = segs[segs.length - 1];
    const run = fin.o === "H" ? fin.x2 - fin.x1 : fin.y2 - fin.y1;
    /* 口径 B：少折优先，同折数取少穿淡者，再同先列者优（标准路由天然保位） */
    if (run >= MIN_RUN) {
      if (turns < pickTurns || (turns === pickTurns && dimN < pickDim))
        { pick = { d: cands[i], segs: segs }; pickTurns = turns; pickDim = dimN; }
    } else if (turns < softTurns || (turns === softTurns && dimN < softDim)) {
      soft = { d: cands[i], segs: segs }; softTurns = turns; softDim = dimN;
    }
  }
  if (!pick) pick = soft;                     /* 同数先列者优，标准路由天然保位 */
  if (!pick) {
    console.warn("[lineage] R7 绕行无解，回退标准路由：", e[0].name + "→" + e[1].name);
    pick = { d: cands[0], segs: routeSegs(cands[0]) };
  }
  return pick;
};
/* 全局定算：每边路线在此一次定讫、不随焦点变化（连线存在期间不变）。
   硬障＝四人上下文{pre,源,靶,suc}除端点；软障＝四人集外全部 shown 人物；
   互避 taken 依规范序（R1 梳路先、余按全局边序）累积——惟同屏方能互碍，
   两边共现仅当同悬一端点，故 taken 只取与本边共端点之先路由边 */
(function () {
  const order = focusEdges.slice().sort(function (x, y) {
    return (y[1].parentD === y[0] ? 1 : 0) - (x[1].parentD === x[0] ? 1 : 0);
  });
  const runs = [];
  order.forEach(function (e) {
    if (e[1].parentD === e[0]) runs.push({ c: e[0].depth, lo: Math.min(e[0].nx, e[1].nx), hi: Math.max(e[0].nx, e[1].nx) });
  });
  const routed = [];                            /* {e, segs} 已定算诸边 */
  order.forEach(function (e) {
    const ctx = [e.pre, e[0], e[1], e.suc];
    const obs = [], dimObs = [];
    ctx.forEach(function (n) { if (n && n !== e[0] && n !== e[1]) obs.push(obsRect(n)); });
    shown.forEach(function (m) { if (ctx.indexOf(m) < 0) dimObs.push(obsRect(m)); });
    const taken = [];
    routed.forEach(function (r) {
      if (!(r.e[0] === e[0] || r.e[1] === e[0] || r.e[0] === e[1] || r.e[1] === e[1])) return;
      /* 共干豁免（2026-10-14 用户定谳）：同父兄弟继任之父死子继梳路，
         出口段（名柱底垂降廊道）天生共轴同迹——两朱线重合观感即一干
         分叉（与墨梳同形），不计为重描。已路由边之出口段（首段、须为
         父柱轴上之 V）不入本边互避；余段照常 */
      const frat = r.e[0] === e[0] && r.e[1].parentD === r.e[0] && e[1].parentD === e[0];
      r.segs.forEach(function (s, si) {
        if (frat && si === 0 && s.o === "V" && s.x === r.e[0].nx) return;
        taken.push(s);
      });
    });
    const pick = routeOne(e, runs, taken, obs, dimObs);
    routed.push({ e: e, segs: pick.segs });
    e.d = pick.d;
  });
})();
let hovered = null, pinned = null;
const applyFocus = function (node) {
  if (!node) {
    for (const n of shown) els.get(n).classList.remove("dim");
    inkEl.style.opacity = "";
    focusPath.setAttribute("d", "");
    return;
  }
  const edges = focusInc.get(node) || [];
  const keep = new Set([node]);                 /* 不淡出＝悬停者＋所显边之另一端 */
  edges.forEach(function (e) { keep.add(e[0]); keep.add(e[1]); });
  for (const n of shown) els.get(n).classList.toggle("dim", !keep.has(n));
  inkEl.style.opacity = "0.35";
  /* 路线已于布局时全局定算（见全局定算注），此处仅拼所涉边存路 */
  focusPath.setAttribute("d", edges.map(function (e) { return e.d; }).join(" "));
};
for (const n of shown) {
  if (!hoverables.has(n)) continue;   /* 单人名单成员亦挂悬浮（无边＝无朱线，淡出照旧） */
  const el = els.get(n);
  el.classList.add("hov");
  el.addEventListener("mouseenter", function () { hovered = n; if (!pinned) applyFocus(n); });
  el.addEventListener("mouseleave", function () { hovered = null; if (!pinned) applyFocus(null); });
  el.addEventListener("click", function (ev) {
    ev.stopPropagation();
    pinned = (pinned === n) ? null : n;
    applyFocus(pinned || hovered);
  });
}
document.addEventListener("click", function () {   /* 点空白解除钉住 */
  if (pinned) { pinned = null; applyFocus(hovered); }
});

/* ── 键盘导航（渐进增强，2026-10-15；引擎全生成、壳零改） ─────────────
   漫游 tabindex：tab 序中恒只一个节点（当前焦点人，初态＝始祖，locate
   定位时顺带移就）。入板后方向键走板——↑＝父（上辈）、↓＝横向最近之子
   （下辈；无子则落下一非空辈分横距最近者，辈分步走不断头）、←→＝同辈
   相邻（按名字中线序，即「列」）；Enter/空格＝点击该节点同效（深链回写；
   君主加钉传位层、再按解除）；Esc＝解除钉住（同点空白）。
   焦点框走 CSS :focus-visible（键盘驱动之 focus() 命中、鼠标点击不扰），
   朱色虚线圈名字栏——与 found 朱晕（定位闪）判然：一为「人在哪」、
   一为「找着了谁」。触屏/无键盘端零感知（无焦点即无框，节点不添噪） */
const byDepthX = new Map();   /* 辈分 → 该辈节点按名字中线横序（「列」序） */
for (const n of shown) {
  if (!byDepthX.has(n.depth)) byDepthX.set(n.depth, []);
  byDepthX.get(n.depth).push(n);
}
byDepthX.forEach(function (a) { a.sort(function (x, y) { return x.nx - y.nx; }); });
const elOwner = new Map();    /* 节点元素 → 节点（键盘事件委托反查） */
for (const n of shown) { const d = els.get(n); d.tabIndex = -1; elOwner.set(d, n); }
let kCur = shown[0] || null;
if (kCur) els.get(kCur).tabIndex = 0;
const kSet = function (n, doFocus) {   /* 移漫游制表位；doFocus 则真移焦并滚入视口 */
  if (!n) return;
  if (kCur && kCur !== n) els.get(kCur).tabIndex = -1;
  kCur = n;
  const el = els.get(n);
  el.tabIndex = 0;
  if (doFocus) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
};
const nearestByX = function (row, x) {   /* 行内横距最近者 */
  let t = row[0];
  for (const m of row) if (Math.abs(m.nx - x) < Math.abs(t.nx - x)) t = m;
  return t;
};
board.addEventListener("keydown", function (ev) {
  const el = ev.target.closest && ev.target.closest(".node");
  if (!el) return;
  const n = elOwner.get(el);
  if (!n) return;
  if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); el.click(); return; }
  if (ev.key === "Escape") { if (pinned) { pinned = null; applyFocus(hovered); } return; }
  let t = null;
  if (ev.key === "ArrowUp") {
    t = (n.parentD && n.parentD.name) ? n.parentD : null;
  } else if (ev.key === "ArrowDown") {
    if (n.childrenD.length) {
      t = nearestByX(n.childrenD, n.nx);
    } else {
      let nd = -1;
      for (const d of depths) if (d > n.depth) { nd = d; break; }   /* depths 升序：首个更深非空辈 */
      if (nd >= 0) t = nearestByX(byDepthX.get(nd), n.nx);
    }
  } else if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
    const row = byDepthX.get(n.depth) || [];
    t = row[row.indexOf(n) + (ev.key === "ArrowRight" ? 1 : -1)] || null;
  } else return;
  if (t) { ev.preventDefault(); kSet(t, true); }
});

board.style.width = boardW + "px";
board.style.height = boardH + "px";

/* ── 寻人与深链（渐进增强：DOM 全由引擎生成，壳零改） ──────────────
   寻人：右下角朱印「尋」点开输入条，名/称号/年号/母即时索（子串即中，
     名次优先，同名次按级——@throne 键号即级（帝王＞藩王＞郡王＞宗室），
     同级按代数（第N代），再同保文档序），多命中出候选小笺（名＋称号＋第N代），
     选中即定位：节点滚至视口居中、朱晕呼吸两闪；君主顺手代钉传位层。
     键盘：/ 聚焦，↑↓择条，Enter 定位，Esc 收；输入停顿百毫秒方重建
     小笺（轻防抖），命中数无限、逾渲染宽阀（100 条）明示注脚不默截。
   年份检索（2026-10-14 用户定谳）：整串书「(公元前|前)数字年」即入——
     阿拉伯或汉字数字（含单位字按位值、纯数字字逐位拼接，详 yearQuery 注），
     中其年在位者：闭区间 [即位年, 即位年＋在位数]，复辟逐段独立折算、
     小笺第二行只显所中段起讫（在位壹肆叁伍—壹肆肆玖）；欠在位数或
     月/天精度只中即位年当年，无即位年之段不中；结果按段起始年升序，
     同年按级（@throne 键号）、同级按代数。
   深链（2026-10-15 起年深链并收）：#人名 开页即定位加亮（字体就绪后
     复定位一次），点任一节点回写 hash（replaceState 不污历史）——博文
     可径链某人某格；#年=1449（前/公元前负轴、汉字数字均认，口径同年
     检索）定位段起始年升序之首条并留年榜小笺——博文可径链时间点。
     重名（占位名）取文档序第一；寻人与深链共一定位函数。
   键盘导航（2026-10-15）：漫游 tabindex 入板（初态始祖，定位随移），
     ↑↓走辈（父/最近子，无子落下一辈最近列）、←→走列（同辈相邻）、
     Enter/空格＝点击（深链回写＋君主钉传位层）、Esc 解除钉住——详
     「键盘导航」节注。
   @alias 别名（_falias）并入名字级名次：全同=0、子串=1，与主名同权；
     候选小笺仍只显主名，#别名 深链亦定位（locate 后回写主名）。
   简繁：查询与节点字段同表折叠为简体再比——输入「朱祁镇」即中「朱祁鎮」。
     表由 tools/gen-t2s.mjs 据内收 OpenCC 字表生成（数据块用字之繁简
     对照全集，数据添字后重跑即补，表字随 subset-fonts.mjs 自动入子集）；
     表只求自洽（同字同折、两侧一致），不求语言学精确，幹/乾多归一无碍
     匹配。折叠字段 _f* 建索引时一次算成。 */
/* T2S 表：tools/gen-t2s.mjs 据内收 OpenCC 字表生成（358 对＝数据块用字繁简对照全集∪旧表），勿手改；数据添字后重跑该工具，再 subset-fonts.mjs（表字自动入子集）。 */
const T2S_SRC =
  "乾佔侖倉個倫側傑傳僑儀兩別剛劉勝勳勵厲吳呂啟喚單嚴國圖堯塊塏塵壽嬪嬰孫寧寫寶將尋對層" +
  "峯崗嶽師帶幹庫廢廣廬張彌後復恆愛愨愷慶憖憫憲懷懸掄揚換擊據數於時晉晝暉曆書會東棄棖棗" +
  "棟棡楊楨極榘榮構槮樂標樞樸樺樿檟檢檳櫸欄權欒欽歸殤沖涇渾湯溈準溫滄漢漬漵潁潔潙潚潛潤" +
  "澐澤濟濤瀾灃為烏烴無煉煒煙煥熲熾燁燦爲爾獨獲獻瑪璉璸瓊甌畫當發監盧碩碽祐祕祿禎禕禪禮" +
  "稜稱筆節範簡紀納純紱紹絡統綏綬綱綴綿緒線緡緯縮繆繼續羅聖聰肅臘臨與興荊莊華萬葉蒞蔣蕩" +
  "薊蘄蘇蘭虛號蝨蟣衛袞裏襲見視親覺觀計訢許詭認誠談諸謙謝謹讓豎豐貝貞負貳貴費賈賓賕賢質" +
  "賴賽趙車軍載輔輝輩輿連進過達遜遼鄉鄒鄖鄧鄭釋釘鈕鈞鈦鈴鈺鉅鉗鉦銑銓銘銳鋙鋥鋮錙錢錫鍈" +
  "鍔鍵鍺鍼鍾鎔鎡鎧鎬鎮鏐鏞鏵鐘鐯鐸鑄鑑鑿長開閔閻關闢陞陰陳陸陽隱雙靈靜韋韓韜頃順須頎頤" +
  "題額顏顒類顯餘館饒馬馮驕驩驪魯鹹麗黃點黶齊齒";
const T2S_DST =
  "干占伦仓个伦侧杰传侨仪两别刚刘胜勋励厉吴吕启唤单严国图尧块垲尘寿嫔婴孙宁写宝将寻对层" +
  "峰岗岳师带干库废广庐张弥后复恒爱悫恺庆慭悯宪怀悬抡扬换击据数于时晋昼晖历书会东弃枨枣" +
  "栋㭎杨桢极矩荣构椮乐标枢朴桦椫槚检槟榉栏权栾钦归殇冲泾浑汤沩准温沧汉渍溆颍洁沩㴋潜润" +
  "沄泽济涛澜沣为乌烃无炼炜烟焕颎炽烨灿为尔独获献玛琏瑸琼瓯画当发监卢硕䂵佑秘禄祯祎禅礼" +
  "棱称笔节范简纪纳纯绂绍络统绥绶纲缀绵绪线缗纬缩缪继续罗圣聪肃腊临与兴荆庄华万叶莅蒋荡" +
  "蓟蕲苏兰虚号虱虮卫衮里袭见视亲觉观计欣许诡认诚谈诸谦谢谨让竖丰贝贞负贰贵费贾宾赇贤质" +
  "赖赛赵车军载辅辉辈舆连进过达逊辽乡邹郧邓郑释钉钮钧钛铃钰巨钳钲铣铨铭锐铻锃铖锱钱锡锳" +
  "锷键锗针钟镕镃铠镐镇镠镛铧钟䦃铎铸鉴凿长开闵阎关辟升阴陈陆阳隐双灵静韦韩韬顷顺须颀颐" +
  "题额颜颙类显余馆饶马冯骄欢丽鲁咸丽黄点黡齐齿";
const T2S = {};
for (let i = 0; i < T2S_SRC.length; i++) T2S[T2S_SRC[i]] = T2S_DST[i];
const fold = function (s) {
  if (!s) return s;
  let out = "";
  for (const ch of s) out += T2S[ch] || ch;
  return out;
};
for (const n of shown) {
  n._fname = fold(n.name);
  n._fti = fold(n.ti);
  n._fnh = fold(n.nh);
  n._fmo = fold(n.mo);
  n._falias = (n.alias || []).map(fold);   /* @alias 别名：只入检索，名次并入名字级 */
}
const seekMatch = function (q) {
  q = fold(q.trim());
  if (!q) return [];
  const scored = [];
  for (const n of shown) {
    const sc = (n._fname === q || n._falias.includes(q)) ? 0
             : (n._fname.includes(q) || n._falias.some(function (a) { return a.includes(q); })) ? 1
             : n._fti && n._fti.includes(q) ? 2
             : n._fnh && n._fnh.includes(q) ? 3
             : n._fmo && n._fmo.includes(q) ? 4 : -1;
    if (sc >= 0) scored.push({ n: n, sc: sc });
  }
  scored.sort(function (a, b) {   /* 名次＞级＞代数（2026-10-15 用户定谳）；再同保文档序（稳定排序） */
    return (a.sc - b.sc) || (a.n._lvl - b.n._lvl) || (a.n.depth - b.n.depth);
  });
  return scored.map(function (s) { return s.n; });        /* 命中数无上限（2026-10-14 用户定谳），渲染宽阀见 renderList */
};
/* ── 年份检索（2026-10-14 用户定谳七事） ─────────────────────────────
   输入整串「(公元前|前)数字年」即入年检索：阿拉伯数字（1617年）或汉字
   数字——含单位字（十百千萬，拾佰仟同认）按位值（十七年=17、一千六百
   一十七年=1617），纯数字字（零〇亦认，简繁大写俱收）逐位拼接（壹陸壹柒年
   =1617，与即位栏显示同款、所见即可输）；前/公元前＝负轴（前221年=-221）。
   命中口径：年段有即位年 y 与在位数 n（单位年）者按闭区间 [y, y+n]
   （交替代年前后两帝俱中）；n 欠或月/天精度者只中即位年当年；无即位年
   之段静默不中。复辟多段逐段独立折算，单年至多中一段（段不重叠），
   小笺第二行只显所中段起讫。结果按所中段起始年升序，同年按级（@throne
   键号）、同级按代数，再同保文档序。
   #年=值 深链（2026-10-15 用户定谳）同口径收年：定位升序首条、年榜
   留笺、地址栏回写其人名（见「载入定位」节） */
const CN_DIG = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
  壹: 1, 貳: 2, 贰: 2, 叁: 3, 參: 3, 参: 3, 肆: 4, 伍: 5, 陸: 6, 陆: 6, 柒: 7, 捌: 8, 玖: 9 };
const CN_UNIT = { 十: 10, 拾: 10, 百: 100, 佰: 100, 千: 1000, 仟: 1000 };
const cn2num = function (s) {
  if (/^[0-9]+$/.test(s)) return +s;
  let hasUnit = false;
  for (const ch of s) if (CN_UNIT[ch] || ch === "萬" || ch === "万") { hasUnit = true; break; }
  if (!hasUnit) {                                 /* 纯数字字：逐位拼接 */
    let v = 0;
    for (const ch of s) { if (!(ch in CN_DIG)) return null; v = v * 10 + CN_DIG[ch]; }
    return v;
  }
  let total = 0, section = 0, digit = null;       /* 位值：萬分节 */
  for (const ch of s) {
    if (ch in CN_DIG) { digit = CN_DIG[ch]; continue; }
    const u = CN_UNIT[ch];
    if (u) { section += (digit === null ? 1 : digit) * u; digit = null; continue; }
    if (ch === "萬" || ch === "万") { section = (section + (digit || 0)) * 10000; total += section; section = 0; digit = null; continue; }
    return null;                                  /* 不识别之字：非年查询 */
  }
  return total + section + (digit || 0);
};
const yearQuery = function (q) {                  /* 整串合「(公元前|前)数字年」→年值；否→null（走名索） */
  const m = q.trim().match(/^(公元前|前)?\s*([0-9]+|[零〇一二三四五六七八九十百千萬万壹贰貳叁參参肆伍陆陸柒捌玖拾佰仟]+)\s*年$/);
  if (!m) return null;
  const v = cn2num(m[2]);
  return v === null ? null : (m[1] ? -v : v);
};
const yearSearch = function (Y) {
  const out = [];
  for (const n of shown) {
    if (!n.segs) continue;
    for (const s of n.segs) {
      if (s.y === null) continue;                 /* 无即位年：无从时间定位，静默不中 */
      if ((s.n === null || s.u !== "年") ? (Y === s.y) : (Y >= s.y && Y <= s.y + s.n)) {
        n._ymatch = s; out.push(n); break;        /* 复辟多段：单年至多中一段 */
      }
    }
  }
  out.sort(function (a, b) {   /* 起始年＞级＞代数（2026-10-15 用户定谳）；再同保文档序（稳定排序） */
    return (a._ymatch.y - b._ymatch.y) || (a._lvl - b._lvl) || (a.depth - b.depth);
  });
  return out;
};
const setHash = function (n) {
  history.replaceState(null, "", "#" + encodeURIComponent(n.name));
};
let foundTimer = 0;
const locate = function (n) {
  const el = els.get(n);
  el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  el.classList.remove("found");
  void el.offsetWidth;                              /* 同节点连定位亦重闪 */
  el.classList.add("found");
  clearTimeout(foundTimer);
  foundTimer = setTimeout(function () { el.classList.remove("found"); }, 2400);
  if (hoverables.has(n)) { pinned = n; applyFocus(n); }   /* 君主：代钉传位层（含单人名单） */
  kSet(n, false);   /* 漫游制表位随定位移就：此后 Tab 入板即落其人，方向键续走（不移焦、不夺滚动） */
  setHash(n);
};
/* 深链回写：点任一节点即以其名入 hash（.hov 钉住监听另挂，同元素并存不悖） */
for (const n of shown) els.get(n).addEventListener("click", function () { setHash(n); });

const seek = document.createElement("div");
seek.id = "seek";
const panel = document.createElement("div");
panel.id = "seek-panel"; panel.hidden = true;
const list = document.createElement("div");
list.id = "seek-list"; list.hidden = true;
const input = document.createElement("input");
input.id = "seek-input"; input.type = "text";
input.placeholder = "姓名·稱號·生母·年號·年份"; input.autocomplete = "off";
input.setAttribute("aria-label", "尋人：按姓名、稱號、年號、生母或年份（如 1617年、壹陸壹柒年、前221年）檢索");
panel.appendChild(list); panel.appendChild(input);
const sealBtn = document.createElement("button");
sealBtn.id = "seek-seal"; sealBtn.type = "button";
sealBtn.title = "尋人（/）"; sealBtn.setAttribute("aria-label", "尋人");
sealBtn.setAttribute("aria-expanded", "false");
sealBtn.textContent = "尋";
seek.appendChild(panel); seek.appendChild(sealBtn);
document.body.appendChild(seek);
seek.addEventListener("click", function (ev) { ev.stopPropagation(); });  /* 不触「点空白解除钉住」 */

let sel = -1, hits = [], yearMode = false;
const RENDER_CAP = 100;   /* 渲染宽阀（2026-10-14 用户定谳）：命中数无限，逾阀只渲前百并明示，不默截 */
const renderList = function (keepSel) {
  list.textContent = "";
  if (!keepSel) sel = hits.length === 1 ? 0 : -1;   /* 独中即预选，Enter 径达 */
  if (!input.value.trim()) { list.hidden = true; return; }
  list.hidden = false;
  if (!hits.length) {
    const none = document.createElement("div");
    none.className = "none"; none.textContent = "無此人";
    list.appendChild(none);
    return;
  }
  hits.slice(0, RENDER_CAP).forEach(function (n, i) {
    const row = document.createElement("button");
    row.type = "button";
    if (i === sel) row.className = "sel";
    const sn = document.createElement("b");   /* b 为 700 权重：罕字取描边变体 */
    emitInkText(sn, n.name, true);
    row.appendChild(sn);
    const note = [];
    if (n.ti) note.push(n.ti + (n.nh ? " " + n.nh : ""));
    note.push("第" + hanNum(n.depth + 1) + "代");
    const noteEl = document.createElement("span");
    emitInkText(noteEl, "　" + note.join("　"), false);
    row.appendChild(noteEl);
    if (yearMode && n._ymatch) {              /* 年检索第二行：所中段起讫（甲案，复辟只显所中段） */
      const s = n._ymatch;
      const ystr = function (y) { return (y < 0 ? "前" : "") + hanDigits(Math.abs(y)); };
      const endY = (s.n !== null && s.u === "年") ? s.y + s.n : s.y;
      const yl = document.createElement("span");
      yl.className = "yline";
      emitInkText(yl, "在位" + ystr(s.y) + (endY !== s.y ? "—" + ystr(endY) : ""), false);
      row.appendChild(yl);
    }
    row.addEventListener("click", function () { choose(n); });
    list.appendChild(row);
  });
  if (hits.length > RENDER_CAP) {             /* 逾阀明示注脚（不默截） */
    const more = document.createElement("div");
    more.className = "more";
    emitInkText(more, "共命中 " + hits.length + " 人，已示前 " + RENDER_CAP + "——請添字縮檢", false);
    list.appendChild(more);
  }
  const selRow = list.children[sel];
  if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: "nearest" });
};
const closePanel = function () {
  panel.hidden = true;
  sealBtn.setAttribute("aria-expanded", "false");
};
/* 择条跳转即清零复未响应（2026-10-16 用户定谳：整条收起＋清空）：
   旧查询字与旧榜不留——重开朱印/「/」得空白输入条、无小笺；
   年深链载入预填同例（载入开榜照旧，点条跳转后一视同仁清空）。
   点结果条与输入框 Enter 择条同走此函，一并生效 */
const choose = function (n) {
  input.value = "";
  recalc();                       /* hits 归空、小笺隐、yearMode 复位（seekMatch 空串守卫，廉价） */
  closePanel(); locate(n);
};
const openPanel = function () {
  panel.hidden = false;
  sealBtn.setAttribute("aria-expanded", "true");
  input.focus();
  input.select();
};
sealBtn.addEventListener("click", function () {
  if (panel.hidden) openPanel(); else closePanel();
});
const recalc = function () {
  const Y = yearQuery(input.value);
  yearMode = Y !== null;
  hits = yearMode ? yearSearch(Y) : seekMatch(input.value);
  renderList(false);
};
let seekTimer = 0;   /* 轻防抖（2026-10-14）：命中数既无限，逐键全量重建小笺恐顿——停顿百毫秒方建 */
input.addEventListener("input", function () {
  clearTimeout(seekTimer);
  seekTimer = setTimeout(recalc, 100);
});
input.addEventListener("keydown", function (ev) {
  if (ev.key === "Escape") { closePanel(); input.blur(); return; }
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === "Enter") {
    if (seekTimer) { clearTimeout(seekTimer); seekTimer = 0; recalc(); }   /* 防抖未落而键已至：即时冲洗，Enter 不落空 */
  }
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    if (!hits.length) return;
    ev.preventDefault();
    const span = Math.min(hits.length, RENDER_CAP);   /* 择条只在已渲染条内环行 */
    sel = ((sel < 0 ? 0 : sel) + (ev.key === "ArrowDown" ? 1 : -1) + span) % span;
    renderList(true);
    return;
  }
  if (ev.key === "Enter") {
    const n = hits[sel >= 0 ? sel : 0];
    if (n) choose(n);
  }
});
document.addEventListener("keydown", function (ev) {
  if (ev.key === "/" && !/^(INPUT|TEXTAREA)$/.test(ev.target.tagName || "")) {
    ev.preventDefault();
    openPanel();
  }
});

/* 载入定位（2026-10-15 起年深链与人名深链并收）：
   · #年=值 —— 「#年=1449」「#年=前221」「#年=公元前221」，值部同寻人年
     检索口径（阿拉伯或汉字数字，径过 yearQuery，尾「年」字可省）；
     定位＝段起始年升序之首条（与年检索结果同序），同年命中尽入候选
     小笺：面板开着、输入框预填年串、不夺焦点，其余其人指点即达；
     定位后地址栏回写其人名（同 #别名 回写主名之例）；无中静默归主干。
   · #人名 —— 开页即定位加亮（字体就绪后复定位一次），如旧。
   · 皆无 —— 居中对准主干（始祖居树宽正中，题识在右可滚见）。 */
const hashRaw = decodeURIComponent((location.hash || "").slice(1));
const yearHash = hashRaw.match(/^年=(.+)$/);
let loadHit = null;
if (yearHash) {
  const v = yearHash[1].trim();
  const Y = yearQuery(/年$/.test(v) ? v : v + "年");
  if (Y !== null) {
    const yhits = yearSearch(Y);
    if (yhits.length) {
      loadHit = yhits[0];
      input.value = (Y < 0 ? "前" : "") + Math.abs(Y) + "年";
      recalc();                       /* yearMode 命中小笺（含在位起讫第二行） */
      panel.hidden = false;           /* 面板开着示年榜（openPanel 不取——不夺焦点） */
      sealBtn.setAttribute("aria-expanded", "true");
    }
  }
} else if (hashRaw) {
  const hashFold = fold(hashRaw);
  loadHit = seekMatch(hashRaw).filter(function (n) { return n._fname === hashFold || n._falias.includes(hashFold); })[0] || null;
}
if (loadHit) {
  locate(loadHit);
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(function () { locate(loadHit); });   /* 字体就绪度量或移，复定位 */
} else {
  main.scrollLeft = Math.max(0, ORIGIN + dRoot.w / 2 - main.clientWidth / 2);
}

/* ── 触屏缩放（方案A，2026-10-14；渐进增强：仅 (pointer:coarse) 端启用） ──
   手机上 viewport width=device-width 把页面级捏合钳在 scale=1，缩不了；
   而 main 横滚裁切长卷，纵能放大页面也见不到更多列——故令 #board 自身
   为缩放面：board.style.zoom 行内直写（与根 zoom 相乘；窄屏断点根归 1，
   即所见倍率）。双指捏合按比例调焦，锚点＝捏合中点下 board 坐标不动
   （touch-action: pan-x pan-y 保单指原生平移，双指事件可取消、归 JS）；
   左下角工具条：全卷（整幅宽纳入视口）／−／读数（点按＝复位 100%）／＋。
   坐标系换算：clientX 为视观 px，scrollLeft/offset 为布局 px，两者差一
   根 zoom 因子（桌面 0.5／窄屏 1），rootZoom() 取之换算。
   引擎安全性：布局全用 px 常量＋offset 自洽系（文件头注），board zoom
   只改视观比例、不入算；placeSeal 以 rect/layout 比值自适应任意 zoom；
   已知边界：locate() 深链定位未乘 board zoom 因子，缩放态下寻人定位或
   偏（复位后即正），v1 接受。
   无损回退：细指针端立即 return——不挂 DOM、不写行内样式，桌面零变化；
   触屏端一切效果皆行内 style.zoom ＋动态挂载节点，删本节（git revert
   本提交）即还原，CSS 侧 #zoom-bar 规则空转无害 */
if (window.matchMedia && matchMedia("(pointer: coarse)").matches) {

  const ZMIN = 0.005, ZMAX = 2, STEP = 1.3;
  let bz = 1;                        /* board zoom 现行倍率（1＝原寸，行内样式为空） */
  const rootZoom = function () {     /* 根 zoom：视观 px → 布局 px 换算因子 */
    const rz = parseFloat(getComputedStyle(document.documentElement).zoom);
    return (rz > 0) ? rz : 1;
  };

  const bar = document.createElement("div");
  bar.id = "zoom-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "长卷缩放");
  const mkBtn = function (id, text, label) {
    const b = document.createElement("button");
    b.type = "button"; b.id = id; b.textContent = text;
    b.title = label; b.setAttribute("aria-label", label);
    bar.appendChild(b);
    return b;
  };
  const fitBtn = mkBtn("zoom-fit", "全卷", "全卷：整幅长卷缩纳入屏");
  const outBtn = mkBtn("zoom-out", "−", "缩小");
  const rstBtn = mkBtn("zoom-readout", "100%", "复位：回到原寸（100%）");
  const inBtn  = mkBtn("zoom-in", "＋", "放大");
  document.body.appendChild(bar);

  const setZoom = function (nz, anchorClientX) {
    nz = Math.min(ZMAX, Math.max(ZMIN, nz));
    if (Math.abs(nz - bz) < 1e-4) return;
    const rz = rootZoom();
    const rect = main.getBoundingClientRect();
    /* 锚点：视观 clientX → main 内布局偏移 lo（缺省＝视口中心） */
    const lo = anchorClientX == null
      ? main.clientWidth / 2
      : (anchorClientX - rect.left) / rz;
    const bp = (main.scrollLeft + lo) / bz;     /* 锚点下的 board 坐标 */
    bz = nz;
    if (bz === 1) board.style.zoom = "";        /* 复位＝清空行内，还原原样 */
    else board.style.zoom = String(bz);
    main.scrollLeft = Math.max(0, bp * bz - lo);  /* 锚点复归指下 */
    rstBtn.textContent = Math.round(bz * 100) + "%";
  };

  /* 双指捏合：起手记基距/基倍率/锚点，行中按距比调焦 */
  let pinching = false, baseDist = 0, baseZ = 1, anchorVis = 0;
  const tdist = function (t) {
    return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  };
  main.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      pinching = true;
      baseDist = tdist(e.touches) || 1;
      baseZ = bz;
      anchorVis = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    }
  }, { passive: true });
  main.addEventListener("touchmove", function (e) {
    if (!pinching || e.touches.length !== 2) return;
    e.preventDefault();               /* touch-action 已豁免双指，事件可取消 */
    setZoom(baseZ * tdist(e.touches) / baseDist, anchorVis);
  }, { passive: false });
  const pinchEnd = function (e) { if (e.touches.length < 2) pinching = false; };
  main.addEventListener("touchend", pinchEnd, { passive: true });
  main.addEventListener("touchcancel", pinchEnd, { passive: true });

  fitBtn.addEventListener("click", function () { setZoom(main.clientWidth / boardW, null); });
  outBtn.addEventListener("click", function () { setZoom(bz / STEP, null); });
  inBtn.addEventListener("click",  function () { setZoom(bz * STEP, null); });
  rstBtn.addEventListener("click", function () { setZoom(1, null); });
  bar.addEventListener("click", function (ev) { ev.stopPropagation(); });  /* 不触「点空白解除钉住」 */
}

})();
