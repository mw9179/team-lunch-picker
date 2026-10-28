// Netlify Function. Never expose Naver credentials to the browser.
const CENTER = { lat: 37.5135731, lon: 127.0301492 }; // Hakdong Station exit 5 reference
const RADIUS_M = 2000;
const TERMS = {
  '한식': ['학동역 한식', '논현동 한식', '강남구청역 한식', '언주역 한식'],
  '중식': ['학동역 중식', '논현동 중국집', '강남구청역 중식', '언주역 짬뽕'],
  '일식': ['학동역 일식', '논현동 돈카츠', '강남구청역 초밥', '언주역 일본식'],
  '양식': ['학동역 양식', '논현동 파스타', '강남구청역 양식', '언주역 피자'],
  '분식': ['학동역 분식', '논현동 떡볶이', '강남구청역 김밥', '언주역 분식'],
  '베트남식': ['학동역 쌀국수', '논현동 베트남 음식', '강남구청역 쌀국수', '언주역 베트남 음식'],
  '기타': ['학동역 맛집', '논현동 식당', '강남구청역 맛집', '언주역 식당']
};
function dist(lat,lon){const r=Math.PI/180,R=6371000,dLat=(lat-CENTER.lat)*r,dLon=(lon-CENTER.lon)*r,a=Math.sin(dLat/2)**2+Math.cos(CENTER.lat*r)*Math.cos(lat*r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));}
function stripHTML(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers});
export default async (request)=>{
 if(request.method!=='GET')return json(405,{error:'GET 요청만 지원합니다.'});
 const url=new URL(request.url);const cats=url.searchParams.getAll('category');
 if(!cats.length||cats.length>7||cats.some(c=>!Object.hasOwn(TERMS,c)))return json(400,{error:'검색할 카테고리를 선택해 주세요.'});
 const id=process.env.NAVER_CLIENT_ID,secret=process.env.NAVER_CLIENT_SECRET;
 if(!id||!secret)return json(503,{error:'Netlify 환경변수 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 설정이 필요합니다.'});
 const allQueries=[...new Set(cats.flatMap(c=>TERMS[c].map(q=>({c,q})).map(v=>JSON.stringify(v))))].map(v=>JSON.parse(v));
 const results=[];let failures=0;
 // Naver API HUB (NCP); legacy developer API credentials are not interchangeable.
 for(let i=0;i<allQueries.length;i+=4){
  const batch=await Promise.all(allQueries.slice(i,i+4).map(async ({c,q})=>{
   const api=new URL('https://naverapihub.apigw.ntruss.com/search/v1/local');
   api.search=new URLSearchParams({query:q,display:'5',start:'1',sort:'comment',format:'json'}).toString();
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6500);
   try{const response=await fetch(api,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret},signal:controller.signal});
    if(!response.ok){failures++;return [];}const data=await response.json();return (data.items||[]).map(x=>({...x,searchCategory:c}));
   }catch{failures++;return [];}finally{clearTimeout(timeout);}
  }));results.push(...batch.flat());
 }
 const seen=new Set();const filtered=[];
 for(const x of results){
  const lon=Number(x.mapx)/1e7,lat=Number(x.mapy)/1e7;
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon<125||lon>130||lat<33||lat>39)continue;
  const distance=Math.round(dist(lat,lon));if(distance>RADIUS_M)continue;
  const name=stripHTML(x.title);if(!name)continue;
  const address=stripHTML(x.roadAddress||x.address);const key=`${name.replace(/\s/g,'').toLowerCase()}|${address.replace(/\s/g,'').toLowerCase()}`;
  if(seen.has(key))continue;seen.add(key);
  const sourceLink=(typeof x.link==='string'&&/^https:\/\//.test(x.link))?x.link:`https://map.naver.com/p/search/${encodeURIComponent(name+' '+address)}`;
  filtered.push({name,category:x.searchCategory,naverCategory:stripHTML(x.category),address,distance,sourceLink});
 }
 // Preserve ordering from the search API; filtering out results outside radius is necessary for this application's search scope.
 return json(200,{items:filtered,queries:allQueries.length,failedQueries:failures,radiusMeters:RADIUS_M,notice:'네이버 지역 검색 결과. 전체 식당 목록이 아니며 검색 결과 저장·재이용은 네이버 약관을 확인해야 합니다.'});
};
