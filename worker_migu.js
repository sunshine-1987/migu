// 咪咕720p匿名取流 (develop202/migu_video 算法完整复现)
import crypto from 'node:crypto';
const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
function getDateString(d){ return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; }

// 正确的 getddCalcu720p: 首尾字符交错
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
  const resp = await fetch(baseURL + params, { headers });
  const respData = await resp.json();
  const url = respData.body && respData.body.urlInfo ? respData.body.urlInfo.url : null;
  if (!url) { console.log("无url. 响应:", JSON.stringify(respData).slice(0, 400)); return null; }
  console.log("RAWURL=" + url);
  const enc = getddCalcuURL720p(url, pid);
  console.log("ENCODED=" + enc);
  return enc;
}





// 修改为推送到你自己的 GitHub 仓库
async function pushToGitHub(ok) {
  // 这里请填入你的 GitHub 用户名和仓库名
  const GH_REPO = "sunshine-1987/migu"; 
  const GH_TOKEN = process.env.GH_TOKEN; // 从环境变量读取，安全！
  
  const lines = [];
  for (const [grp, list] of Object.entries(ok)) {
    lines.push(grp + ",#genre#");
    for (const c of list) lines.push(c.name + "," + c.url);
  }
  const content = lines.join("\n");
  if (!content) {
    console.log("抓取结果为空，跳过推送");
    return;
  }
  
  const apiUrl = `https://api.github.com/repos/${GH_REPO}/contents/live.txt`;
  const b64 = btoa(unescape(encodeURIComponent(content)));
  
  // 1. 获取原文件 SHA
  let sha = null;
  try {
    const resp = await fetch(apiUrl, {
      headers: { 'Authorization': `token ${GH_TOKEN}`, 'User-Agent': 'Cloudflare-Worker' }
    });
    if (resp.ok) {
      const r = await resp.json();
      sha = r.sha;
    }
  } catch(e) {}

  // 2. 提交更新
  const body = { 
    message: "Worker auto update " + new Date().toISOString(), 
    content: b64, 
    branch: "main" 
  };
  if (sha) body.sha = sha;
  
  const up = await fetch(apiUrl, {
    method: "PUT",
    headers: { 'Authorization': `token ${GH_TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'Cloudflare-Worker' },
    body: JSON.stringify(body)
  });
  
  if (up.ok) {
      console.log("GitHub push OK");
  } else {
      console.log("GitHub push fail: " + await up.text());
  }
}
};
