import {calculate} from './model.js?v=audit1';
import {mapHTML,locations} from './map.js?v=audit1';
import {assumptionsHTML} from './assumptions.js?v=audit1';
const $=s=>document.querySelector(s);
let state={term:5,floor:0,flex:false,event:'expected'},year=3,selected=null;
let previousState=null,lastChange='';
const events={expected:'Expected growth',slow:'Slower demand growth',closure:'Closure after year 5',failed:'Failed response in year 6'};
const names={data:'Northbank Data',generation:'Generation',transmission:'Transmission',network:'The substation',homes:'The town',flex:'Flexibility'};
const questions=['One choice we changed and why','What exposure remains for the town, and who decides who pays?','What happens to flexibility incentives?','Which local evidence or legal mandate must we check?','One unresolved question for peers'];
$('#map-art').innerHTML=mapHTML();
$('#assumptions').innerHTML=assumptionsHTML;
$('#questions').innerHTML=questions.map((q,i)=>`<div><label for="q${i}">${q}</label><textarea id="q${i}"></textarea></div>`).join('');
function choiceSelect(id,label,options,value,help){return `<label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select><p class="help">${help}</p>`;}
function select(){return ''; }
function button(place,label){return `<button class="next-place" data-go="${place}">${label} →</button>`;}
function openPlace(id){selected=id;$('#inspector').hidden=false;$('#case').hidden=true;$('#case-toggle').setAttribute('aria-expanded','false');render();$('#panel-heading').focus({preventScroll:true});$('.game').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});const place=document.querySelector(`[data-place="${id}"]`);const scroller=$('.map-scroll');scroller.scrollTo({left:Math.max(0,place.offsetLeft-scroller.clientWidth/2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
function render(){
 const focusId=document.activeElement?.id;
 const r=calculate(state),base=calculate({event:state.event}),row=r.rows[year-1];
 $('#commitment-summary').textContent=`${state.term}-year commitment${year>state.term?' · expired in the year shown':''}. ${state.floor?'Minimum billing demand: '+state.floor*100+'%.':'No minimum floor.'}`;
 $('#year-value').textContent=year;$('#year').value=year;
 const closed=row.demand===0,delivered=row.benefit>0,failed=state.flex&&state.event==='failed'&&year===6;
 $('#time-caption').textContent=`Year ${year}: ${row.demand} MW used; ${row.billed.toFixed(0)} MW billed. Temporary response is separate.`;
 $('#badge-data').textContent=closed?'SITE CLOSED':`${row.demand} MW · €${row.payment.toFixed(1)}m / year`;
 $('#badge-network').textContent=row.gap<0?`€${(-row.gap).toFixed(1)}m over-recovery`:`€${row.gap.toFixed(1)}m uncovered / year`;
 $('#badge-homes').textContent=row.gap>0?`€${row.gap.toFixed(1)}m unallocated / year`:'No uncovered requirement this year';
 $('#town-exposure').innerHTML=`<strong>THE TOWN / WHO IS EXPOSED?</strong><span>${row.gap>0?'€'+row.gap.toFixed(2)+'m not yet covered this year':row.gap<0?'€'+(-row.gap).toFixed(2)+'m over-recovery this year':'Network requirement covered this year'}</span><p>Local rules decide whether the utility, data centre or existing consumers carry any gap. This is not a bill estimate.</p><button id="visit-town">Explore the town →</button>`;
 $('#visit-town').onclick=()=>openPlace('homes');
 document.querySelector('[data-place="homes"]').classList.toggle('town-attention',row.gap>0);
 $('#reflection-context').textContent=`Your choices: ${state.term}-year commitment, ${state.floor*100}% floor, flexibility ${state.flex?'agreed':'not agreed'}. Event: ${events[state.event]}. Net uncovered requirement over 15 years: €${r.gap.toFixed(2)}m (negative means over-recovery).`;
 $('#badge-generation').textContent=closed?'Town still needs supply':'Supply costs kept separate';
 $('#badge-transmission').textContent=delivered?'Useful peak response':'Infrastructure remains';
 $('#badge-flex').textContent=closed?'SITE UNAVAILABLE':failed?'RESPONSE FAILED':delivered?'10 MW RESPONSE':'NO AGREEMENT';
 $('#dc-flow').classList.toggle('off',closed);$('#dc-flow').style.strokeWidth=delivered?'3':row.demand<70?'4':'7';
 $('#flex-flow').classList.toggle('off',!delivered);$('#payment-path').classList.toggle('off',closed);$('#payment-path').style.strokeWidth='4';
 $('#dc-art').classList.toggle('inactive',closed);$('#dc-lights').classList.toggle('off',closed);$('#battery-art').classList.toggle('inactive',!delivered);
 locations.forEach(l=>document.querySelector(`[data-place="${l.id}"]`).setAttribute('aria-pressed',String(l.id===selected)));
 document.querySelector('[data-place="data"]').classList.toggle('start-here',selected===null&&!previousState);
 let content='';
 if(selected==='data')content=`<p>A 100 MW request, ramping from 40 to 70 to 100 MW. Set the contribution using the choices on the map, then visit the substation and town.</p><p>The floor is a percentage of that year’s agreed ramp: 40, 70, then 100 MW. It applies through the last year of the commitment. After expiry, billing uses actual demand.</p><div class="stat">€${row.payment.toFixed(2)}m<small>Network payment in year ${year} · ${row.billed.toFixed(0)} MW billing demand</small></div><p>The data centre pays the utility €${row.payment.toFixed(2)}m and receives €${row.reward.toFixed(2)}m as a flexibility reward. Its net payment is €${(row.payment-row.reward).toFixed(2)}m, excluding electricity supply and its own response costs.</p>`+select('term','Commitment duration',[[5,'5 years'],[10,'10 years'],[15,'15 years']],state.term,'The minimum billing demand applies within this term. After expiry, an open site pays for actual demand. Duration alone does not change payments without a floor.')+select('floor','Minimum billing demand',[[0,'No minimum'],[.5,'50% of agreed ramp-up capacity'],[.8,'80% of agreed ramp-up capacity']],state.floor,'The floor follows the agreed 40 / 70 / 100 MW ramp. This covers the network capacity charge, not electricity supply.')+`<p class="chain">Higher floor → payments fall less when demand is low → less revenue exposure for the utility. Below the floor, cutting ordinary billing demand no longer reduces this network charge.</p><p>${closed?'Payments stop after closure. Contractual claims are not assumed collectible.':year>state.term?'The payment floor has expired in this year.':'The floor is a commitment, not a guarantee of payment after insolvency.'}</p>`+button('homes','See the effect on existing consumers')+button('flex','Explore the flexibility incentive');
 if(selected==='network')content=`<p>The utility must recover attributable network costs. New sales help only when contributions cover the costs they create.</p><div class="stat">€${row.cost.toFixed(2)}m<small>Net network requirement in year ${year}</small></div><h3>Where does the gap come from?</h3><p>€6m annualised requirement − €${row.benefit.toFixed(1)}m useful flexibility benefit + €${row.reward.toFixed(1)}m performance reward − €${row.payment.toFixed(2)}m customer payment = <strong>€${row.gap.toFixed(2)}m net gap.</strong></p><p class="chain">${row.gap<0?'Contributions exceed the net requirement this year. The treatment of over-recovery needs a local regulatory decision.':'A payment shortfall initially exposes the utility. Whether costs pass to consumers depends on allocation and recovery rules.'}</p><h3>Who pays whom?</h3><p>Data centre → utility: €${row.payment.toFixed(2)}m network charge.<br>Utility → data centre: €${row.reward.toFixed(2)}m reward.<br>Net receipts: €${(row.payment-row.reward).toFixed(2)}m, against €${(6-row.benefit).toFixed(2)}m network costs after the assumed reduction.</p><p>The €${row.benefit.toFixed(2)}m avoided cost is not a cash payment. The gap has no assigned payer in this model. A positive gap is residual exposure; a negative gap is over-recovery.</p><h3>Committed versus avoidable costs</h3><p>Flexibility is credited only against prospective costs still avoidable. It does not undo sunk investment. The map does not erase built lines.</p>`+button('data','Change the contribution')+button('transmission','Follow the physical system');
 if(selected==='homes')content=`<p>The town shares infrastructure with Northbank Data. Its residents do not choose the data centre’s contract, but may be exposed to the consequences.</p><div class="stat">€${Math.abs(r.gap).toFixed(1)}m<small>${r.gap<0?'Net over-recovery':'Uncovered network requirement'} over 15 years</small></div><p>Starting arrangement under the same event: €${base.gap.toFixed(1)}m uncovered. Your arrangement changes the net gap by €${Math.abs(base.gap-r.gap).toFixed(1)}m ${base.gap>=r.gap?'downwards':'upwards'}.</p><h3>Who bears what?</h3><p class="chain">A stronger enforceable contribution shifts some demand risk to the data centre. It can reduce potential exposure for others, but may weaken the customer’s incentive to lower billed demand.</p><p>${closed?`After closure, total unpaid post-closure minimum-payment claims within the model horizon: €${r.claim.toFixed(1)}m. No cash recovery from these claims is assumed.`:'More electricity consumption does not automatically mean lower bills for the town.'}</p><p class="note">This is not a household bill calculation. No customer count, allocation method or pass-through rule is assumed.</p>`+button('data','Revisit the commitment')+button('flex','Preserve a useful incentive');
 if(selected==='flex')content=`<p>Northbank Data can commit to a verified 10 MW reduction during specified peaks. The battery symbol represents flexibility options; it does not assume the site owns a battery or exports electricity. This temporary response does not change ordinary billing demand in this example.</p>`+select('flex','Peak flexibility agreement',[[false,'No agreement'],[true,'Verified 10 MW response']],state.flex,'This temporary response does not change ordinary billing demand. Delivery earns a separate reward even when a payment floor binds.')+`<div class="stat">${delivered?'10 MW':failed?'Failed response':'No response'}<small>Illustrative availability in year ${year}</small></div><p class="chain">Response at the right place and time → some future network needs can be avoided → €0.6m assumed annual benefit, with €0.2m paid to the site → €0.4m reduction in the network funding requirement after the reward.</p><p>The reward is a transfer from the utility to the data centre, not an extra resource cost across both parties. The site’s own response costs are not calculated, so a reward alone does not prove participation is profitable.</p><p>These fictional benefits require a credible response and costs still avoidable. A lower kWh total alone does not prove lower network capacity needs.</p><p>${failed?'In year 6, the response fails. Both benefit and reward are zero. No extra penalty is assumed.':closed?'The closed site cannot respond or earn rewards.':'Test failure using the event control, then explore year 6.'}</p>`+button('network','Follow the cost and reward');
 if(selected==='transmission')content=`<p>Transmission moves electricity from generation towards demand. Shared lines stay in place when a customer reduces demand or closes.</p><div class="stat">${delivered?'10 MW lower peak':'No credited peak reduction'}<small>For the data centre response in year ${year}</small></div><p class="chain">A useful reduction in coincident peak can ease a system constraint. A reduction at another time or location may not defer any investment.</p><p>The animated paths are a schematic of supply towards loads, not a power-flow calculation. They do not represent alternating current, measured loading or line ratings.</p><p>Changing a payment floor changes financial contributions. It does not itself change physical demand or remove a line.</p>`+button('flex','Set a verified peak response')+button('generation','Trace electricity back to generation');
 if(selected==='generation')content=`<p>Wind and solar represent the region’s wider supply system. This illustration does not prescribe the generation mix or show that they alone can serve the site.</p><h3>Keep two questions separate</h3><p class="chain">Network contribution: who pays for connection and shared infrastructure?<br><br>Electricity supply: what energy and capacity serve the load, at what cost and risk?</p><p>This first case calculates network charges only. A lower network gap is not proof of lower total electricity-system costs.</p><p>The town remains supplied in the schematic if the data centre closes. Only the data centre branch stops animating.</p>`+button('transmission','Follow the lines')+button('data','Visit the new customer');
 renderMapOptions();
 if(selected){$('#panel-content').innerHTML=`<p class="eyebrow">${year===1?'YEAR 1':`YEAR ${year}`} / ${events[state.event]}</p><h2 id="panel-heading" tabindex="-1">${names[selected]}</h2>`+content;for(const id of ['term','floor','flex']){const el=$('#'+id);if(el)el.onchange=()=>{previousState={...state};lastChange=id;state[id]=id==='flex'?el.value==='true':Number(el.value);render();};}document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openPlace(b.dataset.go));}
 $('#metrics').innerHTML=`<div class="metrics"><div class="metric"><strong>€${Math.abs(r.gap).toFixed(1)}m</strong><span>${r.gap<0?'Net over-recovery':'Uncovered requirement'} / 15 years</span></div><div class="metric"><strong>€${r.payment.toFixed(1)}m</strong><span>Customer network payments / 15 years</span></div><div class="metric"><strong>€${(r.benefit-r.reward).toFixed(1)}m</strong><span>Network requirement reduction after rewards / 15 years</span></div></div>`;
 let cumulativeGap=0;
 $('#analysis-context').textContent=`${events[state.event]} · ${state.term}-year commitment · ${state.floor*100}% floor · flexibility ${state.flex?'agreed':'not agreed'}.`;
 $('#rows').innerHTML=r.rows.map((x,i)=>`<tr><th scope="row">${x.year}</th><td>${x.demand}</td><td>${x.cost.toFixed(2)}</td><td>${x.payment.toFixed(2)}</td><td>${base.rows[i].payment.toFixed(2)}</td><td>${x.gap.toFixed(2)}</td><td>${x.reward.toFixed(2)}</td><td>${base.rows[i].gap.toFixed(2)}</td><td>${(cumulativeGap+=x.gap).toFixed(2)}</td></tr>`).join('');
 renderPaymentChange(r);
 renderGraphs(r,base);
 $('#map-announcement').textContent=`Year ${year}. ${row.demand} MW demand, €${row.payment.toFixed(2)}m network payment, €${row.gap.toFixed(2)}m net gap. ${delivered?'10 MW response delivered.':''}`;
 if(focusId&&['term','floor','flex'].includes(focusId))$('#'+focusId)?.focus({preventScroll:true});
}



function renderGraphs(current,baseline){
 const palette=['#285f58','#ad602c','#696f84'];
 function chart(title,series){
  const W=760,H=260,L=62,R=20,T=24,B=42;
  const vals=series.flatMap(s=>s.values),lo=Math.min(0,...vals),hi=Math.max(1,...vals),range=hi-lo;
  const x=i=>L+i*(W-L-R)/14,y=v=>T+(hi-v)/range*(H-T-B);
  const ticks=Array.from({length:5},(_,i)=>lo+range*i/4);
  const grid=ticks.map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#cbd6bf"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end">${v.toFixed(1)}</text>`).join('');
  const lines=series.map((s,j)=>`<polyline fill="none" stroke="${palette[j]}" stroke-width="3" ${j===2?'stroke-dasharray="8 5"':''} points="${s.values.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>`+s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${palette[j]}"><title>${s.name}, year ${i+1}: €${v.toFixed(2)}m</title></circle>`).join('')).join('');
  return `<figure><figcaption>${title}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}. Exact annual values are available in the table below."><g font-family="system-ui" font-size="11" fill="#47614c">${grid}<text x="10" y="14">€m</text>${[0,2,4,6,8,10,12,14].map(i=>`<text x="${x(i)}" y="${H-20}" text-anchor="middle">${i+1}</text>`).join('')}<text x="${W-20}" y="${H-3}" text-anchor="end">Year</text><line x1="${x(year-1)}" x2="${x(year-1)}" y1="${T}" y2="${H-B}" stroke="#8e965b" stroke-dasharray="3 5"/>${lines}</g></svg><div class="chart-legend">${series.map((s,j)=>`<span><i style="background:${palette[j]}"></i>${s.name}${j===2?' (dashed)':''}</span>`).join('')}</div></figure>`;
 }
 let acc=0,baseAcc=0;
 $('#graphs').innerHTML=chart('Annual network requirements and payments',[
 {name:'Your network payment',values:current.rows.map(r=>r.payment)},
 {name:'Net network requirement',values:current.rows.map(r=>r.cost)},
 {name:'Starting network payment',values:baseline.rows.map(r=>r.payment)}])+chart('Cumulative unallocated network costs',[
 {name:'Your arrangement',values:current.rows.map(r=>acc+=r.gap)},
 {name:'Starting arrangement',values:baseline.rows.map(r=>baseAcc+=r.gap)}]);
}

function renderMapOptions(){
 const popup=$('#map-options');
 popup.hidden=!['data','flex'].includes(selected);
 if(popup.hidden)return;
 const location=locations.find(l=>l.id===selected);
 popup.style.left=`clamp(12px, ${location.x}% - 125px, 100% - 270px)`;
 popup.style.top=selected==='data'?'35%':'43%';
 popup.innerHTML=`<p class="eyebrow">${selected==='data'?'NORTHBANK DATA / YOUR CHOICES':'FLEXIBILITY / YOUR CHOICE'}</p>`+(selected==='data'?
 choiceSelect('term','Commitment',[[5,'5 years'],[10,'10 years'],[15,'15 years']],state.term,'')+
 choiceSelect('floor','Minimum billing demand',[[0,'No floor'],[.5,'50% of agreed capacity'],[.8,'80% of agreed capacity']],state.floor,''):
 choiceSelect('flex','Peak response',[[false,'No agreement'],[true,'Verified 10 MW response']],state.flex,''))+`<p class="map-option-hint">Change a choice here. See payment changes at the Lowlands desk and explore effects on the right.</p>`;
}

function renderPaymentChange(result){
 const before=calculate(previousState||state),old=before.rows[year-1],now=result.rows[year-1];
 const money=n=>`${n<0?'−':''}€${Math.abs(n).toFixed(2)}m`;
 const labels={floor:'Minimum billing demand changed',term:'Commitment duration changed',flex:'Flexibility agreement changed',event:'Event changed'};
 const cards=[['Network payment to utility',old.payment,now.payment],['Flexibility reward to data centre',old.reward,now.reward],['Unallocated network costs',old.gap,now.gap]];
 const cardHTML=cards.map(([label,a,b])=>{const d=b-a,changed=Math.abs(d)>1e-8;return `<div class="change-card ${changed?'changed':''}"><span>${label} · year ${year}</span><strong>${money(a)} → ${money(b)}</strong><span class="difference">${changed?`${money(Math.abs(d))} ${d>0?'higher':'lower'}`:'No change'}</span></div>`;}).join('');
 let reason='Change a commitment or test an event to see the before-and-after amounts. A payment floor matters only when it exceeds actual billing demand.';
 if(lastChange==='floor')reason=now.demand===0?'The site is closed, so no cash payment is assumed, even if there is a minimum-payment claim.':year>state.term?'The payment floor has expired in this year. Move to a year within the commitment to see its effect.':Math.abs(now.payment-old.payment)<1e-8?'Actual billing demand is already at or above the applicable floor, so changing the floor does not change this year’s payment. Test slower growth to see when it binds.':'The floor changes billed MW while physical demand stays the same. The utility receives a different network payment; below the floor, reducing ordinary demand no longer reduces this charge.';
 if(lastChange==='term')reason=state.floor===0?'Duration alone creates no minimum payment. Set a payment floor and test slower growth, then explore a year after the shorter term expires.':Math.abs(now.payment-old.payment)<1e-8?'Duration changes how long the floor applies, but it does not change payment in this selected year. Move the year control across the two expiry dates.':'The longer or shorter term changes whether the floor applies in this year. After expiry, an open site pays for actual billing demand.';
 if(lastChange==='flex')reason=now.demand===0?'A closed site cannot deliver a response or earn a reward. Network payments also remain zero.':state.event==='failed'&&year===6?'The response fails in year 6. No flexibility benefit or performance reward is credited in that year.':'The ordinary network payment stays separate from the peak response. Delivered flexibility earns a reward and reduces assumed avoidable costs; both affect the net requirement.';
 if(lastChange==='event')reason=state.event==='closure'?'Closure stops cash payments and flexibility after year 5, while network costs remain. Unpaid contractual claims are not treated as cash.':state.event==='slow'?'Lower demand changes actual billing MW. A minimum billing demand can preserve part of the payment; the underlying fixed network requirement remains.':state.event==='failed'?'In year 6 the failed response earns no reward and creates no assumed avoided cost. Failure changes no ordinary network payment.':'Expected growth restores the planned demand path. Payment depends on actual demand or the applicable floor, whichever is higher.';
 $('#payment-change').innerHTML=`<p class="eyebrow">LOWLANDS / DECISION DESK</p><div class="change-head"><h2>${previousState?labels[lastChange]:'Watch the payments'}</h2><p>${previousState?`Before your last assumption change → now, both evaluated in year ${year}`:'Current arrangement · change one assumption at a time'}</p></div><div class="change-cards">${cardHTML}</div><p class="change-reason">${reason}</p><p class="note">Town exposure depends on local cost allocation. Figures are illustrative; negative gaps mean over-recovery.</p>`;
 if($('#panel-change'))$('#panel-change').innerHTML=previousState?`<p class="eyebrow">LAST CHANGE / YEAR ${year}</p><strong>Network payment: ${money(old.payment)} → ${money(now.payment)}</strong><p>Flexibility reward: ${money(old.reward)} → ${money(now.reward)}<br>Net uncovered requirement: ${money(old.gap)} → ${money(now.gap)}</p><p>${reason}</p>`:'<p>Change one assumption and the payment difference will appear here.</p>';
 const dataChanged=previousState&&(Math.abs(now.payment-old.payment)>1e-8||Math.abs(now.reward-old.reward)>1e-8);
 const networkChanged=previousState&&Math.abs(now.gap-old.gap)>1e-8;
 document.querySelector('[data-place="data"]').classList.toggle('changed-payment',!!dataChanged);
 document.querySelector('[data-place="network"]').classList.toggle('changed-payment',!!networkChanged);
 $('#payment-path').classList.toggle('payment-flash',!!dataChanged);
}

locations.forEach(l=>document.querySelector(`[data-place="${l.id}"]`).onclick=()=>openPlace(l.id));
$('#close-panel').onclick=()=>{const previous=selected;selected=null;$('#inspector').hidden=true;$('#map-options').hidden=true;render();document.querySelector(`[data-place="${previous}"]`)?.focus({preventScroll:true});};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#inspector').hidden)$('#close-panel').click();});
$('#start').onclick=()=>openPlace('data');
$('#case-toggle').onclick=()=>{const show=$('#case').hidden;$('#case').hidden=!show;$('#case-toggle').setAttribute('aria-expanded',String(show));};
$('#event').onchange=e=>{previousState={...state};lastChange='event';state.event=e.target.value;if(state.event==='closure'||state.event==='failed')year=6;else year=3;render();};
$('#year').oninput=e=>{year=Number(e.target.value);render();};
$('#reset').onclick=()=>{state={term:5,floor:0,flex:false,event:'expected'};year=3;selected=null;previousState=null;lastChange='';$('#event').value='expected';$('#inspector').hidden=true;$('#case').hidden=false;$('#case-toggle').setAttribute('aria-expanded','true');document.querySelectorAll('textarea').forEach(t=>t.value='');render();};
$('#print').onclick=()=>{document.body.classList.add('printing-reflection');window.print();document.body.classList.remove('printing-reflection');};
$('#download').onclick=()=>{const r=calculate(state);const text=`Gridtown reflection\nFictional case; illustrative figures\n\nChoices: ${state.term} years; ${state.floor*100}% minimum billing demand; flexibility ${state.flex?'yes':'no'}\nEvent: ${events[state.event]}\n${r.gap<0?'Over-recovery':'Uncovered requirement'}: €${Math.abs(r.gap).toFixed(1)}m over 15 years\n\n`+questions.map((q,i)=>q+'\n'+$('#q'+i).value).join('\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='gridtown-reflection.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
