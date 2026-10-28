import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $=id=>document.getElementById(id);
const config=window.LUNCH_CONFIG||{};
const ready=config.SUPABASE_URL?.startsWith('https://')&&!config.SUPABASE_URL.includes('YOUR_PROJECT')&&config.SUPABASE_PUBLISHABLE_KEY&&!config.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
let db,user,restaurants=[],votes=[],draws=[],busy=false;
let summaryOpen=false, chosenCategories=new Set(),initializedCategories=false,openGroups=new Set();
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const text=(id,s)=>$(id).textContent=s;
const notify=(s)=>text('message',s);
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node};
function optionButton(label,handler,cls=''){const b=el('button',cls,label);b.type='button';b.addEventListener('click',handler);return b}
function render(){
 const today=day(),todayVotes=votes.filter(v=>v.vote_day===today);
 const counts=new Map();todayVotes.forEach(v=>counts.set(v.restaurant_id,(counts.get(v.restaurant_id)||0)+1));
 const mine=todayVotes.find(v=>v.voter_id===user?.id);
 text('restaurantCount',`${restaurants.length}곳`);text('toggleMenu',`📋 카테고리별 전체 식당 보기 ${summaryOpen?'▲':'▼'}`);text('voteCount',`${todayVotes.length}명 참여`);
 const cats=[...new Set(restaurants.map(r=>r.category))].sort((a,b)=>a.localeCompare(b,'ko'));
 if(!initializedCategories){chosenCategories=new Set(cats);initializedCategories=true;}
 // 새 카테고리도 기본 선택. 기존 사용자의 제외 설정은 유지.
 const prior=window._previousCategories||new Set(cats);
 cats.forEach(c=>{if(!prior.has(c))chosenCategories.add(c)});
 chosenCategories=new Set([...chosenCategories].filter(c=>cats.includes(c)));
 window._previousCategories=new Set(cats);
 $('categories').replaceChildren(...cats.map(c=>{const n=el('option');n.value=c;return n}));
 const drawCategories=$('drawCategories');drawCategories.replaceChildren();
 cats.forEach(c=>drawCategories.append(optionButton(`${chosenCategories.has(c)?'✓ ':''}${c}`,()=>{if(chosenCategories.has(c))chosenCategories.delete(c);else chosenCategories.add(c);render()},chosenCategories.has(c)?'active':'')));
 text('categoryPickCount',`${chosenCategories.size}/${cats.length}개 선택`);
 const vl=$('voteList');vl.replaceChildren();
 [...restaurants].sort((a,b)=>(counts.get(b.id)||0)-(counts.get(a.id)||0)||a.name.localeCompare(b.name,'ko')).forEach(r=>{
  const item=el('div','item'),description=el('div'),button=optionButton(mine?.restaurant_id===r.id?'✓ 내 투표':`투표 ${counts.get(r.id)||0}`,()=>vote(r.id),mine?.restaurant_id===r.id?'selected':'');
  description.append(el('strong','',r.name),el('small','',`${r.category} · ${counts.get(r.id)||0}표`));item.append(description,button);vl.append(item);
 });
 if(!restaurants.length)vl.append(el('p','muted','식당 목록이 비어 있어요. 식당을 추가해 주세요.'));
 const groups=$('restaurantGroups');groups.replaceChildren();
 cats.forEach(cat=>{
  const members=restaurants.filter(r=>r.category===cat);
  const detail=el('details','restaurant-group');detail.open=openGroups.has(cat);
  const heading=el('summary','group-heading',`${cat}  ·  ${members.length}곳`);
  heading.addEventListener('click',()=>{if(detail.open)openGroups.delete(cat);else openGroups.add(cat)});
  detail.append(heading);
  const content=el('div','group-list');members.forEach(r=>{
   const row=el('div','item'),description=el('div','restaurant-name');description.append(el('strong','',r.name));
   const actions=el('div','restaurant-actions');actions.append(optionButton('수정',()=>editRestaurant(r),'edit'),optionButton('식당 삭제',()=>removeRestaurant(r),'remove'));row.append(description,actions);content.append(row);
  }); detail.append(content);groups.append(detail);
 });
 groups.hidden=!summaryOpen;
 const result=draws.filter(d=>d.draw_day===today).sort((a,b)=>b.id-a.id)[0];
 if(result){const r=restaurants.find(r=>r.id===result.restaurant_id);text('winner',r?.name||'삭제된 식당');text('winnerDetail',r?`🎉 ${r.category} · 오늘의 공동 룰렛 결과`:'이 식당은 목록에서 삭제됐어요.');}
 else{text('winner','오늘의 메뉴를 뽑아볼까요?');text('winnerDetail','룰렛을 누르면 결과가 팀원 모두에게 보여요.');}
}
async function refresh(){if(!db)return;const results=await Promise.all([
 db.from('restaurants').select('*').order('id'),db.from('votes').select('*').eq('vote_day',day()),db.from('draws').select('*').eq('draw_day',day()).order('id',{ascending:false}).limit(1)]);
 const error=results.find(r=>r.error)?.error;if(error){notify('데이터 읽기 실패: '+error.message);return;}
 [restaurants,votes,draws]=results.map(r=>r.data||[]);render();}
