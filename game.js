(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const ui = { lap: document.querySelector('#lap'), time: document.querySelector('#time'), best: document.querySelector('#best'), banner: document.querySelector('#banner'), start: document.querySelector('#start') };
  const W = 960, H = 540, cx = 480, cy = 280, ox = 420, oy = 225, ix = 245, iy = 115;
  const keys = new Set(); let running = false, raceStart = 0, elapsed = 0, last = 0, lap = 1, armed = false, previousPhase = -Math.PI / 2, shakes = 0;
  const bestKey = 'arcticKartBestTime'; const savedBest = Number(localStorage.getItem(bestKey) || 0); let best = savedBest;
  const kart = { x: 480, y: 70, vx: 0, vy: 0, a: 0, spin: 0, boost: 0, patchLock: 0 };
  const particles = []; const flakes = Array.from({ length: 100 }, () => ({ x: Math.random()*W, y: Math.random()*H, r: 1+Math.random()*2, s: 15+Math.random()*40 }));
  const patches = [ {x: 745,y:145,r:48,type:'boost'}, {x: 230,y:380,r:45,type:'boost'}, {x: 670,y:438,r:40,type:'spin'}, {x: 235,y:155,r:38,type:'spin'} ];

  function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W*dpr; canvas.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled = false; }
  resize(); addEventListener('resize', resize);
  addEventListener('keydown', e => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault(); keys.add(e.key.toLowerCase()); if (!running && e.key === 'Enter') start(); });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase())); ui.start.addEventListener('click', start);
  function down(...k) { return k.some(v => keys.has(v)); }
  function fmt(ms) { if (!ms) return '--:--.---'; const m=Math.floor(ms/60000), s=Math.floor(ms/1000)%60, z=Math.floor(ms%1000); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(z).padStart(3,'0')}`; }
  function trackAt(x,y) { const dx=x-cx, dy=y-cy; const outer=(dx*dx)/(ox*ox)+(dy*dy)/(oy*oy); const inner=(dx*dx)/(ix*ix)+(dy*dy)/(iy*iy); return outer < 1 && inner > 1; }
  function spawnSnow(n, power=1) { for(let i=0;i<n;i++) particles.push({ x:kart.x+(Math.random()-.5)*18, y:kart.y+(Math.random()-.5)*12, vx:-Math.cos(kart.a)*(25+Math.random()*65)*power+(Math.random()-.5)*24, vy:-Math.sin(kart.a)*(25+Math.random()*65)*power+(Math.random()-.5)*24, life:.35+Math.random()*.45, max:1, r:2+Math.random()*3 }); }
  function resetKart() { Object.assign(kart,{x:480,y:70,vx:0,vy:0,a:0,spin:0,boost:0,patchLock:0}); }
  function start() { running=true; raceStart=performance.now(); elapsed=0; lap=1; armed=false; previousPhase=-Math.PI/2; resetKart(); ui.banner.classList.add('hidden'); }
  function finish() { running=false; if (!best || elapsed < best) { best=elapsed; localStorage.setItem(bestKey, String(best)); } ui.best.textContent=fmt(best); ui.banner.innerHTML=`<h1>RACE COMPLETE!</h1><p>${fmt(elapsed)} ${elapsed===best ? '· NEW BEST!' : ''}</p><button id="start">RACE AGAIN</button>`; ui.banner.classList.remove('hidden'); document.querySelector('#start').addEventListener('click', start); }
  function physics(dt) {
    if (!running) return;
    elapsed=performance.now()-raceStart; const throttle=down('arrowup','w'), brake=down('arrowdown','s'), left=down('arrowleft','a'), right=down('arrowright','d'), drift=down(' ');
    const fx=Math.cos(kart.a), fy=Math.sin(kart.a); let forward=kart.vx*fx+kart.vy*fy; let side=-kart.vx*fy+kart.vy*fx;
    if (throttle) forward += (kart.boost>0 ? 590 : 380)*dt; if(brake) forward -= 290*dt;
    const steering=(left?-1:0)+(right?1:0); const grip=drift ? .34 : .9;
    if (Math.abs(forward)>8) kart.a += steering * (drift ? 2.15 : 1.7) * Math.sign(forward) * Math.min(1,Math.abs(forward)/100)*dt;
    side *= Math.max(0, 1-(drift ? 1.25 : 8.3)*dt); forward *= Math.max(0, 1-(drift ? .32 : 1.05)*dt);
    if (!throttle && !brake) forward *= Math.max(0,1-.38*dt); if (drift && Math.abs(forward)>90 && steering) spawnSnow(2,1.2);
    kart.spin *= Math.max(0,1-1.5*dt); kart.a += kart.spin*dt;
    kart.vx=fx*forward-fy*side; kart.vy=fy*forward+fx*side; kart.x+=kart.vx*dt; kart.y+=kart.vy*dt; kart.boost=Math.max(0,kart.boost-dt); kart.patchLock=Math.max(0,kart.patchLock-dt);
    if ((throttle || drift) && Math.abs(forward)>45 && Math.random()<.48) spawnSnow(1,.55);
    if (!trackAt(kart.x,kart.y)) { const dx=kart.x-cx,dy=kart.y-cy, out=dx*dx/(ox*ox)+dy*dy/(oy*oy), inn=dx*dx/(ix*ix)+dy*dy/(iy*iy); const scale=out>=1 ? .978/Math.sqrt(out) : 1.025/Math.sqrt(inn); kart.x=cx+dx*scale; kart.y=cy+dy*scale; kart.vx*=-.36; kart.vy*=-.36; shakes=.2; spawnSnow(16,1.8); }
    for (const p of patches) if (!kart.patchLock && Math.hypot(kart.x-p.x,kart.y-p.y)<p.r) { kart.patchLock=.8; if(p.type==='boost'){ kart.boost=1.25; forward+=150; kart.vx+=fx*150; kart.vy+=fy*150; } else { kart.spin=(Math.random()>.5?1:-1)*7.5; kart.vx*=.64;kart.vy*=.64; shakes=.4; } spawnSnow(20,1.5); }
    const phase=Math.atan2((kart.y-cy)/oy,(kart.x-cx)/ox); if (phase > .5 && phase < 2.65) armed=true; if (armed && previousPhase < -1.58 && phase >= -1.58) { lap++; armed=false; if(lap>3) finish(); } previousPhase=phase;
  }
  function circle(x,y,r,fill,stroke) { ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();} }
  function drawTrack() { ctx.fillStyle='#dff7ff';ctx.fillRect(0,0,W,H); // frozen land
    // snow texture
    ctx.fillStyle='#caeffa'; for(let i=0;i<180;i++) ctx.fillRect((i*73)%W,(i*137)%H,2,2);
    ctx.beginPath();ctx.ellipse(cx,cy,ox,oy,0,0,Math.PI*2);ctx.fillStyle='#527c9d';ctx.fill();ctx.lineWidth=8;ctx.strokeStyle='#f8ffff';ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx,cy,ix,iy,0,0,Math.PI*2);ctx.fillStyle='#d7f5fb';ctx.fill();ctx.strokeStyle='#f8ffff';ctx.stroke();
    ctx.setLineDash([12,15]);ctx.lineWidth=2;ctx.strokeStyle='#8bc8e1';ctx.beginPath();ctx.ellipse(cx,cy,(ox+ix)/2,(oy+iy)/2,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // checkered line at the top
    for(let i=0;i<8;i++) for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#12233e':'#fff';ctx.fillRect(440+i*10,58+j*10,10,10);}
    ctx.fillStyle='#103752';ctx.font='10px "Press Start 2P"';ctx.fillText('START',430,48);
    patches.forEach(p=>{ circle(p.x,p.y,p.r,p.type==='boost'?'#57eaff99':'#9a63e6a8',p.type==='boost'?'#bffcff':'#e0b9ff'); ctx.strokeStyle=p.type==='boost'?'#d1ffff':'#efd6ff';ctx.lineWidth=2; for(let i=-p.r+10;i<p.r;i+=12){ctx.beginPath();ctx.moveTo(p.x+i,p.y-p.r*.55);ctx.lineTo(p.x+i+10,p.y+p.r*.55);ctx.stroke();} });
  }
  function drawKart() { ctx.save();ctx.translate(kart.x+(shakes? (Math.random()-.5)*shakes*10:0),kart.y);ctx.rotate(kart.a);ctx.fillStyle='#122238';ctx.fillRect(-16,-12,32,24);ctx.fillStyle='#ff405d';ctx.fillRect(-13,-10,25,20);ctx.fillStyle='#ff7c83';ctx.fillRect(-6,-8,12,16);ctx.fillStyle='#d6fbff';ctx.fillRect(2,-7,9,14);ctx.fillStyle='#202b45';ctx.fillRect(-19,-14,7,8);ctx.fillRect(-19,6,7,8);ctx.fillRect(11,-14,7,8);ctx.fillRect(11,6,7,8);ctx.fillStyle='#fff';ctx.fillRect(14,-4,4,8); if(kart.boost>0){ctx.fillStyle='#8cfeff';ctx.fillRect(-29,-5,12,10);ctx.fillStyle='#fff';ctx.fillRect(-35,-2,8,4);}ctx.restore(); }
  function draw() { ctx.clearRect(0,0,W,H);drawTrack(); for(const f of flakes){f.y+=f.s/60;if(f.y>H){f.y=0;f.x=Math.random()*W;}circle(f.x,f.y,f.r,'#ffffffa8');} for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=1/60;p.x+=p.vx/60;p.y+=p.vy/60;p.vy+=10/60;circle(p.x,p.y,p.r*p.life/.8,`rgba(245,255,255,${Math.max(0,p.life)})`);if(p.life<=0)particles.splice(i,1);}drawKart(); }
  function frame(now) { const dt=Math.min(.033,(now-last||now)/1000);last=now;physics(dt);draw();ui.lap.textContent=`${Math.min(lap,3)} / 3`;ui.time.textContent=fmt(elapsed);ui.best.textContent=fmt(best);shakes=Math.max(0,shakes-dt);requestAnimationFrame(frame); } requestAnimationFrame(frame);
})();
