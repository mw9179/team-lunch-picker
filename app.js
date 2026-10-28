import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $=id=>document.getElementById(id);
const config=window.LUNCH_CONFIG||{};
const ready=config.SUPABASE_URL?.startsWith('https://')&&!config.SUPABASE_URL.includes('YOUR_PROJECT')&&config.SUPABASE_PUBLISHABLE_KEY&&!config.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
let db,user,restaurants=[],votes=[],draws=[],filter='전체',busy=false,drawPool='team';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const createdToday=r=>r.created_at&&new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.created_at))===day();
function poolRestaurants(){return drawPool==='new'?restaurants.filter(createdToday):restaurants;}
function updatePool(){document.querySelectorAll('[data-pool]').forEach(b=>b.classList.toggle('active',b.dataset.pool===drawPool));text('poolInfo',drawPool==='new'?`오늘 새로 추가된 식당 ${poolRestaurants().length}곳에서 추첨합니다. 네이버 검색 → 팀 목록 등록 후 이용하세요.`:`직원들이 등록한 전체 식당 ${restaurants.length}곳에서 추첨합니다.`);}
document.querySelectorAll('[data-pool]').forEach(b=>b.addEventListener('click',()=>{drawPool=b.dataset.pool;updatePool()}));
const text=(id,s)=>$(id).textContent=s;
const notify=(s)=>text('message',s);
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
function optionButton(label,handler,cls=''){const b=el('button',cls,label);b.type='button';b.addEventListener('click',handler);return b}
function render(){
 const today=day(),todayVotes=votes.filter(v=>v.vote_day===today);
 const counts=new Map();todayVotes.forEach(v=>counts.set(v.restaurant_id,(counts.get(v.restaurant_id)||0)+1));
 const mine=todayVotes.find(v=>v.voter_id===user?.id);
 text('restaurantCount',`${restaurants.length}곳`);text('voteCount',`${todayVotes.length}명 참여`);updatePool();
 const cats=[...new Set(restaurants.map(r=>r.category))].sort((a,b)=>a.localeCompare(b,'ko'));
 $('categories').replaceChildren(...cats.map(c=>{const n=el('option');n.value=c;return n}));
 const vl=$('voteList');vl.replaceChildren();
 [...restaurants].sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||a.name.localeCompare(b.name,'ko')).forEach(r=>{
  const item=el('div','item'),description=el('div'),button=optionButton(mine?.restaurant_id===r.id?'✓ 내 투표':`투표 ${counts.get(r.id)||0}`,()=>vote(r.id),mine?.restaurant_id===r.id?'selected':'');
  description.append(el('strong','',r.name),el('small','',`${r.category} · ${counts.get(r.id)||0}표`));item.append(description,button);vl.append(item);
 });
 if(!restaurants.length)vl.append(el('p','muted','식당 목록이 비어 있어요. 식당을 추가해 주세요.'));
 const filters=$('filters');filters.replaceChildren();['전체',...cats].forEach(c=>filters.append(optionButton(c,()=>{filter=c;render()},c===filter?'active':'')));
 const rl=$('restaurantList');rl.replaceChildren();restaurants.filter(r=>filter==='전체'||filter===r.category).forEach(r=>{
  const item=el('div','item'),description=el('div');description.append(el('strong','',r.name),el('small','',r.category));
  item.append(description,optionButton('삭제',()=>removeRestaurant(r),'remove'));rl.append(item);
 });
 const result=draws.filter(d=>d.draw_day===today).sort((a,b)=>b.id-a.id)[0];
 if(result){const r=restaurants.find(r=>r.id===result.restaurant_id);text('winner',r?.name||'삭제된 식당');text('winnerDetail',r?`🎉 ${r.category} · 오늘의 공동 룰렛 결과`:'이 식당은 목록에서 삭제됐어요.');}
 else{text('winner','오늘의 메뉴를 뽑아볼까요?');text('winnerDetail','룰렛을 누르면 결과가 팀원 모두에게 보여요.');}
}
async function refresh(){if(!db)return;const results=await Promise.all([
 db.from('restaurants').select('*').order('id'),db.from('votes').select('*').eq('vote_day',day()),db.from('draws').select('*').eq('draw_day',day()).order('id',{ascending:false}).limit(1)]);
 const error=results.find(r=>r.error)?.error;if(error){notify('데이터 읽기 실패: '+error.message);return;}
 [restaurants,votes,draws]=results.map(r=>r.data||[]);render();if(naverResults.length)renderNaver();}