async function vote(id){if(!db||!user)return;const mine=votes.find(v=>v.voter_id===user.id&&v.vote_day===day());let res;
 if(mine?.restaurant_id===id){res=await db.from('votes').delete().eq('id',mine.id).eq('voter_id',user.id)}
 else if(mine){res=await db.from('votes').update({restaurant_id:id}).eq('id',mine.id).eq('voter_id',user.id)}
 else{res=await db.from('votes').insert({restaurant_id:id,voter_id:user.id,vote_day:day()});}
 if(res.error)notify('투표 실패: '+res.error.message);else notify('투표가 반영됐어요.');await refresh();}
async function editRestaurant(r){
 if(!db||!user)return;
 const updated=prompt(`식당 이름 수정\n기존: ${r.name}`,r.name);
 if(updated===null)return;
 const name=updated.trim();
 if(!name){notify('식당 이름을 입력해 주세요.');return;}
 if(name.length>120){notify('식당 이름은 120자 이내로 입력해 주세요.');return;}
 if(name===r.name){notify('변경된 이름이 없어요.');return;}
 if(restaurants.some(x=>x.id!==r.id&&x.name.trim().toLocaleLowerCase('ko')===name.toLocaleLowerCase('ko'))){notify('이미 등록된 식당 이름이에요.');return;}
 const {error}=await db.from('restaurants').update({name}).eq('id',r.id);
 if(error){notify(error.code==='23505'?'이미 등록된 식당 이름이에요.':'이름 수정 실패: '+error.message);return;}
 notify(`식당 이름을 “${name}”으로 수정했어요.`);await refresh();
}
async function removeRestaurant(r){if(!confirm(`“${r.name}”을(를) 모두의 목록에서 삭제할까요? 관련 투표도 삭제됩니다.`))return;const {error}=await db.from('restaurants').delete().eq('id',r.id);if(error)notify(error.message);else{notify('식당을 삭제했어요.');await refresh();}}
$('addForm').addEventListener('submit',async e=>{e.preventDefault();if(!db)return;const category=$('categoryInput').value.trim(),name=$('restaurantInput').value.trim();if(!category||!name)return;
 const {error}=await db.from('restaurants').insert({category,name});if(error)notify(error.code==='23505'?'이미 등록된 이름이에요.':error.message);else{$('restaurantInput').value='';notify('새 식당이 팀 전체에 추가됐어요.');await refresh();}});
$('toggleMenu').addEventListener('click',()=>{summaryOpen=!summaryOpen;$('restaurantGroups').hidden=!summaryOpen;$('toggleMenu').setAttribute('aria-expanded',String(summaryOpen));text('toggleMenu',`📋 카테고리별 전체 식당 보기 ${summaryOpen?'▲':'▼'}`)});
$('toggleCategories').addEventListener('click',()=>{const shown=$('categoryChoices').hidden;$('categoryChoices').hidden=!shown;$('toggleCategories').setAttribute('aria-expanded',String(shown));});
$('selectAllCats').addEventListener('click',()=>{chosenCategories=new Set(restaurants.map(r=>r.category));render()});
$('clearCats').addEventListener('click',()=>{chosenCategories.clear();render()});
$('draw').addEventListener('click',async()=>{
 if(busy||!db)return;
 const pool=restaurants.filter(r=>chosenCategories.has(r.category));
 if(!pool.length){notify('카테고리를 하나 이상 선택해 주세요.');return;}
 busy=true;$('draw').disabled=true;
 const wheel=$('wheel');wheel.classList.remove('spin');void wheel.offsetWidth;wheel.classList.add('spin');
 text('winner','🍱 점심 룰렛 돌리는 중…');text('winnerDetail','선택한 카테고리에서 식당을 추첨하고 있어요.');
 const selected=pool[Math.floor(Math.random()*pool.length)];
 // 정확히 한 바퀴, 3초 후에 결과가 공유되도록 처리
 await new Promise(resolve=>setTimeout(resolve,3000));
 try{
  const {error}=await db.from('draws').insert({restaurant_id:selected.id,draw_day:day()});
  if(error)notify('뽑기 저장 실패: '+error.message);
  else{notify('점심 결과를 팀원 모두에게 공유했어요!');await refresh();}
 }catch(err){notify('뽑기 오류: '+err.message)}
 finally{wheel.classList.remove('spin');busy=false;$('draw').disabled=false;}
});
// 오늘의 투표와 식당 관리는 각 버튼으로 독립적으로 접고 펼칩니다.
[['toggleVote','voteTab'],['toggleRestaurants','restaurantsTab']].forEach(([buttonId,sectionId])=>{
 const button=$(buttonId),section=$(sectionId);
 button.addEventListener('click',()=>{
  const shouldOpen=section.hidden;
  section.hidden=!shouldOpen;
  button.setAttribute('aria-expanded',String(shouldOpen));
 });
});
async function start(){if(!ready){$('setup').hidden=false;text('connection','⚠ 설정 필요');$('draw').disabled=true;return;}
 try{db=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY);let {data:{session}}=await db.auth.getSession();if(!session){const {data,error}=await db.auth.signInAnonymously();if(error)throw error;session=data.session;}user=session.user;
 text('connection','● 실시간 연결');$('connection').classList.add('live');await refresh();
 db.channel('team-lunch-changes').on('postgres_changes',{event:'*',schema:'public',table:'restaurants'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'votes'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'draws'},refresh).subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){text('connection','● 재연결 중');$('connection').classList.remove('live')}if(status==='SUBSCRIBED'){text('connection','● 실시간 연결');$('connection').classList.add('live');refresh()}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 }catch(err){text('connection','● 연결 실패');notify(`연결 실패: ${err.message}. Supabase 익명 로그인 설정을 확인해 주세요.`);}}
start();

