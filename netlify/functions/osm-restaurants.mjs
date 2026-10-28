// Free, community-run OpenStreetMap Overpass API. No keys required.
// Keep requests modest and cache responses to respect shared infrastructure.
const CENTER={lat:37.5135731,lon:127.0301492}; // near Hakdong Station exit 5
const RADIUS=2000;
const CATEGORIES=['한식','중식','일식','양식','분식','베트남식','기타'];
const cache=new Map();
const response=(status,payload)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=300'}});
function distance(lat,lon){const rad=Math.PI/180,deltaLat=(lat-CENTER.lat)*rad,deltaLon=(lon-CENTER.lon)*rad;const a=Math.sin(deltaLat/2)**2+Math.cos(lat*rad)*Math.cos(CENTER.lat*rad)*Math.sin(deltaLon/2)**2;return Math.round(6371000*2*Math.asin(Math.min(1,Math.sqrt(a))));}
function classify(tags){const c=(tags.cuisine||'').toLowerCase(),name=(tags.name||tags['name:ko']||'').toLowerCase();const t=c+' '+name;
 if(/vietnam|pho|베트남|쌀국수|분짜/.test(t))return '베트남식';
 if(/korean|kimchi|bbq|bulgogi|bibimbap|한식|찌개|국밥|삼겹|족발|보쌈|곱창|순두부/.test(t))return '한식';
 if(/chinese|sichuan|중식|중국|짜장|짬뽕|마라|딤섬/.test(t))return '중식';
 if(/japanese|sushi|ramen|udon|soba|돈카츠|돈가스|스시|초밥|라멘|우동|소바|일식/.test(t))return '일식';
 if(/italian|pizza|burger|steak|pasta|western|french|american|양식|파스타|피자|버거/.test(t))return '양식';
 if(/noodle|snack|fast_food|kimbap|gimbap|tteokbokki|분식|김밥|떡볶이/.test(t)||tags.amenity==='fast_food')return '분식';
 return '기타';
}
const formatAddress=t=>[t['addr:city'],t['addr:district'],t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ')||t['addr:full']||'';
export default async request=>{
 if(request.method!=='GET')return response(405,{error:'GET 요청만 지원합니다.'});
 const params=new URL(request.url).searchParams,cats=params.getAll('category');
 if(!cats.length||cats.length>7||cats.some(c=>!CATEGORIES.includes(c)))return response(400,{error:'검색할 카테고리를 하나 이상 선택해 주세요.'});
 const chosen=[...new Set(cats)],key='hakdong-v1',cached=cache.get(key);let elements;
 if(cached&&Date.now()-cached.time<10*60*1000)elements=cached.elements;
 else{
  const q=`[out:json][timeout:20];nwr["amenity"~"^(restaurant|fast_food|food_court)$"]["name"](around:${RADIUS},${CENTER.lat},${CENTER.lon});out center tags;`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),24000);
  try{
   const r=await fetch('https://overpass.kumi.systems/api/interpreter',{method:'POST',body:new URLSearchParams({data:q}),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'TeamLunchPicker/1.0 (noncommercial small-group demo)'},signal:controller.signal});
   if(!r.ok){return response(503,{error:r.status===429?'무료 지도 서버가 사용량 제한 중입니다. 잠시 후 다시 검색해 주세요.':`무료 지도 서버 응답 오류 (${r.status}). 잠시 후 다시 시도해 주세요.`});}
   const data=await r.json();elements=data.elements||[];cache.set(key,{time:Date.now(),elements});
  }catch(e){return response(503,{error:e.name==='AbortError'?'무료 지도 검색이 지연됐습니다. 잠시 후 다시 시도해 주세요.':'무료 지도 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
  finally{clearTimeout(timer);}
 }
 const seen=new Set();const items=[];
 for(const e of elements){const t=e.tags||{},name=(t['name:ko']||t.name||'').trim();if(!name)continue;
  const lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  const meters=distance(lat,lon);if(meters>RADIUS)continue;
  const category=classify(t);if(!chosen.includes(category))continue;
  const k=name.toLocaleLowerCase('ko').replace(/\s/g,'')+'|'+Math.round(lat*10000)+'|'+Math.round(lon*10000);if(seen.has(k))continue;seen.add(k);
  items.push({name,category,osmCategory:[t.amenity,t.cuisine].filter(Boolean).join(' · '),address:formatAddress(t),distance:meters,sourceLink:`https://www.openstreetmap.org/${e.type}/${e.id}`});
 }
 items.sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name,'ko'));
 return response(200,{items:items.slice(0,300),total:items.length,radiusMeters:RADIUS,source:'© OpenStreetMap contributors',notice:'OpenStreetMap에 등록된 식당만 표시됩니다. 위치·영업 여부를 확인하고 등록하세요.'});
};