async function vote(id){if(!db||!user)return;const mine=votes.find(v=>v.voter_id===user.id&&v.vote_day===day());let res;
 if(mine?.restaurant_id===id){res=await db.from('votes').delete().eq('id',mine.id).eq('voter_id',user.id)}
 else if(mine){res=await db.from('votes').update({restaurant_id:id}).eq('id',mine.id).eq('voter_id',user.id)}
 else{res=await db.from('votes').insert({restaurant_id:id,voter_id:user.id,vote_day:day()});}
 if(res.error)notify('투표 실패: '+res.error.message);else notify('투표가 반영됐어요.');await refresh();}
async function removeRestaurant(r){if(!confirm(`“${r.name}”을(를) 모두의 목록에서 삭제할까요? 관련 투표도 삭제됩니다.`))return;const {error}=await db.from('restaurants').delete().eq('id',r.id);if(error)notify(error.message);else{notify('식당을 삭제했어요.');await refresh();}}
$('addForm').addEventListener('submit',async e=>{e.preventDefault();if(!db)return;const category=$('categoryInput').value.trim(),name=$('restaurantInput').value.trim();if(!category||!name)return;
 const {error}=await db.from('restaurants').insert({category,name});if(error)notify(error.code==='23505'?'이미 등록된 이름이에요.':error.message);else{$('restaurantInput').value='';notify('새 식당이 팀 전체에 추가됐어요.');await refresh();}});
$('draw').addEventListener('click',async()=>{if(busy||!db)return;if(!poolRestaurants().length){notify(drawPool==='new'?'오늘 새로 등록된 식당이 없어요. 학동역 검색에서 식당을 추가해주세요.':'식당을 먼저 추가해주세요.');return;}
 busy=true;$('draw').disabled=true;$('wheel').classList.remove('spin');void $('wheel').offsetWidth;$('wheel').classList.add('spin');
 let pool=poolRestaurants();const mode=$('mode').value;if(mode==='votes'){const votedIds=new Set(votes.filter(v=>v.vote_day===day()).map(v=>v.restaurant_id));pool=pool.filter(r=>votedIds.has(r.id));if(!pool.length){notify('아직 오늘 투표한 식당이 없어요.');busy=false;$('draw').disabled=false;return;}}
 if(mode==='category'){const cats=[...new Set(pool.map(r=>r.category))],cat=cats[Math.floor(Math.random()*cats.length)];pool=pool.filter(r=>r.category===cat);}
 const selected=pool[Math.floor(Math.random()*pool.length)];const {error}=await db.from('draws').insert({restaurant_id:selected.id,draw_day:day()});if(error)notify('뽑기 저장 실패: '+error.message);else{notify('결과를 모든 팀원에게 공유했어요!');await refresh();}setTimeout(()=>{busy=false;$('draw').disabled=false;$('wheel').classList.remove('spin')},1050);
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('voteTab').hidden=button.dataset.tab!=='vote';$('restaurantsTab').hidden=button.dataset.tab!=='restaurants';}));
async function start(){if(!ready){$('setup').hidden=false;text('connection','⚠ 설정 필요');$('draw').disabled=true;return;}
 try{db=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY);let {data:{session}}=await db.auth.getSession();if(!session){const {data,error}=await db.auth.signInAnonymously();if(error)throw error;session=data.session;}user=session.user;
 text('connection','● 실시간 연결');$('connection').classList.add('live');await refresh();
 db.channel('team-lunch-changes').on('postgres_changes',{event:'*',schema:'public',table:'restaurants'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'votes'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'draws'},refresh).subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){text('connection','● 재연결 중');$('connection').classList.remove('live')}if(status==='SUBSCRIBED'){text('connection','● 실시간 연결');$('connection').classList.add('live');refresh()}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 }catch(err){text('connection','● 연결 실패');notify(`연결 실패: ${err.message}. Supabase 익명 로그인 설정을 확인해 주세요.`);}}
start();

