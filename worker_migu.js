import crypto from 'node:crypto';
const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
function getDateString(d){ return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; }

function getddCalcu720p(puData, programId) {
  if (!puData) return "";
  const keys = "cdabyzwxkl";
  let dd = [];
  for (let i = 0; i < puData.length / 2; i++) {
    dd.push(puData[puData.length - i - 1]);
    dd.push(puData[i]);
    switch (i) {
      case 1: dd.push("v"); break;
      case 2: dd.push(keys[parseInt(getDateString(new Date())[2])]); break;
      case 3: dd.push(keys[programId[6]]); break;
      case 4: dd.push("a"); break;
    }
  }
  return dd.join("");
}
function getddCalcuURL720p(puDataURL, programId) {
  if (!puDataURL || !programId) return "";
  const puData = puDataURL.split("&puData=")[1];
  const ddCalcu = getddCalcu720p(puData, programId);
  return `${puDataURL}&ddCalcu=${ddCalcu}&sv=10004&ct=android`;
}

async function getAndroidURL720p(pid) {
  const timestramp = Date.now().toString();
  const appVersion = "2600034600";
  const appVer8 = appVersion.slice(0, 8);
  const salt = String(Math.floor(Math.random() * 1000000)).padStart(6, '0') + '25';
  const md = md5(timestramp + pid + appVer8);
  const suffix = "2cac4f2c6c3346a5b34e085725ef7e33migu" + salt.slice(0, 4);
  const sign = md5(md + suffix);
  const headers = {
    'AppVersion': appVersion,
    'TerminalId': 'android',
    'X-UP-CLIENT-CHANNEL-ID': appVersion + '-99000-201600010010028',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36'
  };
  const baseURL = "https://play.miguvideo.com/playurl/v1/play/playurl";
  const params = `?sign=${sign}&rateType=3&contId=${pid}&timestamp=${timestramp}&salt=${salt}&flvEnable=true&super4k=true&h265N=true&4kvivid=true&2Kvivid=true&vivid=2`;
  
  try {
    const resp = await fetch(baseURL + params, { headers });
    const respData = await resp.json();
    const url = respData.body && respData.body.urlInfo ? respData.body.urlInfo.url : null;
    if (!url) { console.log("无url. 响应:", JSON.stringify(respData).slice(0, 200)); return null; }
    return getddCalcuURL720p(url, pid);
  } catch (e) {
    console.log("获取URL异常:", e.message);
    return null;
  }
}

// 频道列表（原版的数据）
const CHANNELS = {
  "央视频道": [
    ["CCTV-1 综合", "608807420"], ["CCTV-2 财经", "631780532"], ["CCTV-3 综艺", "624878271"],
    ["CCTV-4 中文国际", "631780421"], ["CCTV-5 体育", "641886683"], ["CCTV-5+ 体育赛事", "641886773"],
    ["CCTV-6 电影", "624878396"], ["CCTV-7 国防军事", "673168121"], ["CCTV-8 电视剧", "624878356"],
    ["CCTV-9 纪录", "673168140"], ["CCTV-10 科教", "624878405"], ["CCTV-11 戏曲", "667987558"],
    ["CCTV-12 社会与法", "673168185"], ["CCTV-13 新闻", "608807423"], ["CCTV-14 少儿", "624878440"],
    ["CCTV-15 音乐", "673168223"], ["CCTV-17 农业农村", "673168256"], ["CCTV-4 欧洲", "608807419"],
    ["CCTV-4 美洲", "608807416"], ["老故事", "884121956"], ["发现之旅", "624878970"], ["中学生", "708869532"]
  ],
  "cgtn频道": [
    ["CGTN 英语", "609017205"], ["CGTN 纪录", "609006487"], ["CGTN 阿语", "609154345"],
    ["CGTN 西语", "609006450"], ["CGTN 法语", "609006476"], ["CGTN 俄语", "609006446"]
  ]
};

// 修改为推送到 GitHub
async function pushToGitHub(ok, env) {
  // ⚠️⚠️⚠️ 这里一定要改成你自己的 GitHub 用户名和仓库名！⚠️⚠️⚠️
  const GH_REPO = "你的GitHub用户名/migu"; 
  const GH_TOKEN = env.GH_TOKEN; // 从 Cloudflare 的环境变量中安全读取
  
  const lines = [];
  for (const [grp, list] of Object.entries(ok)) {
    lines.push(grp + ",#genre#");
    for (const c of list) lines.push(c.name + "," + c.url);
  }
  const content = lines.join("\n");
  
  if (!content || Object.keys(ok).length === 0) {
    console.log("抓取结果为空，拦截写入，防止文件被清空！");
    return;
  }
  
  const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/live.txt`;
  // Cloudflare Worker 中使用 Buffer 转换 Base64，避免中文乱码
  const b64 = Buffer.from(content).toString('base64');
  
  let sha = null;
  try {
    const resp = await fetch(apiUrl, {
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'User-Agent': 'Cloudflare-Worker' }
    });
    if (resp.ok) {
      const r = await resp.json();
      sha = r.sha;
    }
  } catch(e) { console.log("获取原文件SHA失败:", e.message); }

  const body = { 
    message: "Worker auto update " + new Date().toISOString(), 
    content: b64, 
    branch: "main" 
  };
  if (sha) body.sha = sha;
  
  try {
    const up = await fetch(apiUrl, {
      method: "PUT",
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Cloudflare-Worker' },
      body: JSON.stringify(body)
    });
    
    if (up.ok) {
      console.log("GitHub 推送成功！");
    } else {
      console.log("GitHub 推送失败: " + await up.text());
    }
  } catch (e) {
    console.log("GitHub 推送异常:", e.message);
  }
}

export default {
  async scheduled(event, env, ctx) {
    console.log("定时任务触发，开始抓取...");
    const ok = {};
    for (const [grp, list] of Object.entries(CHANNELS)) {
      ok[grp] = ok[grp] || [];
      for (const [name, pid] of list) {
        try {
          const url = await getAndroidURL720p(pid);
          if (url) { 
            ok[grp].push({ name, url }); 
            console.log("✅ " + name); 
          } else {
            console.log("❌ " + name); 
          }
        } catch(e) { console.log("❌ ERR " + name + " " + e.message); }
        await new Promise(r => setTimeout(r, 200)); // 稍微延时，防止被封
      }
    }
    await pushToGitHub(ok, env);
  },
  
  async fetch(request, env, ctx) {
    // 手动访问 URL 时触发
    console.log("手动触发，开始抓取...");
    const ok = {};
    for (const [grp, list] of Object.entries(CHANNELS)) {
      ok[grp] = ok[grp] || [];
      for (const [name, pid] of list) {
        try { 
          const url = await getAndroidURL720p(pid); 
          if (url) {
            ok[grp].push({name, url}); 
            console.log("✅ " + name);
          }
        } catch(e){}
        await new Promise(r => setTimeout(r, 200));
      }
    }
    await pushToGitHub(ok, env);
    return new Response("执行完毕，请去 GitHub 查看文件更新状态。", { status: 200 });
  }
};
