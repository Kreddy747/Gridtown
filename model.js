export const assumptions = {years:15, annualRequirement:6, pricePerMW:0.06, flexibilityBenefit:0.6, flexibilityReward:0.2};
export function calculate({term=5,floor=0,flex=false,event='expected'}={}) {
 const a=assumptions;
 const rows=Array.from({length:a.years},(_,i)=>{
  const year=i+1, agreed=[40,70,100][Math.min(i,2)];
  let demand=event==='slow'?[30,40,50][Math.min(i,2)]:agreed;
  if(event==='closure'&&year>5)demand=0;
  const active=demand>0;
  const billed=active?Math.max(demand,year<=term?agreed*floor:0):0;
  // No post-closure recovery assumed. The claim is separate from cash received.
  const claim=!active&&year<=term?agreed*floor*a.pricePerMW:0;
  const delivered=flex&&active&&!(event==='failed'&&year===6);
  const benefit=delivered?a.flexibilityBenefit:0;
  const reward=delivered?a.flexibilityReward:0;
  const cost=a.annualRequirement-benefit+reward;
  const payment=billed*a.pricePerMW;
  return {year,agreed,demand,billed,claim,benefit,reward,cost,payment,gap:cost-payment};
 });
 const sum=k=>rows.reduce((s,r)=>s+r[k],0);
 return {rows,cost:sum('cost'),payment:sum('payment'),gap:sum('gap'),claim:sum('claim'),benefit:sum('benefit'),reward:sum('reward')};
}