// NAVER API HUB search + bulk insert. Search response is transient in browser memory only.
const NAVER_CATEGORIES=['한식','중식','일식','양식','분식','베트남식','기타'];
let enabledNaver=new Set(NAVER_CATEGORIES),naverResults=[],naverSelected=new Set(),naverBusy=false;
function normalizeName(s){return String(s||'').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\u00b7\-()]/g,'');}
function existingNaver(r){return restaurants.some(v=>normalizeName(v.name)===normalizeName(r.name));}
function updateNaverButtons(){
 const allowed=$('naverRights').checked;const selectable=naverResults.filter(r=>!existingNaver(r));
 $('naverSelectedCount').textContent=`${[...naverSelected].filter(i=>naverResults[i]&&!existingNaver(naverResults[i])).length}개 선택`;
 $('naverImport').disabled=!db||!user||naverBusy||!allowed||![...naverSelected].some(i=>naverResults[i]&&!existingNaver(naverResults[i]));
 $('naverSelectAll').checked=selectable.length>0&&naverResults.every((r,i)=>existingNaver(r)||naverSelected.has(i));
}
function renderNaver(){
 const holder=$('naverResults');holder.replaceChildren();
 naverResults.forEach((r,i)=>{const duplicate=existingNaver(r),line=el('div','item');const label=el('label','import-row'),cb=document.createElement('input');cb.type='checkbox';cb.checked=naverSelected.has(i);cb.disabled=duplicate;cb.addEventListener('change',()=>{if(cb.checked)naverSelected.add(i);else naverSelected.delete(i);updateNaverButtons()});const desc=el('span');desc.append(el('strong','',r.name),el('small','',`${r.category} · ${r.naverCategory||'음식점'} · 약 ${r.distance}m`),el('small','',r.address||'주소 없음'));label.append(cb,desc);const a=el('a','', '네이버에서 보기');a.href=r.sourceLink;a.target='_blank';a.rel='noopener noreferrer';line.append(label,a);if(duplicate){line.classList.add('muted');desc.append(el('small','','이미 팀 목록에 등록됨'));}holder.append(line)});
 if(!naverResults.length)holder.append(el('p','muted','검색 결과가 없습니다. 선택한 카테고리나 네이버 API 설정을 확인해 주세요.'));
 updateNaverButtons();
}
function renderNaverCategories(){const box=$('naverCategories');box.replaceChildren(...NAVER_CATEGORIES.map(c=>optionButton(c,()=>{if(enabledNaver.has(c))enabledNaver.delete(c);else enabledNaver.add(c);renderNaverCategories()},enabledNaver.has(c)?'active':'')));}
renderNaverCategories();
$('naverSelectAll').addEventListener('change',e=>{naverResults.forEach((r,i)=>{if(!existingNaver(r)){if(e.target.checked)naverSelected.add(i);else naverSelected.delete(i)}});renderNaver()});
$('naverRights').addEventListener('change',updateNaverButtons);
$('naverSearch').addEventListener('click',async()=>{
 if(naverBusy||!enabledNaver.size)return;
 naverBusy=true;naverSelected.clear();naverResults=[];$('naverSearch').disabled=true;
 text('naverStatus','학동역 주변 식당 검색 중…');
 try{const params=new URLSearchParams();NAVER_CATEGORIES.filter(c=>enabledNaver.has(c)).forEach(c=>params.append('category',c));const response=await fetch('/api/naver-restaurants?'+params.toString(),{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'네이버 검색 요청 실패');naverResults=data.items||[];text('naverStatus',`${naverResults.length}곳 검색됨 · ${data.queries}개 검색어 조회${data.failedQueries?` · ${data.failedQueries}개 요청 실패`:''}`);}
 catch(e){text('naverStatus','검색 실패: '+e.message)}finally{naverBusy=false;$('naverSearch').disabled=false;renderNaver()}
});
$('naverImport').addEventListener('click',async()=>{
 if(!db||!user||naverBusy||!$('naverRights').checked)return;
 const selected=[...naverSelected].map(i=>naverResults[i]).filter(r=>r&&!existingNaver(r));
 if(!selected.length)return;
 if(!confirm(`${selected.length}개 식당명을 팀 공용 데이터베이스에 저장할까요? 네이버 검색 결과의 저장 이용 허용 범위를 확인한 경우에만 진행하세요.`))return;
 naverBusy=true;updateNaverButtons();
 try{const byName=new Map();selected.forEach(r=>{const name=normalizeName(r.name);if(!byName.has(name))byName.set(name,{name:r.name,category:r.category})});
  const rows=[...byName.values()];const {data,error}=await db.from('restaurants').upsert(rows,{onConflict:'name',ignoreDuplicates:true}).select('name');if(error)throw error;
  const added=data?.length||0;text('naverStatus',`${added}개 새 식당 등록 완료! (${rows.length-added}개 이름 중복으로 제외)`);naverSelected.clear();await refresh();renderNaver();}
 catch(e){text('naverStatus','등록 실패: '+e.message)}finally{naverBusy=false;updateNaverButtons()}
});
