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
 * 数据块 v4 格式：
 *   缩进（Tab 或 2 空格）= 下一辈
 *   每行：名字|称号 年号|母亲|即位年|在位年   （后诸段均可留空或整段省略，
 *     只有名字一行亦合法；各栏空位自动向内递补）
 *     年号接写称号后、空格分隔，显示为称号栏内朱色次run；
 *     位次（前缀＋第N位＋位次用字）与排行「皇長子」两栏自动生成、无需书写；
 *     即位年/在位年仅君主行书于行尾（复辟按段顺成对 |1435|14|1457|8）：
 *     即位栏串各段年（每段自足「前＋数＋年」、段间「与」接）结「开国/即位」
 *     （各名单首条＝开国；@found-skip 之前缀名单首条亦结「即位」），
 *     在位栏合各段年大写；负年冠「前」（公元前）；
 *     在位年得带单位缀（月/天，缺省即年，如 |1月、|60天）：年月并月
 *     （1年=12月）、天自为计——天不升格为月，大单位在场时天径弃；
 *     纯年显年、满一年显年（弃月弃天）、满一月显月（弃天）、纯天显天，
 *     数皆大写；
 *     排行栏得附序齒：行内独立段「序齒N」（N 阿拉伯数字，简繁均认；
 *     位置无关——习惯收行尾，年对之后亦合法；一行至多一个），解析时
 *     先摘（不占字段位、不乱年对奇偶），显示为排行后空一字接排
 *     「序齒N子」（序數同齿序用字：1 長、2 次、叁起大写；同墨黑）；
 *     不写即无（殤夭未序齒者省）
 *   # 开头为说明行；@key=value 为页面设置：
 *     @title    卷端大题（如：大明帝系）
 *     @subtitle 卷端副题（可空）
 *     @juan     书口刻书题（默认 @title + 「卷一」）
 *     @leaf     书口叶码（默认「一」）
 *     @seal     右端题识下方印图径（省略即无；方印边长定值 100px、题识块下
 *               居中，恒坐题识文字实际底缘之下留距、不覆字）
 *     @throne   君位传承有序名单（一行一名单、可多行，按书写序；带序号键
 *             @throneN 已废——书写即整行静默弃置），条目＝名字|称号（与
 *             人物行严格匹配，重名赖称号甄别；裸名为旧式，歧义即告警跳过），
 *             值可带「前缀:」（如 明朝: / 晋国:），
 *             位次按各名单独立编序（复辟重入列不占号）
 *     @rank-word  位次用字（缺省「皇帝」）；值非「皇帝」时排行不冠皇字，
 *             先秦壳可改 國君（位次即「晋国第壹位國君」）
 *
 * 图渲染数据块全部人物；名单成员（君）诸栏加粗（君主至七栏）、位次带前缀编号；
 * 连线仅父子血缘墨线（梳式正交），帝位传承不画线。
 * 本模块负责：墨洇滤镜 defs 注入、版框/书口/题识骨架搭建、
 * 字体逐字回落、竖排树布局、父子墨线、悬浮传位层、开卷主干居中。
 * @focus-skip=前缀,…  该前缀名单不入悬浮传位层（其成员悬停无反应）
 * @found-skip=前缀,…  该前缀名单不作独立开基（其首条即位栏亦结「即位」）
 * @throne-link=前缀A>前缀B,…  跨名单传位边：A 名单末位→B 名单首位，
 *             入悬浮传位层与顺接边同权（前缀未匹配告警跳过；位次编序不受影响）
 * ============================================================ */
"use strict";

