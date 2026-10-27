'use strict';
const FAQ_FILE='assets/faq_2025.json';
const FAQ_PDF='assets/mfds_faq_2025.pdf';
const MFDS_PAGE='https://www.mfds.go.kr/brd/m_1060/view.do?seq=15769';
const LAW_LIST=[
 {name:'식품위생법',type:'법률',desc:'식품 영업, 안전관리, 검사, 영업자 의무',keywords:'영업 신고 시설기준 품목제조보고 위생 자가품질검사',label:'기본법'},
 {name:'식품위생법 시행령',type:'시행령',desc:'식품 영업의 종류 및 법률 위임사항',keywords:'영업 식품제조 가공업 식품접객업'},
 {name:'식품위생법 시행규칙',type:'시행규칙',desc:'별표 14 시설기준, 별표 17 영업자 준수사항 등',keywords:'시설기준 별표14 별표17 영업 위생'},
 {name:'축산물 위생관리법',type:'법률',desc:'축산물 기준 및 규격, 영업 허가, 위생관리',keywords:'축산물 육류 식육 가공 냉동 냉장'},
 {name:'축산물 위생관리법 시행령',type:'시행령',desc:'축산물 관련 영업 및 위임사항',keywords:'축산물 영업 허가'},
 {name:'축산물 위생관리법 시행규칙',type:'시행규칙',desc:'별표 12 준수사항 등 / 냉장육 절단 시 일시적 표면 경화 관련',keywords:'별표12 제1호 타목 절단 냉동 냉장육 슬라이스 예냉실 냉동전환',label:'핵심 FAQ 연결'},
 {name:'식품 등의 표시·광고에 관한 법률',type:'법률',desc:'표시사항 및 부당 표시·광고 제한',keywords:'표시 광고 알레르기 소비기한 영양'},
 {name:'식품 등의 표시·광고에 관한 법률 시행규칙',type:'시행규칙',desc:'표시방법 및 세부 기준, 별표',keywords:'표시 글자 크기 알레르기 소비기한 영양'},
 {name:'식품등의 표시기준',type:'고시',desc:'원재료명, 알레르기, 영양, 소비기한 등 상세 표시기준',keywords:'식약처 고시 표시사항 알레르기 원재료명 소비기한 영양'},
 {name:'식품의 기준 및 규격',type:'고시',desc:'식품유형별 기준·규격, 원료, 보존·유통기준',keywords:'식품공전 미생물 냉동 냉장 원료 식품유형 보존 유통'},
 {name:'식품첨가물의 기준 및 규격',type:'고시',desc:'식품첨가물의 성분규격 및 사용기준',keywords:'첨가물 사용 가능 함량'},
 {name:'식품 및 축산물 안전관리인증기준',type:'고시',desc:'HACCP 인증과 선행요건·평가 기준',keywords:'HACCP 해썹 인증 기준 선행요건 위해요소 CCP'},
 {name:'수입식품안전관리 특별법',type:'법률',desc:'수입식품 검사·신고 및 해외제조업소 관련',keywords:'수입 신고 해외제조'},
 {name:'건강기능식품에 관한 법률',type:'법률',desc:'건강기능식품 제조, 검사, 영업',keywords:'기능성원료 건강기능식품 GMP'},
 {name:'기구 및 용기·포장의 기준 및 규격',type:'고시',desc:'식품 접촉 기구·포장재의 기준·규격',keywords:'포장 용기 기구 재질'},
 {name:'농수산물의 원산지 표시 등에 관한 법률',type:'법률',desc:'원산지 표시 및 관리',keywords:'원산지 표시 식품 제조'}
];
let faqData=[];let faqShown=24;let activeCategory='';let lastResults=[];let lastQuery='';let historyTab='searches';let toastTimer=null;let currentFaqId=null;
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clean=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const dateFmt=d=>new Date(d).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const getLS=(k,d)=>{try{return JSON.parse(localStorage.getItem('fla_'+k))??d}catch{return d}};
const setLS=(k,v)=>{try{localStorage.setItem('fla_'+k,JSON.stringify(v))}catch{flash('브라우저 저장 공간이 부족합니다.')}};
const bookmarks=()=>getLS('bookmarks',[]);
const searches=()=>getLS('searches',[]);
const notes=()=>getLS('notes',{});
const named=(s)=>LAW_LIST.find(x=>x.name===s);
function officialUrl(law){let key=encodeURIComponent(law.name.replace(/\s/g,''));return law.type==='고시'?'https://www.law.go.kr/행정규칙/'+key:'https://www.law.go.kr/법령/'+key;}
function findLaw(name){const n=String(name||'').replace(/[·ㆍ\s]/g,'');return LAW_LIST.find(l=>l.name.replace(/[·ㆍ\s]/g,'')===n)||LAW_LIST.find(l=>n.includes(l.name.replace(/[·ㆍ\s]/g,'')));}
function flash(text){const el=$('toast');el.textContent=text;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2800)}
function showPage(page){document.querySelectorAll('.nav-item').forEach(e=>e.classList.toggle('active',e.dataset.page===page));document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id==='page-'+page));$('breadcrumbTitle').textContent=({'search':'법규 질의 검색','faq':'식약처 FAQ','library':'법령 서재','history':'검토 이력 · 보관함'})[page]||page;document.querySelector('.sidebar').classList.remove('open');if(page==='faq')renderFaq();if(page==='library')renderLibrary();if(page==='history')renderHistory();window.scrollTo({top:0,behavior:'smooth'})}
function extractTokens(q){const norm=q.toLowerCase().replace(/[.,!?()]/g,' ');let terms=(norm.match(/[가-힣a-z0-9]{2,}/g)||[]).filter(x=>!['이것','그것','어떻게','되나요','가능','수있나요','관련','경우','질문','위해','위한','받아서','해야','하는','않고','있는','좀더','무엇','나요','해도','법적으로','법규','법령','대하여','그리고','통해서'].includes(x));
const synonyms=[[/슬라이스|절단|커팅|절편|썰기|자르|컷팅/,'절단'],[/얼리|얼려|얼렸|동결|얼음|냉동/,'냉동'],[/냉장원료|냉장육|원료육|냉장/,'냉장'],[/입고|납품|받아서|구입/,'납품'],[/임시|일시|잠깐|짧게/,'일시'],[/품목제조|제조보고/,'품목제조보고'],[/기준서|해썹|haccp/,'HACCP'],[/라벨|표시사항|표시광고/,'표시'],[/영업장|공장|작업장/,'작업장'],[/알러지|알레르기/,'알레르기']];for(const [re,s] of synonyms)if(re.test(norm))terms.push(s.toLowerCase());return [...new Set(terms.filter(t=>t.length>=2))].slice(0,22)}
function scoreRecord(f,q,terms){let sc=0;const title=clean(f.title);const answer=clean(f.answer);const cat=clean(f.category);const ref=clean((f.refs||[]).join(' '));const qnorm=clean(q);if(qnorm.length>3&&(title.includes(qnorm)||answer.includes(qnorm)))sc+=65;let hits=0;for(const t of terms){const x=clean(t);if(!x)continue;const inTitle=title.includes(x),inAnswer=answer.includes(x),inRef=ref.includes(x);if(inTitle){sc+=10;hits++;}else if(inRef){sc+=5;hits++;}else if(inAnswer){sc+=2.6;hits++;}else if(cat.includes(x)){sc+=1;hits++}}
if(hits===0)return 0;if(hits>1)sc+=Math.min(18,hits*2.6);if(terms.length>2&&hits/terms.length<.26)sc*=.46;
const sliceRelated=/슬라이스|절단|커팅|컷팅|자르|썰기/.test(q)&&/냉장|냉동|얼리|얼려|얼렸|동결/.test(q);
const thawRelated=sliceRelated&&/해동|녹이|녹여/.test(q);
if(thawRelated){if(f.id===408)sc+=175;if(f.id===409)sc+=32;}
else if(sliceRelated){if(f.id===274)sc+=110;if(f.id===377)sc+=55;if(f.id===380)sc+=25;if(f.id===408)sc+=20;}
if(/냉동전환/.test(q)&&[377,378,379,380,381].includes(f.id))sc+=30;
if(/알레르기|알러지/.test(q)&&/알레르기|알러지/.test(f.title)){sc+=130;if(f.category==='표시·광고')sc+=38;}
if(/HACCP|해썹/i.test(q)&&/HACCP|해썹/.test(f.title))sc+=60;
if(/팀장/.test(q)&&/팀장/.test(f.title))sc+=42;
if(/소비기한/.test(q)&&/소비기한/.test(f.title))sc+=65;
if(/원산지/.test(q)&&/원산지/.test(f.title))sc+=55;
return sc;}
function runSearch(q,{restore=false}={}){q=q.trim();if(!q)return;lastQuery=q;const terms=extractTokens(q);let scored=faqData.map(f=>({...f,_score:scoreRecord(f,q,terms)})).filter(f=>f._score>=2.6).sort((a,b)=>b._score-a._score);lastResults=scored.slice(0,35);$('mainQuery').value=q;$('queryResult').classList.remove('hidden');$('homeOverview').classList.add('hidden');if(!restore){const old=searches().filter(s=>s.q!==q).slice(0,49);old.unshift({q,at:new Date().toISOString(),ids:lastResults.slice(0,5).map(x=>x.id)});setLS('searches',old);}renderResults();$('queryResult').scrollIntoView({behavior:'smooth',block:'start'});$('caseCount').textContent=searches().length;}
function sampleText(s,n=290){return (s||'').replace(/\s+/g,' ').replace(//g,' ').slice(0,n)+(s&&s.length>n?'…':'')}
const LAW_ANNEX12='https://www.law.go.kr/법령별표서식/(축산물 위생관리법 시행규칙,20260811,별표12)';
const LAW_MEAT='https://www.law.go.kr/법령/축산물위생관리법';
const FOOD_CODE='https://www.law.go.kr/행정규칙/식품의기준및규격';
// Zero-cost, curated decision cards: these are reviewed reference summaries, NOT unrestricted AI inference.
function caseKind(q){
 const s=q.replace(/\s+/g,'').toLowerCase();
 const freeze=/얼리|얼려|얼렸|얼린|냉동|동결|얼음|얼렸다|표면경화/.test(s);
 const cold=/냉장|냉장원료|냉장육/.test(s);
 const cut=/슬라이스|절단|컷팅|커팅|썰기|자르|재단|분할|절편/.test(s);
 const thaw=/해동|녹이|녹여/.test(s);
 if(freeze&&cut&&thaw&&!cold)return 'thaw_to_cut';
 if(cold&&freeze&&cut&&!thaw)return 'surface_chill';
 if(cold&&freeze&&/보관|냉동전환|저장|냉동하여|냉동으로|재고|매입/.test(s)&&!cut){
   if(/냉동포장육(을|으로)?(제조|생산)|새로운냉동포장육|냉장식육으로냉동포장육/.test(s))return 'make_frozen_product';
   return 'purchased_to_freeze';
 }
 return null;
}
function makeReview(q){
 const kind=caseKind(q);
 if(kind==='surface_chill')return {
  kind, status:'조건부 가능',statusNote:'냉장 식육인 경우에 한함',
  lead:'절단 또는 슬라이스 편의를 위해 냉장 식육의 심부는 동결하지 않고 표면만 단단해질 정도로 냉동시설에 일시 보관하는 것은 관련 기준에서 허용하고 있습니다. 다만 이것은 냉장원료를 냉동원료로 전환해 저장하는 것과 다릅니다.',
  sections:[
   {title:'허용 근거 · 법적 의무',text:'「축산물 위생관리법 시행규칙」 별표 12 제1호 타목은 냉장육 절단을 위한 일시적인 표면 경화를 허용하며, 냉동육과 구별할 것을 요구합니다.',url:LAW_ANNEX12,label:'별표 12 해당 시행판 원문 ↗'},
   {title:'구분해야 할 상황 · 공식 FAQ',text:'구입한 냉장 식육·포장육을 임의로 냉동 전환해 보관하며 사용하는 행위는 식약처 Q377에서 허용되지 않는다고 설명합니다.',faqId:377,label:'Q377 안내서 원문 ↗'}
  ],
  checks:['실제 원료가 냉장 식육인지, 아니면 일반 식품원료인지 먼저 구분','작업 목적이 일시적인 절단 편의인지, 냉동 상태로 보존하기 위한 것인지 확인','심부까지 얼리지 않는지와 표면 경화 후 즉시 절단하는 공정 조건 확인','냉동육과 구분할 표지·식별 방법 마련','온도·시간 기록, 위해요소분석 및 HACCP 관리기준 반영 여부는 실무적으로 검토'],
  note:'이 카드는 냉장 식육에 관한 참고 검토입니다. 냉장 수산물·채소·가공식품 등 다른 원료에는 별도 기준이 적용될 수 있습니다. 공정·업종·원료 정보를 확인한 후 최종 판단하세요.',
  report:'냉장 식육을 슬라이스하기 위한 목적으로 심부를 동결하지 않고 표면만 일시적으로 경화시키는 것은 「축산물 위생관리법 시행규칙」 별표 12 제1호 타목에 근거가 있습니다. 단, 냉장원료를 장기간 냉동보관하도록 전환하는 행위와는 구분해야 하며, 냉동육과의 구분표시 및 실제 공정 조건을 확인한 뒤 적용할 수 있습니다.',
  sources:[{id:274,desc:'Q274는 예냉실 변경에 관한 질문이지만, 답변 본문에서 절단용 표면 경화 규정을 인용합니다.'},{id:377,desc:'Q377은 매입한 냉장 식육의 임의 냉동전환·보관 금지를 설명합니다.'}]
 };
 if(kind==='purchased_to_freeze')return {
  kind,status:'임의 냉동전환은 허용되지 않음',statusNote:'매입한 냉장 식육·포장육 보관 기준',
  lead:'식약처 2025 질문집 Q377에 따르면 냉장 보관방법과 소비기한이 정해진 식육·포장육을 구입한 축산물가공업자는 이를 임의로 냉동 전환하여 보관하면서 사용할 수 없습니다.',
  sections:[{title:'적용 근거 · 공식 FAQ',text:'Q377은 「축산물 위생관리법」 제4조 및 「식품의 기준 및 규격」의 보존·유통기준을 설명합니다.',faqId:377,label:'Q377 전체 답변 확인 ↗'},{title:'다른 제도 · 냉동전환신고',text:'자신이 제조한 냉장 축산물을 냉동 전환해 판매하는 경우의 신고 제도와, 남이 만든 냉장원료를 임의로 냉동보관하는 것은 구별해야 합니다.',url:LAW_ANNEX12,label:'별표 12 원문 ↗'}],
  checks:['입고 원료의 보관방법과 소비기한 확인','납품받은 냉장원료인지 자체 제조 제품인지 구분','제품화하려는 경우 품목제조보고·공정조건 등 별도 검토'],
  note:'업종·제품에 따라 새로운 냉동제품 제조와 단순 냉동전환은 법적 취급이 다릅니다. Q380을 함께 확인하세요.',
  report:'납품받은 냉장 식육 또는 포장육을 임의로 냉동 전환해 보관하면서 사용하는 것은 식약처 2025 질문집 Q377에 따르면 허용되지 않습니다. 새로운 냉동제품 제조를 계획한다면 별도의 품목제조보고 및 공정 적합성 검토가 필요합니다.',
  sources:[{id:377,desc:'냉장 닭고기 및 냉장육 매입 후 냉동전환 질의'},{id:380,desc:'냉장육을 원료로 새로운 냉동포장육 생산 시 별도 판단'}]
 };
 if(kind==='thaw_to_cut')return {
  kind,status:'조건부 가능',statusNote:'냉동 식육의 절단을 위한 해동',
  lead:'식약처 2025 질문집 Q408은 냉동식육을 절단하기 위해 일시적으로 해동한 후 분할하고 재냉동하는 사례를 다룹니다. 분할 작업 후 즉시 냉동해야 한다는 점을 제시합니다.',
  sections:[{title:'공식 FAQ',text:'Q408은 냉동 식육의 절단을 위한 해동·분할 후 즉시 냉동할 수 있다고 설명합니다.',faqId:408,label:'Q408 전체 답변 ↗'},{title:'관련 고시',text:'식약처 질문집은 「식품의 기준 및 규격」 제2. 4. 3) (8)을 근거로 제시합니다.',url:FOOD_CODE,label:'식품공전 공식 원문 ↗'}],
  checks:['냉동 식육에 관한 질문인지 확인','해동의 목적이 절단·분할인지 구분','작업 후 즉시 냉동 및 작업장 위생관리 조건 확인'],
  note:'냉장육의 표면 경화와 반대 방향의 공정입니다. 냉동육을 해동해 냉장제품으로 판매하는 행위는 별도 제한이 있으므로 혼동하지 마세요.',
  report:'냉동 식육을 절단·분할하기 위한 일시적 해동 후 재냉동은 식약처 2025 질문집 Q408에서 인정하는 사례입니다. 다만 분할 후 즉시 냉동해야 하며, 냉장제품으로의 판매 등 다른 행위와 구분하여 관리해야 합니다.',
  sources:[{id:408,desc:'절단을 위한 일시적 해동 및 즉시 재냉동'},{id:409,desc:'냉동 식육을 냉장 포장육으로 제조하는 경우 제한'}]
 };
 if(kind==='make_frozen_product')return {
  kind,status:'가능한 제조 방식이 있음',statusNote:'새로운 냉동포장육 생산 조건',
  lead:'식약처 2025 질문집 Q380에 따르면 식육포장처리업자가 냉장 식육·포장육을 원료로 새로운 냉동포장육 제품을 생산하는 것은 허용되는 사례입니다. 이 경우 절단·냉동 공정을 포함한 품목제조보고가 필요합니다.',
  sections:[{title:'공식 FAQ 및 법적 근거',text:'Q380: 「축산물 위생관리법」 제25조 및 같은 법 시행규칙 제37조.',faqId:380,label:'Q380 전체 답변 ↗'},{title:'구별할 제도',text:'기존에 만든 냉장 포장육을 포장 그대로 냉동제품으로 전환하여 판매하는 경우와는 구분합니다.',url:LAW_ANNEX12,label:'별표 12 원문 ↗'}],
  checks:['업종이 식육포장처리업인지 확인','새로운 제품의 절단·냉동 공정 및 품목제조보고 내용 확인','표시방법·소비기한 및 위해요소관리 계획 검토'],
  note:'업종과 제품 유형이 다르면 판단도 달라지므로 적용 전에 허가관청을 확인해야 합니다.',
  report:'식육포장처리업자가 냉장 식육 등을 원료로 절단·냉동하여 새로운 냉동포장육을 생산하는 것은 식약처 Q380에서 허용하는 제조 방식입니다. 다만 품목제조보고 시 해당 공정을 상세히 기재하는 등 별도 준수사항을 확인해야 합니다.',
  sources:[{id:380,desc:'신규 냉동포장육 제조와 냉동전환신고의 구별'},{id:377,desc:'단순 원료 냉동전환 제한'}]
 };
 return null;
}
function renderSourcePair(e){const f=faqData.find(x=>x.id===e.id);if(!f)return'';return `<div class="source-pair"><div><b>식약처 Q${e.id} · p.${f.page}</b><p>${safe(e.desc)}</p></div><button class="btn btn-secondary" data-open-faq="${e.id}">원문 읽기 ↗</button></div>`}
function renderReviewCard(review){
 if(!review){const f=lastResults[0]; if(!f)return `<section class="answer-card"><span class="answer-label">근거 검토</span><h3>현재 자료에서 직접 연결되는 근거를 찾지 못했습니다</h3><p>다른 표현으로 질문하거나 법령 서재에서 검색해 주세요. 근거가 없는 법적 결론은 생성하지 않습니다.</p></section>`;
  return `<section class="answer-card answer-pending"><div class="answer-head"><span class="answer-label">FAQ 근거 요약 · 법적 결론 미확정</span><span class="answer-chip neutral">원문 확인 필요</span></div><h3>가장 유사한 공식 질의회신을 찾았습니다</h3><p>현재 무료 버전에는 이 질문에 대한 검증된 판단 카드가 없습니다. 아래는 식약처 질문집의 <b>기존 답변 일부</b>이며, 입력한 질문에 대한 독립적인 AI 판단이 아닙니다.</p><div class="faq-preview"><strong>Q${f.id}. ${safe(f.title)}</strong><p>${safe(sampleText(f.answer,620))}</p></div><button class="btn btn-secondary" data-open-faq="${f.id}">전체 답변·근거 확인 ↗</button></section>`;
 }
 const sections=review.sections.map(x=>`<div class="answer-section"><strong>${safe(x.title)}</strong><p>${safe(x.text)}</p>${x.url?`<a class="answer-link" href="${safe(x.url)}" target="_blank" rel="noopener noreferrer">${safe(x.label||'공식 법령 원문 보기')} ↗</a>`:`<button class="answer-link" data-open-faq="${x.faqId}">${safe(x.label||'FAQ 원문 확인')}</button>`}</div>`).join('');
 const checks=review.checks.map(x=>`<li>${safe(x)}</li>`).join('');
 const mainSource=review.sources.map(renderSourcePair).join('');
 return `<section class="answer-card"><div class="answer-head"><div><span class="answer-label">검증된 실무사례 기반 참고 검토</span><h3>핵심 답변</h3></div><span class="answer-chip">${safe(review.status)}</span></div><p class="answer-scope">${safe(review.statusNote)}</p><p class="answer-lead">${safe(review.lead)}</p><div class="answer-sections">${sections}</div><h4>적용 전 확인사항</h4><ul class="answer-checks">${checks}</ul><div class="answer-report"><div class="report-head"><strong>대표님 보고용 문구</strong><button class="btn btn-secondary" data-copy-verdict>이 문구 복사</button></div><p>${safe(review.report)}</p></div><div class="answer-sources"><b>관련 공식 사례</b>${mainSource}</div><div class="answer-disclaimer">${safe(review.note)}<br>출처: 식약처 2025년 질문집. 관련 별표는 2026.08.11 시행판을 2026.10.27에 조회했으나, 정기적으로 자동 갱신되지 않습니다. 실제 보고 전에 원문·시행일·개정 여부를 확인하세요.</div></section>`;
}
function renderResults(){
 const box=$('queryResult');const review=makeReview(lastQuery);const kind=review?.kind||'';
 let html=`<div class="result-header"><div><span class="overline dark">ANSWER FIRST · SOURCE LINKED</span><h2>“${safe(lastQuery)}”</h2><p>${review?'검증된 실무사례에 맞춰 근거 중심의 판단 요약을 표시합니다.':'관련 공식 질의회신을 우선 표시합니다.'}</p></div><button class="btn btn-secondary" id="copyReport">${review?'전체 검토 초안 복사':'근거 목록 복사'}</button></div>`;
 html+=renderReviewCard(review);
 html+=`<div class="result-banner">⚖️ <strong>확인 범위:</strong> 이 무료 버전은 법령 전체를 실시간으로 판단하는 생성형 AI가 아닙니다. 사례별 검토 카드는 공식 자료를 기반으로 미리 작성한 요약이며, 다른 질문은 유사 FAQ 검색 결과만 보여줍니다.</div>`;
 if(lastResults.length){html+=`<div class="related-heading"><h3>관련 식약처 질의회신</h3><span>${lastResults.length}건 후보 · 2025 질문집</span></div>`;
 html+=lastResults.slice(0,8).map(f=>`<article class="result-item"><div class="topline"><div class="result-meta"><span class="small-tag">Q${f.id}</span><span>${safe(f.category)} · p.${f.page}</span></div><button class="text-link" data-bookmark="${f.id}">${bookmarks().includes(f.id)?'★ 저장됨':'☆ 저장'}</button></div><h3>${safe(f.title)}</h3><p>${safe(sampleText(f.answer,240))}</p><div class="result-actions"><button class="btn btn-secondary" data-open-faq="${f.id}">질의회신 전체 답변</button><button class="btn btn-secondary" data-pdf="${f.page}">원본 PDF p.${f.page}</button></div></article>`).join('');}
 box.innerHTML=html;
}
function renderFaq(){let q=$('faqQuery').value.trim();let cat=$('faqCategory').value;let list=faqData.filter(f=>(!cat||f.category===cat)&&(!q||scoreRecord(f,q,extractTokens(q))>2.5));if(q)list.sort((a,b)=>scoreRecord(b,q,extractTokens(q))-scoreRecord(a,q,extractTokens(q)));$('faqSearchCount').textContent=`${list.length.toLocaleString()}건 검색됨`;$('faqList').innerHTML=list.slice(0,faqShown).map(f=>`<article class="faq-item" tabindex="0" role="button" data-open-faq="${f.id}"><span class="faq-num">Q${f.id}</span><div class="faq-main"><h3>${safe(f.title)}</h3><div class="faq-tags"><span>${safe(f.category)}</span><span>인쇄 p.${f.page}</span></div></div><span class="faq-arrow">›</span></article>`).join('')||'<div class="empty">검색 결과가 없습니다. 검색어를 바꿔 보세요.</div>';$('faqMore').classList.toggle('hidden',faqShown>=list.length)}
function renderLibrary(){let q=clean($('lawQuery').value);let t=$('lawCategory').value;let filtered=LAW_LIST.filter(l=>(!t||l.type===t)&&(!q||clean(l.name+' '+l.desc+' '+l.keywords).includes(q)));$('lawList').innerHTML=filtered.map((l,i)=>`<article class="law-card"><span class="law-type">${safe(l.type)}${l.label?' · '+safe(l.label):''}</span><h3>${safe(l.name)}</h3><p>${safe(l.desc)}</p><div class="law-actions"><a target="_blank" rel="noopener noreferrer" href="${safe(officialUrl(l))}">현행 원문 열기 ↗</a><button data-lawfaq="${safe(l.name)}">관련 FAQ 찾기 →</button></div></article>`).join('')||'<div class="empty">법령이 검색되지 않습니다.</div>';renderMyLawList();}
function buildReport(){
 let now=new Date().toLocaleDateString('ko-KR');let review=makeReview(lastQuery);
 let t=`[Food Law AI | 실무 법규 검토 참고자료]\n작성일: ${now}\n질문: ${lastQuery}\n`;
 if(review){t+=`\n[검토결론] ${review.status} (${review.statusNote})\n${review.lead}\n\n[관련 법령·공식 안내]\n`;for(const s of review.sections)t+=`- ${s.title}: ${s.text}\n  ${s.url||'식약처 공식 질문집 Q'+s.faqId}\n`;t+=`\n[확인사항]\n${review.checks.map((x,i)=>(i+1)+'. '+x).join('\n')}\n\n[대표님 보고용]\n${review.report}\n\n[제한사항]\n${review.note}\n`}
 else{t+=`\n[직접 판단 불가: 유사 FAQ 검색 결과]\n`;}
 t+=`\n[식약처 공식 질의회신]\n`;
 for(const f of lastResults.slice(0,5))t+=`Q${f.id} (p.${f.page}): ${f.title}\n답변 일부: ${sampleText(f.answer,300)}\n`;
 t+=`\n본 앱은 유료 AI를 사용하지 않는 정적 근거검색 도구입니다. 현행 법령과 실제 사실관계 확인 후 사용하세요.\n식약처 질문집: ${MFDS_PAGE}\n국가법령정보센터: https://www.law.go.kr`;
 return t;
}
async function copyText(text){try{await navigator.clipboard.writeText(text);flash('클립보드에 복사했어요.')}catch{const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();try{document.execCommand('copy');flash('내용을 복사했어요.')}catch{flash('복사에 실패했습니다.')}t.remove();}}
function openDrawer(title,content){$('detailTitle').textContent=title;$('detailBody').innerHTML=content;$('drawerBackdrop').classList.remove('hidden');$('detailDrawer').classList.remove('hidden');document.body.style.overflow='hidden';}
function closeDrawer(){$('detailDrawer').classList.add('hidden');$('drawerBackdrop').classList.add('hidden');document.body.style.overflow='';currentFaqId=null;}
function answerRefs(f){if(f.refs?.length)return f.refs;let refs=[...new Set((f.answer.match(/「[^」]{2,80}」(?:\s*(?:제\d+조[^\n,)]{0,35}|\[별표[^\]]*\]))?/g)||[]))];return refs.slice(0,7);}
function openFaq(id){const f=faqData.find(x=>x.id===Number(id));if(!f)return;currentFaqId=f.id;const refs=answerRefs(f);let refHtml=refs.map(x=>{let nameMatch=x.match(/「([^」]+)」/);let l=nameMatch?findLaw(nameMatch[1]):null;return `<div class="legal-ref"><span>${safe(x)}</span>${l?`<a href="${safe(officialUrl(l))}" target="_blank" rel="noopener noreferrer">${safe(l.name)} 공식 원문 ↗</a>`:'<span class="muted">법령명·시행일은 최신 원문에서 확인</span>'}</div>`}).join('')||'<p class="muted">이 FAQ에서 연결된 조문은 자동 인식되지 않았습니다. 법령 서재와 원문에서 직접 확인해 주세요.</p>';
const directRule=[274,377,378,380].includes(f.id)?`<div class="legal-ref"><b>직접 연관된 별표 링크 (2026.08.11 시행판)</b><a href="${safe(LAW_ANNEX12)}" target="_blank" rel="noopener noreferrer">축산물 위생관리법 시행규칙 별표 12 원문 ↗</a><small>Q274: 제1호 타목 / Q377·378·380: 냉동전환 관련 규정과 비교 확인</small></div>`:'';
const bookmarked=bookmarks().includes(f.id);let html=`<div class="detail-meta"><span>Q${f.id}</span><span>${safe(f.category)}</span><span>식약처 2025 질문집 · p.${f.page}</span></div><div class="caution-box">원본은 2025년 11월 기준 민원인 안내서로 법적 효력이 없습니다. 현재 시행 중인 법령은 반드시 별도로 확인해 주세요.</div><div class="detail-btn-row"><button class="btn btn-secondary" data-bookmark="${f.id}">${bookmarked?'★ 즐겨찾기 해제':'☆ 즐겨찾기'}</button><button class="btn btn-secondary" data-pdf="${f.page}">PDF 원본 p.${f.page} ↗</button></div><section class="detail-section"><h3>▤ 식약처 답변 원문 (텍스트 추출)</h3><div class="original-answer">${safe(f.answer)}</div></section><section class="detail-section"><h3>§ 질문집에 인용된 법령·고시</h3>${directRule}${refHtml}<p class="muted">위 법령 연결은 질문집의 인용 문구를 기준으로 합니다. 정확한 조·항·호·별표와 현재 효력은 공식 원문에서 대조해 주세요.</p></section><section class="detail-section"><h3>✎ 나의 검토 메모</h3><textarea class="notes-area" id="faqNote" placeholder="실제 공정 조건, 관할기관 확인 결과 등을 기록하세요. (이 기기에만 저장)">${safe(notes()[f.id]||'')}</textarea><div class="detail-btn-row" style="margin-top:9px"><button class="btn btn-primary" data-save-note="${f.id}">메모 저장</button><button class="btn btn-secondary" data-copy-faq="${f.id}">질의회신 정보 복사</button></div></section>`;openDrawer(f.title,html);}
function openPdf(page){let url=FAQ_PDF+'#page='+Math.max(1,Number(page)||1);openDrawer('2025 식약처 질문집 · p.'+page,`<div class="caution-box">PDF 인쇄 페이지와 파일 페이지가 일치합니다. 아래는 업로드된 질문집 원본입니다.</div><iframe class="pdf-frame" title="식약처 질문집 PDF" src="${safe(url)}"></iframe><div class="detail-btn-row" style="margin-top:13px"><a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" href="${safe(url)}">PDF 새 탭에서 보기 ↗</a><a class="btn btn-secondary" target="_blank" rel="noopener noreferrer" href="${MFDS_PAGE}">식약처 공식 게시물 ↗</a></div>`);}
function toggleBookmark(id){id=Number(id);let arr=bookmarks();arr=arr.includes(id)?arr.filter(x=>x!==id):[id,...arr];setLS('bookmarks',arr);if(!$('detailDrawer').classList.contains('hidden')&&currentFaqId===id)openFaq(id);else if(!$('queryResult').classList.contains('hidden'))renderResults();if(document.querySelector('#page-history.active'))renderHistory();flash(arr.includes(id)?'즐겨찾기에 저장했어요.':'즐겨찾기를 해제했어요.');}
function renderHistory(){document.querySelectorAll('[data-historytab]').forEach(b=>b.classList.toggle('active',b.dataset.historytab===historyTab));let html='';if(historyTab==='searches'){const arr=searches();html=arr.map(s=>`<div class="history-row"><div><strong>${safe(s.q)}</strong><small>${dateFmt(s.at)} · 검색 결과 ${s.ids?.length||0}건 미리 저장</small></div><button data-repeat="${safe(s.q)}">다시 검색 ↗</button></div>`).join('');}
if(historyTab==='bookmarks')html=bookmarks().map(id=>faqData.find(x=>x.id===id)).filter(Boolean).map(f=>`<div class="history-row"><div><strong>Q${f.id}. ${safe(f.title)}</strong><small>${safe(f.category)} · p.${f.page}</small></div><button data-open-faq="${f.id}">확인 ↗</button></div>`).join('');
if(historyTab==='notes')html=Object.entries(notes()).map(([id,val])=>({f:faqData.find(x=>x.id===Number(id)),val})).filter(x=>x.f&&x.val).map(({f,val})=>`<div class="history-row"><div><strong>Q${f.id}. ${safe(f.title)}</strong><small>${safe(sampleText(val,120))}</small></div><button data-open-faq="${f.id}">열기 ↗</button></div>`).join('');$('historyContent').innerHTML=html||'<div class="empty">아직 저장된 기록이 없습니다.<br>검색을 하거나 FAQ를 즐겨찾기에 추가해 보세요.</div>';}
const dbOpen=()=>new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB unavailable'));let r=indexedDB.open('FoodLawAILocal',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('docs'))r.result.createObjectStore('docs',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function docsAll(){let db=await dbOpen();return new Promise((resolve,reject)=>{let tr=db.transaction('docs','readonly'),req=tr.objectStore('docs').getAll();req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
async function docPut(obj){let db=await dbOpen();return new Promise((resolve,reject)=>{const tr=db.transaction('docs','readwrite');tr.objectStore('docs').put(obj);tr.oncomplete=()=>{db.close();resolve()};tr.onerror=()=>{db.close();reject(tr.error)}})}
async function docDelete(id){let db=await dbOpen();return new Promise((resolve,reject)=>{const tr=db.transaction('docs','readwrite');tr.objectStore('docs').delete(id);tr.oncomplete=()=>{db.close();resolve()};tr.onerror=()=>{db.close();reject(tr.error)}})}
async function renderMyLawList(){const el=$('myLawList');try{let docs=await docsAll();el.innerHTML=docs.map(x=>`<article class="my-law-card"><div><strong>${safe(x.name)}</strong><small>내 브라우저 저장 · ${(x.text.length/1024).toFixed(0)} KB · ${dateFmt(x.at)}</small></div><div class="law-actions"><button data-my-law="${safe(x.id)}">읽기 ↗</button><button data-my-delete="${safe(x.id)}">삭제</button></div></article>`).join('')||'';}catch{el.innerHTML='<div class="muted">이 브라우저에서 로컬 문서 저장을 사용할 수 없습니다.</div>'}}
async function openMyLaw(id){try{let docs=await docsAll();let d=docs.find(d=>d.id===id);if(!d)return;openDrawer(d.name,`<div class="caution-box">직접 등록한 문서입니다. 현행 법령과 동일한지 확인해 주세요. 서버에 전송되지 않습니다.</div><div class="inline-search" style="margin-bottom:12px"><span>⌕</span><input id="myDocSearch" placeholder="등록한 문서 안에서 단어 찾기"></div><div class="original-answer" style="max-height:none" id="myDocContent"></div>`);$('myDocContent').textContent=d.text;$('myDocSearch').addEventListener('input',e=>{let q=e.target.value.trim();if(!q){$('myDocContent').textContent=d.text;return;}let p=d.text.indexOf(q);if(p<0){$('myDocContent').textContent='문서 안에서 해당 표현을 찾지 못했습니다.';return;}$('myDocContent').textContent=d.text.slice(Math.max(0,p-500),Math.min(d.text.length,p+6500));});}catch{flash('문서를 읽을 수 없습니다.')}}
function initEvents(){document.querySelectorAll('.nav-item').forEach(e=>e.addEventListener('click',()=>showPage(e.dataset.page)));document.querySelectorAll('[data-example]').forEach(e=>e.addEventListener('click',()=>{$('mainQuery').value=e.dataset.example;runSearch(e.dataset.example)}));document.querySelectorAll('[data-goto]').forEach(e=>e.addEventListener('click',()=>showPage(e.dataset.goto)));$('mobileMenu').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));$('searchForm').addEventListener('submit',e=>{e.preventDefault();runSearch($('mainQuery').value)});$('faqQuery').addEventListener('input',()=>{faqShown=24;renderFaq()});$('faqCategory').addEventListener('change',()=>{faqShown=24;renderFaq()});$('faqMore').addEventListener('click',()=>{faqShown+=24;renderFaq()});$('lawQuery').addEventListener('input',renderLibrary);$('lawCategory').addEventListener('change',renderLibrary);$('drawerBackdrop').addEventListener('click',closeDrawer);$('detailClose').addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();if(e.key==='Enter'&&e.target.classList.contains('faq-item'))openFaq(e.target.dataset.openFaq)});
 document.addEventListener('click',e=>{const el=e.target.closest('button,[data-open-faq]');if(!el)return;const d=el.dataset;if(d.openFaq){openFaq(d.openFaq);return}if(d.bookmark){toggleBookmark(d.bookmark);return}if(d.pdf){openPdf(d.pdf);return}if(d.saveNote){let n=notes();n[d.saveNote]=$('faqNote').value;setLS('notes',n);flash('검토 메모를 저장했어요.');return}if(d.copyVerdict!==undefined){const review=makeReview(lastQuery);if(review)copyText(review.report+'\n\n관련 근거: '+review.sections.map(x=>x.title+' '+(x.url||'식약처 Q'+x.faqId)).join('; ')+'\n※ 공식 법령·개정 확인 후 사용');return}if(d.copyFaq){let f=faqData.find(f=>f.id===Number(d.copyFaq));copyText(`식약처 2025 자주하는 질문집 Q${f.id}, p.${f.page}\n${f.title}\n${f.answer}\n출처: ${MFDS_PAGE}\n※2025년 안내서로 현행 법령 재확인 필요`);return}if(d.repeat){showPage('search');runSearch(d.repeat);return}if(d.lawfaq){showPage('faq');$('faqQuery').value=d.lawfaq.replace(/시행규칙|시행령|법률|법|의|등|위생관리/g,' ').trim().split(/\s+/)[0]||d.lawfaq;renderFaq();return}if(d.myLaw){openMyLaw(d.myLaw);return}if(d.myDelete){if(confirm('이 브라우저에 저장된 자료를 삭제할까요?'))docDelete(d.myDelete).then(renderMyLawList);return}if(el.id==='copyReport'){copyText(buildReport());return}});
 document.querySelectorAll('[data-historytab]').forEach(b=>b.addEventListener('click',()=>{historyTab=b.dataset.historytab;renderHistory()}));$('exportHistory').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),searches:searches(),bookmarks:bookmarks(),notes:notes()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='food_law_ai_my_research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});$('lawUpload').addEventListener('change',async e=>{let f=e.target.files?.[0];if(!f)return;if(f.size>5_000_000){flash('한 번에 5MB 이하 TXT 자료만 지원합니다.');return}try{const t=await f.text();await docPut({id:'law-'+Date.now(),name:f.name,text:t,at:new Date().toISOString()});renderMyLawList();flash('내 법령 서재에 저장했어요.')}catch{flash('문서 저장에 실패했습니다.')}e.target.value='';});}
async function init(){initEvents();$('today').textContent=new Date().toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'});$('lawCount').textContent=LAW_LIST.length;try{let data=window.__FOOD_LAW_FAQS__;if(!data){let r=await fetch(FAQ_FILE);if(!r.ok)throw Error('HTTP '+r.status);data=await r.json();}faqData=data.faqs;$('faqCount').textContent=faqData.length.toLocaleString();$('faqTotalHeader').textContent=faqData.length.toLocaleString();let cats=[...new Set(faqData.map(f=>f.category))];cats.forEach(c=>{const opt=document.createElement('option');opt.value=c;opt.textContent=c;$('faqCategory').append(opt)});$('caseCount').textContent=searches().length;renderFaq();renderLibrary();renderHistory();let urlq=new URLSearchParams(location.search).get('q');if(urlq)runSearch(urlq,{restore:true})}catch(e){$('faqCount').textContent='!';$('queryResult').classList.remove('hidden');$('queryResult').innerHTML='<div class="caution-box"><strong>자료를 불러오지 못했습니다.</strong> FAQ 데이터를 불러올 수 없습니다. ZIP에 포함된 assets 폴더를 함께 유지한 뒤 다시 열어 주세요.</div>';console.error('FAQ load:',e)}}
init();
