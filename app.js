import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $=id=>document.getElementById(id);
const config=window.LUNCH_CONFIG||{};
const ready=config.SUPABASE_URL?.startsWith('https://')&&!config.SUPABASE_URL.includes('YOUR_PROJECT')&&config.SUPABASE_PUBLISHABLE_KEY&&!config.SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
let db,user,restaurants=[],votes=[],draws=[],busy=false;
let summaryOpen=true, chosenCategories=new Set(),initializedCategories=false,openGroups=new Set();
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
   row.append(description,optionButton('식당 삭제',()=>removeRestaurant(r),'remove'));content.append(row);
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
function readCsvRows(raw){
 const result=[];let row=[],field='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\n')&&!quoted){if(c==='\n'&&raw[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))result.push(row);row=[];field='';}
  else field+=c;
 }
 row.push(field);if(row.some(v=>v.trim()))result.push(row);
 return result;
}
$('importFile').addEventListener('click',async()=>{
 const f=$('restaurantFile').files?.[0];if(!f){notify('먼저 CSV 파일을 선택해 주세요.');return;}
 if(!db){notify('Supabase 연결을 확인해 주세요.');return;}
 if(f.size>1024*1024){notify('파일 크기는 1MB 이하로 올려주세요.');return;}
 const btn=$('importFile');btn.disabled=true;
 try{
  const raw=await f.text(),rows=readCsvRows(raw.replace(/^﻿/,''));
  const body=rows.filter((r,i)=>!(i===0&&/카테고리|category/i.test(r[0]||'')));
  const known=new Set(restaurants.map(r=>r.name.normalize('NFKC').trim().toLowerCase()));
  const newRows=[];
  for(const cols of body){const category=(cols[0]||'').trim(),name=(cols[1]||'').trim();const key=name.normalize('NFKC').toLowerCase();if(!category||!name||known.has(key))continue;if(category.length>50||name.length>120)continue;known.add(key);newRows.push({category,name})}
  if(!newRows.length){notify('추가할 새 식당이 없어요. CSV는 카테고리,식당 이름 형식이어야 해요.');return;}
  let added=0;for(let i=0;i<newRows.length;i+=100){const chunk=newRows.slice(i,i+100);const {data,error}=await db.from('restaurants').upsert(chunk,{onConflict:'name',ignoreDuplicates:true}).select('id');if(error)throw error;added+=(data||[]).length}
  notify(`${added}개 식당을 등록했어요. 중복 항목은 제외했어요.`);$('restaurantFile').value='';await refresh();
 }catch(e){notify('파일 등록 실패: '+e.message)}finally{btn.disabled=false}
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('voteTab').hidden=button.dataset.tab!=='vote';$('restaurantsTab').hidden=button.dataset.tab!=='restaurants';}));
async function start(){if(!ready){$('setup').hidden=false;text('connection','⚠ 설정 필요');$('draw').disabled=true;return;}
 try{db=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY);let {data:{session}}=await db.auth.getSession();if(!session){const {data,error}=await db.auth.signInAnonymously();if(error)throw error;session=data.session;}user=session.user;
 text('connection','● 실시간 연결');$('connection').classList.add('live');await refresh();
 db.channel('team-lunch-changes').on('postgres_changes',{event:'*',schema:'public',table:'restaurants'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'votes'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'draws'},refresh).subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){text('connection','● 재연결 중');$('connection').classList.remove('live')}if(status==='SUBSCRIBED'){text('connection','● 실시간 연결');$('connection').classList.add('live');refresh()}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 }catch(err){text('connection','● 연결 실패');notify(`연결 실패: ${err.message}. Supabase 익명 로그인 설정을 확인해 주세요.`);}}
start();