(async function () {

/* 网络字体（文悦古体仿宋2 / 霞鹜文楷等宽 Light）就绪后再探测与渲染：
   canvas 比对依赖字形已加载 */
try {
  await Promise.all([
    document.fonts.load('64px "文悦古体仿宋2"', "朱元璋帝系世號母親卷一"),
    document.fonts.load('64px "LXGW WenKai Mono Light"', "朱元璋帝系世號母親卷一")
  ]);
} catch (e) { /* 加载失败则沿字体链回落，不阻塞渲染 */ }

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

/* ---------- 逐字回落探测：主字库文悦古体仿宋2 是否真含某字 ----------
   注意：该 OTF 的 cmap 对缺字也登记（字形槽指向 .notdef 空框），
   「单字库 vs 字库链」比对会误判为含字；改用空框指纹比对——
   某字在主字库下的渲染若与其 U+FFFF 空框渲染逐像素相同，即判缺字；
   cmap 全未登记的字（如 BMP 外）canvas 静默回落，再比回落链指纹补判。 */
const probeCv = document.createElement("canvas");
probeCv.width = probeCv.height = 96;
const probeCtx = probeCv.getContext("2d", { willReadFrequently: true });
const probeCache = new Map();
const MAIN_PROBE_FONT = '64px "文悦古体仿宋2"';   /* 与 lineage.css @font-face 同步 */
const FALLBACK_PROBE_FONT = '64px "LXGW WenKai Mono Light", "LXGW WenKai Mono", "LXGW WenKai", "霞鹜文楷等宽", "霞鹜文楷", "Songti SC", "STSong", "SimSun", "宋体", "NSimSun", "SimSun-ExtB", serif';   /* 与 .fbc 回落链同源 */
let notdefSig = null;

function probeSig(ch, font) {
  probeCtx.clearRect(0, 0, 96, 96);
  probeCtx.font = font;
  probeCtx.textAlign = "center";
  probeCtx.textBaseline = "middle";
  probeCtx.fillText(ch, 48, 48);
  return probeCtx.getImageData(0, 0, 96, 96).data;
}

function mainHas(ch) {
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

/* 将文本按字拆分：主字库缺字包 span.fbc 单独回落；
   perChar 时（竖排各栏）每字独立字盒 span.ch，隔离混排度量；
   badSet 时（加粗栏）命中合成加粗坏字清单者加 span.bb 仿粗（不回落） */
function setWrapped(el, text, perChar, badSet) {
  el.textContent = "";
  let run = "";
  const flush = function () {
    if (run) { el.appendChild(document.createTextNode(run)); run = ""; }
  };
  for (const ch of text) {
    const has = ch && mainHas(ch);
    const bad = has && badSet && badSet.has(ch);
    if (has && !bad && !perChar) { run += ch; continue; }
    flush();
    const s = document.createElement("span");
    s.className = perChar ? (has ? (bad ? "ch bb" : "ch") : "ch fbc") : (bad ? "bb" : "fbc");
    s.textContent = ch;
    el.appendChild(s);
  }
  flush();
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
/* ---------- 解析数据块（v4：名字|称号 年号|母亲；君主行尾可追加即位年/在位年成对） ----------
   年号接写称号后、空格分隔，显示为称号栏内朱色次run（不另占栏）；
   旧式第四栏单独在位年已废——今为行尾追加的即位年/在位年成对字段
   （复辟按段顺四数），派生即位/在位两栏 */
function parseData(text) {
  const meta = { title: "", subtitle: "", juan: "", leaf: "", seal: "", thrones: [] };
  const root = { name: "", ti: "", nh: "", mo: "", children: [] };
  const stack = [{ node: root, level: -1 }];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, "  ");
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t.startsWith("@")) {
      const m = t.match(/^@(title|subtitle|juan|leaf|seal|rank-word|focus-skip|found-skip|watermark|watermark-art|throne-link|throne)=(.*)$/);
      if (m) {
        if (m[1] === "throne") meta.thrones.push(m[2].trim());   /* 多名单按书写序；throne-link 不入名单 */
        else meta[m[1]] = m[2].trim();
      }
      continue;
    }
    const indent = line.match(/^ */)[0].length;
    const level = Math.floor(indent / 2);
    /* 序齒段（序齒N，简繁均认）先摘：位置无关（收行尾、年对之后亦合法），
       摘于字段定位与年对配对之前——不占栏位、不乱奇偶校验 */
    let xc = 0;
    const parts = t.split("|").filter(function (s) {
      const m = s.trim().match(/^序[齒齿](\d+)$/);
      if (!m) return true;
      if (xc) console.warn("[lineage] 序齒段一行只取其一，多余已弃：", t);
      else if (+m[1] < 1) console.warn("[lineage] 序齒须正整数，此段已弃：", t);
      else xc = +m[1];
      return false;
    });
    const tiRuns = (parts[1] || "").trim().split(/\s+/).filter(Boolean);
    const segs = [];                          /* 即位/在位段对（君主行尾追加，复辟按段顺） */
    for (let i = 3; i + 1 < parts.length; i += 2) {
      const ys = (parts[i] || "").trim(), ns = (parts[i + 1] || "").trim();
      const um = ns.match(/^(\d+)(月|天)?$/);   /* 在位年：裸数＝年，或带 月/天 缀 */
      if (!/^-?\d+$/.test(ys) || !um) {
        console.warn("[lineage] 行尾即位年/在位年须成对整数（负年表公元前；在位年得缀 月/天），此对已弃：", t);
        continue;
      }
      segs.push({ y: +ys, n: +um[1], u: um[2] || "年" });
    }
    if (parts.length > 3 && (parts.length - 3) % 2)
      console.warn("[lineage] 行尾追加字段奇数个（即位年/在位年应成对）：", t);
    const node = {
      name: parts[0].trim(),
      ti: tiRuns[0] || "",                    /* 称号（显示用，可空） */
      nh: tiRuns.slice(1).join(" "),          /* 年号（称号后空格接写，可空；称号栏内朱次run） */
      mo: (parts[2] || "").trim(),            /* 母亲（可空） */
      segs: segs,                             /* 即位/在位段对（可空；非君主不书） */
      xc: xc,                                 /* 序齒（数据行手书；0＝未书，不显示） */
      children: []
    };
    while (stack[stack.length - 1].level >= level) stack.pop();
    node.parent = stack[stack.length - 1].node;
    stack[stack.length - 1].node.children.push(node);
    stack.push({ node, level });
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
const parsed = parseData(document.getElementById("lineage-data").textContent);
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
   母亲·即位·在位右；即位/在位仅君主行尾书年者有）；测量格高 */
const nodes = [];
collect(root, 0, nodes);

/* 君位传承名单（@throne，一行一名单、可多行，按书写序；@throneN 已废、
   书写即整行静默弃置；值可带「前缀:」如 明朝: / 晋国:）：
   条目＝名字|称号，与人物行严格匹配（称号＝称号栏首节，年号不计入），
   重名者赖称号甄别（如 姬某|晉殤叔 只命中殤叔、不涉其余「姬某」）；
   裸名条目为旧式，仅全树名字唯一时可用；歧义（多命中）与未匹配条目
   console.warn 后跳过、不占号。成员诸栏加粗；各名单独立编序
   （位次＝首现序数，复辟重入列不占号）；名单不画线（君位传承不画线，
   连线仅父子血缘墨线） */
const groups = (meta.thrones || []).map(function (val) {
  const mm = val.match(/^(.+?)[:：](.*)$/);
  return {
    prefix: mm ? mm[1].trim() : "",
    entries: (mm ? mm[2] : val).split(/[,,]/).map(function (s) { return s.trim(); })
      .filter(Boolean).map(function (s) {
        const i = s.indexOf("|");
        return i < 0 ? { name: s, ti: null }
                     : { name: s.slice(0, i).trim(), ti: s.slice(i + 1).trim() };
      })
  };
});
/* 位次用字：@rank-word（缺省「皇帝」）；非「皇帝」时排行不冠皇字（先秦径称長子） */
const RANK_WORD = meta["rank-word"] || "皇帝";
const PRINCE = RANK_WORD === "皇帝" ? "皇" : "";
/* 名字/名字+称号 → 节点索引：名单条目解析为节点引用，
   此后加粗、位次、排行冠字、浮层一律以节点为键，重名歧义根除 */
const byKey = new Map();       /* 「名\0号」→ [节点] */
const byNameAll = new Map();   /* 「名」→ [节点]（裸名旧式条目用） */
for (const n of nodes) {
  for (const pair of [[byKey, n.name + "\u0000" + n.ti], [byNameAll, n.name]]) {
    if (!pair[0].has(pair[1])) pair[0].set(pair[1], []);
    pair[0].get(pair[1]).push(n);
  }
}
function resolveEntry(g, e) {
  const key = e.ti === null ? e.name : e.name + "\u0000" + e.ti;
  const cands = (e.ti === null ? byNameAll : byKey).get(key) || [];
  if (cands.length === 1) return cands[0];
  console.warn("[lineage] @throne 条目" + (cands.length ? "歧义（命中 " + cands.length + " 人）" : "未匹配") +
               "，已跳过：", g.prefix + ":" + e.name + (e.ti === null ? "" : "|" + e.ti));
  return null;
}
const throneSet = new Set();       /* 名单成员节点 */
const throneTitle = new Map();     /* 节点 → 「前缀＋第N位＋位次用字」 */
groups.forEach(function (g) {
  let ord = 0;
  g.resolved = g.entries.map(function (e) {
    const n = resolveEntry(g, e);
    if (n) {
      throneSet.add(n);
      if (!throneTitle.has(n)) {   /* 复辟重入不占号：仅首现授位次时递增 */
        throneTitle.set(n, g.prefix + "第" + hanNum(++ord) + "位" + RANK_WORD);
      }
    }
    return n;
  });
});
/* 每名单首条目＝该政权开基（即位栏结「开国」）；@found-skip 之前缀名单除外
   ——其首条亦结「即位」（位次/加粗/浮层均不受影响） */
const foundSkip = new Set((meta["found-skip"] || "").split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean));
const firstOfList = new Set();
groups.forEach(function (g) { if (g.resolved[0] && !foundSkip.has(g.prefix)) firstOfList.add(g.resolved[0]); });

/* 悬浮传位层：overlay 边＝名单顺接相邻对（@focus-skip 之前缀名单除外）
   ＋@throne-link 跨名单接续边；hover 或点击钉住名单成员时浮层：
   朱线连以该节点为端点的顺接边，无关者半透明，墨线退为背景 */
const skip = new Set((meta["focus-skip"] || "").split(/[,,]/).map(function (s) { return s.trim(); }).filter(Boolean));
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
  d.appendChild(name);
  let pos = null, ti = null, rk = null, mo = null;
  if (throneTitle.has(n)) {
    pos = document.createElement("div"); pos.className = "pos";
    setWrapped(pos, throneTitle.get(n), true, bad);
    d.appendChild(pos);
  }
  if (n.ti || n.nh) {
    ti = document.createElement("div"); ti.className = "ti";
    setWrapped(ti, n.ti, true, bad);
    if (n.nh) {   /* 年号＝称号栏内朱色次run：空一字距后接排本栏下方，不另占栏 */
      const gap = document.createElement("span");
      gap.className = "ch"; gap.textContent = " ";
      const nh = document.createElement("span"); nh.className = "yr";
      setWrapped(nh, n.nh, true, bad);
      ti.appendChild(gap); ti.appendChild(nh);
    }
    d.appendChild(ti);
  }
  if (n.parent && n.parent.name) {   /* 排行（左最外·黑）：父下齿序自动——長子/次子/叁子…（叁起大写），父在任一 @throne 名单者冠皇字（仅 @rank-word 为「皇帝」时；先秦用字则径称長子）；根无父不栏 */
    const idx = n.parent.children.indexOf(n) + 1;
    rk = document.createElement("div"); rk.className = "rk";
    setWrapped(rk, (throneSet.has(n.parent) ? PRINCE : "") +
                   (idx === 1 ? "長" : idx === 2 ? "次" : hanNum(idx)) + "子", true, bad);
    if (n.xc) {   /* 序齒（数据行手书）：排行后空一字接排「序齒N子」，
                     同墨黑（不似年号着朱）、同随栏加粗 */
      const gap = document.createElement("span");
      gap.className = "ch"; gap.textContent = " ";
      const xcs = document.createElement("span");
      setWrapped(xcs, "序齒" + (n.xc === 1 ? "長" : n.xc === 2 ? "次" : hanNum(n.xc)) + "子", true, bad);   /* 同齿序用字：長/次/叁起大写 */
      rk.appendChild(gap); rk.appendChild(xcs);
    }
    d.appendChild(rk);
  }
  if (n.mo) { mo = document.createElement("div"); mo.className = "mo"; setWrapped(mo, n.mo, true, bad); d.appendChild(mo); }
  let ji = null, zai = null;
  if (n.segs && n.segs.length) {   /* 即位/在位（君主行尾追加）：即位栏串段年「与」接
      结开国/即位；在位栏年月并月（1年=12月）、天自为计——天不升格为月，
      数皆大写：纯年显年、满一年显年（弃月弃天）、满一月显月（弃天）、
      纯天显天；复辟段数与年号 run 数互校 */
    ji = document.createElement("div"); ji.className = "ji";
    setWrapped(ji, n.segs.map(function (s) {
      return (s.y < 0 ? "前" : "") + hanDigits(Math.abs(s.y)) + "年";
    }).join("与") +   /* 段年自足「前＋数＋年」、段间「与」顺接：壹肆叁伍年与壹肆伍柒年即位 */
       (firstOfList.has(n) ? "開国" : "即位"), true, bad);
    d.appendChild(ji);
    zai = document.createElement("div"); zai.className = "zai";
    let yrs = 0, mons = 0, dys = 0;
    n.segs.forEach(function (s) {
      if (s.u === "天") dys += s.n;
      else if (s.u === "月") mons += s.n;
      else yrs += s.n;
    });
    const mAll = yrs * 12 + mons;               /* 年月并月（1年=12月） */
    setWrapped(zai, "在位" + (!mons && !dys ? hanNum(yrs) + "年"    /* 纯年段：旧式原样（含零年） */
                            : mAll >= 12 ? hanNum(Math.floor(mAll / 12)) + "年"
                            : mAll >= 1 ? hanNum(mAll) + "月"      /* 有天段并存时弃天（栏简） */
                            : hanNum(dys) + "天"), true, bad);     /* 天恒显天，不升格为月 */
    d.appendChild(zai);
    const runs = n.nh ? n.nh.split(/\s+/).filter(Boolean).length : 0;
    if (n.segs.length > 1 && runs !== n.segs.length)
      console.warn("[lineage] " + n.name + "：即位段数 " + n.segs.length +
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
  n.nameH = name.offsetHeight;
  n.posH = pos ? pos.offsetHeight : 0;
  n.tiH = ti ? ti.offsetHeight : 0;
  n.moH = mo ? mo.offsetHeight : 0;
  n.rkH = rk ? rk.offsetHeight : 0;
  n.jiH = ji ? ji.offsetHeight : 0;
  n.zaiH = zai ? zai.offsetHeight : 0;
}

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
      候补逐段校验（穿障字格、与已画线相交或共线叠行均出局），洁净者中
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
    const y = nameMidY(a);
    const sx = b.nx > a.nx ? a.portR : a.portL;
    const yB = levelTop[b.depth] - LINE_GAP;
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
   目标行中线高横穿侧入）。当选以洁净候补中转折最少、末段行程
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
      if (r.e[0] === e[0] || r.e[1] === e[0] || r.e[0] === e[1] || r.e[1] === e[1])
        taken.push.apply(taken, r.segs);
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
  if (!focusInc.has(n)) continue;
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

board.style.width = boardW + "px";
board.style.height = boardH + "px";

/* 载入居中对准主干（始祖居树宽正中），题识在右可滚见 */
main.scrollLeft = Math.max(0, ORIGIN + dRoot.w / 2 - main.clientWidth / 2);

})();
