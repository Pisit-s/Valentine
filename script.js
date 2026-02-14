// =========================================================
// CONFIG
// =========================================================
const CONFIG = {
    passcode: "1178",
    textToMorph: "Love U", 
    
    particleCount: 6000, 
    particleSize: 18,    
    
    // ใส่ Link รูปภาพ 49 รูป
    photos: [
        './images/image1.png', './images/image2.png',
        './images/image3.png', './images/image4.png',
        './images/image5.png', './images/image6.png',
        './images/image7.png', './images/image8.png',
        './images/image9.png', './images/image10.png',
        './images/image11.png', './images/image12.png',
        './images/image13.png', './images/image14.png',
        './images/image15.jpg', './images/image16.jpg',
        './images/image17.jpg', './images/image18.jpg',
        './images/image19.jpg', './images/image20.jpg',
        './images/image21.jpg', './images/image22.jpg', 
        './images/image23.jpg', './images/image24.jpg',
        './images/image25.jpg', './images/image26.jpg',
        './images/image27.jpg', './images/image28.jpg',
        './images/image29.jpg', './images/image30.jpg',
        './images/image31.jpg', './images/image32.jpg',
        './images/image33.jpg', './images/image34.jpg',
        './images/image35.jpg', './images/image36.jpg',
        './images/image37.jpg', './images/image38.jpg',
        './images/image39.jpg', './images/image40.jpg',
        './images/image41.jpg', './images/image42.jpg',
        './images/image43.jpg', './images/image44.jpg',
        './images/image45.jpg', './images/image46.jpg',
        './images/image47.jpg', './images/image48.jpg',
        './images/image49.jpg'
    ],
    
    storyLines: [
        { text: "> Loading kernel modules...", speed: 30, delay: 500 },
        { text: "> Searching for 'SOULMATE'...", speed: 30, delay: 1000 },
        { text: "> Match found: 100%", speed: 30, delay: 800 },
        { text: "> Accessing memories...", speed: 40, delay: 1000 },
        { text: "\n[SYSTEM LOG]:", speed: 20, delay: 500 },
        { text: "จำวันแรกที่เราเจอกันได้ไหม?", speed: 80, delay: 1500 },
        { text: "วันนั้นผมไม่คิดเลยว่า...", speed: 80, delay: 1500 },
        { text: "คนๆ นี้จะกลายเป็นโลกทั้งใบของผม", speed: 100, delay: 2000 },
        { text: "\n> WARNING: High level of love detected!", speed: 20, delay: 1000 },
        { text: "> Executing 'VALENTINE.exe'...", speed: 30, delay: 1000 },
        { text: "พร้อมนะ... 3... 2... 1...", speed: 100, delay: 500 },
    ],

    blessingLines: [
        "> Checking heart status... Stable.",
        "> Loading final message...",
        "> --------------------------------",
        "> ขอบคุณที่อยู่ข้างกันเสมอมานะ",
        "> ขอให้ปีนี้เป็นปีที่ดีของเราสองคน",
        "> รักเสมอและตลอดไป...",
        "> --------------------------------",
        "> End of line."
    ]
};

// =========================================================
// VARS
// =========================================================
let scene, camera, renderer, particles, geometry, material, photoGroup;
const targets = { sphere: [], heart: [], text: [], galaxy: [] };
let currentShape = 'sphere', clickCount = 0;
let raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(), interactables = [];
const music = document.getElementById('bg-music');
let lovePower = 0; let holdInterval; let isHolding = false;

// --- 1. BOOT SEQUENCE ---
const startBtn = document.getElementById('start-btn');
const consoleOutput = document.getElementById('console-output');

startBtn.addEventListener('click', async () => {
    music.volume = 0.5; music.play().catch(e => console.log("Audio needed"));
    startBtn.style.display = 'none'; consoleOutput.style.display = 'block';
    for (let line of CONFIG.storyLines) { await typeLine(line.text, line.speed); await wait(line.delay); }
    gsap.to('#console-layer', { duration: 1, opacity: 0, onComplete: () => {
        document.getElementById('console-layer').style.display = 'none';
        const secLayer = document.getElementById('security-layer'); secLayer.style.display = 'flex';
        gsap.to(secLayer, { duration: 1, opacity: 1 }); document.getElementById('pass-input').focus();
    }});
});

function typeLine(text, speed) { return new Promise(resolve => { let i = 0; const div = document.createElement('div'); div.className = 'log-line'; consoleOutput.appendChild(div); consoleOutput.scrollTop = consoleOutput.scrollHeight; function typeChar() { if (i < text.length) { div.textContent += text.charAt(i); i++; setTimeout(typeChar, speed); } else { resolve(); } } typeChar(); }); }
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- 2. PASSWORD ---
document.getElementById('pass-input').addEventListener('keyup', (e) => {
    if(e.target.value === CONFIG.passcode) {
        e.target.style.borderColor = "#00ff00"; e.target.style.color = "#00ff00";
        document.querySelector('.lock-icon').innerHTML = "🔓";
        setTimeout(() => {
            gsap.to('#security-layer', { duration: 1, opacity: 0, onComplete: () => {
                document.getElementById('security-layer').style.display = 'none'; initThreeJS();
            }});
        }, 1000);
    }
});

// --- 3. THREE.JS ---
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); scene.fog = new THREE.FogExp2(0x000000, 0.0003);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 8000); camera.position.z = 1000;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    generateSphereTargets(); generateBeautifulHeartTargets(); generateTextTargets(CONFIG.textToMorph); generateGalaxyTargets();
    const sprite = createParticleTexture();
    geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(CONFIG.particleCount * 3);
    const colArray = new Float32Array(CONFIG.particleCount * 3);
    const colorObj = new THREE.Color();

    for(let i=0; i<CONFIG.particleCount; i++) {
        posArray[i*3] = (Math.random()-0.5)*2500; posArray[i*3+1] = (Math.random()-0.5)*2500; posArray[i*3+2] = (Math.random()-0.5)*2500;
        colorObj.setHSL(0, 1.0, 0.5 + Math.random()*0.3);
        colArray[i*3] = colorObj.r; colArray[i*3+1] = colorObj.g; colArray[i*3+2] = colorObj.b;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    material = new THREE.PointsMaterial({ size: CONFIG.particleSize, map: sprite, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 1.0 });
    particles = new THREE.Points(geometry, material); scene.add(particles);
    createPhotos(); morphTo('sphere'); animate();
    window.addEventListener('click', onCanvasClick);
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}

function createParticleTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64; 
    const ctx = canvas.getContext('2d'); const grad = ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.8)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64); return new THREE.CanvasTexture(canvas);
}

// --- INTERACTION ---
function onCanvasClick(e) {
    if(currentShape === 'gallery') {
        mouse.x = (e.clientX/window.innerWidth)*2-1; mouse.y = -(e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables);
        if(intersects.length > 0) { openPopup(intersects[0].object.userData.url); return; }
    }
    if(currentShape === 'final-heart' || currentShape === 'flowers' || currentShape === 'final-console') return;
    clickCount++;
    const shapes = ['heart', 'text', 'gallery', 'sphere', 'final-heart']; 
    let shapeName = (clickCount <= shapes.length) ? shapes[clickCount-1] : 'final-heart';
    morphTo(shapeName);
}

function morphTo(shape) {
    currentShape = shape;
    if(shape === 'gallery') {
        gsap.to(material, {opacity:0, duration:1}); photoGroup.visible = true;
        gsap.to(photoGroup.scale, {x:1, y:1, z:1, duration:2, ease:"back.out(1.7)"});
        transitionParams.target = targets.galaxy; gsap.to(transitionParams, {duration:2, progress:1});
    } else if(shape === 'final-heart') {
        gsap.to(photoGroup.scale, {x:0, y:0, z:0, duration:1, onComplete:()=>{photoGroup.visible=false;}});
        gsap.to(material, {opacity:0, duration:1});
        const finalLayer = document.getElementById('final-heart-layer'); 
        finalLayer.classList.add('active'); 
        gsap.to(finalLayer, {opacity:1, duration:2});
    } else if(shape === 'sphere') {
        gsap.to(photoGroup.scale, {x:0, y:0, z:0, duration:1, onComplete:()=>{photoGroup.visible=false;}});
        gsap.to(material, {opacity:1, duration:1}); transitionParams.progress = 0; transitionParams.source = Float32Array.from(geometry.attributes.position.array); transitionParams.target = targets.sphere; gsap.to(transitionParams, {duration:2.5, progress:1, ease:"power2.inOut"});
    } else {
        gsap.to(photoGroup.scale, {x:0, y:0, z:0, duration:1, onComplete:()=>{photoGroup.visible=false;}});
        gsap.to(material, {opacity:1, duration:1}); transitionParams.progress = 0; transitionParams.source = Float32Array.from(geometry.attributes.position.array); transitionParams.target = targets[shape]; gsap.to(transitionParams, {duration:2.5, progress:1, ease:"power2.inOut"});
    }
}

// *** GAME LOGIC ***
const heartBtn = document.getElementById('heart-btn');
const startEvents = ['mousedown', 'touchstart']; const endEvents = ['mouseup', 'touchend', 'mouseleave'];
startEvents.forEach(evt => heartBtn.addEventListener(evt, (e) => { if(e.cancelable && evt === 'touchstart') e.preventDefault(); startHold(); }));
endEvents.forEach(evt => document.addEventListener(evt, () => { if(isHolding) endHold(); }));

function startHold() { if(currentShape !== 'final-heart') return; isHolding = true; heartBtn.classList.add('holding'); clearInterval(holdInterval); holdInterval = setInterval(() => { lovePower += 2; updateLoveMeter(); }, 30); }
function endHold() { isHolding = false; heartBtn.classList.remove('holding'); clearInterval(holdInterval); holdInterval = setInterval(() => { if(lovePower > 0 && !isHolding) { lovePower -= 1; updateLoveMeter(); } else { clearInterval(holdInterval); } }, 30); }
function updateLoveMeter() { if(lovePower >= 100) { lovePower = 100; clearInterval(holdInterval); showFlowers(); } document.getElementById('p-fill').style.width = lovePower + "%"; document.getElementById('heart-status').innerText = "LOVE POWER: " + lovePower + "%"; }

function showFlowers() {
    currentShape = 'flowers';
    gsap.to('#final-heart-layer', {opacity:0, duration:1, onComplete:()=>{
        document.getElementById('final-heart-layer').style.display='none';
        const flowers = document.getElementById('flower-world'); 
        flowers.style.display='flex';
        flowers.classList.remove('flower-paused');
        gsap.to(flowers, {opacity:1, duration:3});
        setTimeout(() => {
            const overlay = document.getElementById('valentine-overlay'); overlay.style.display = 'flex';
            gsap.to(overlay, { opacity: 1, duration: 2 });
            gsap.to('#next-chapter-btn', { opacity: 1, delay: 1, duration: 1 });
        }, 4000);
    }});
}

function goToFinalMessage() {
    currentShape = 'final-console';
    gsap.to('#flower-world', { opacity: 0, duration: 1.5, onComplete: () => {
        document.getElementById('flower-world').style.display = 'none';
        document.getElementById('final-console-layer').style.display = 'flex';
        typeWriterEffect();
    }});
}

async function typeWriterEffect() {
    const container = document.getElementById('final-text-container');
    container.innerHTML = ''; 

    for (let line of CONFIG.blessingLines) {
        const div = document.createElement('div'); div.className = 'final-line'; container.appendChild(div);
        for (let char of line) { div.textContent += char; await new Promise(r => setTimeout(r, 30)); }
        await new Promise(r => setTimeout(r, 400));
    }
    await new Promise(r => setTimeout(r, 3000));
    gsap.to('#final-console-layer', { opacity: 0, duration: 2, onComplete: () => {
        document.getElementById('final-console-layer').style.display = 'none';
        document.getElementById('final-console-layer').style.opacity = 1;
        container.innerHTML = '';
        
        lovePower = 0; document.getElementById('p-fill').style.width = "0%"; document.getElementById('heart-status').innerText = "HOLD TO FILL LOVE"; heartBtn.classList.remove('holding');
        clickCount = 0; morphTo('sphere');
    }});
}

function openPopup(url) { document.getElementById('popup-img').src=url; document.getElementById('popup-overlay').style.display='flex'; }
function closePopup() { document.getElementById('popup-overlay').style.display='none'; }

// --- MATH (SPHERE FOR 49 PHOTOS) ---
const transitionParams = { progress: 0, source: [], target: [] };
function generateSphereTargets() { for(let i=0;i<CONFIG.particleCount;i++){ const r=800, t=Math.random()*Math.PI*2, p=Math.acos((Math.random()*2)-1); targets.sphere.push(r*Math.sin(p)*Math.cos(t), r*Math.sin(p)*Math.sin(t), r*Math.cos(p)); }}
function generateBeautifulHeartTargets() { const scale=35, thickness=120; for(let i=0; i<CONFIG.particleCount; i++) { const t=Math.random()*Math.PI*2, r=Math.sqrt(Math.random()); const x = 16*Math.pow(Math.sin(t),3) * r * scale; const y = (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)) * r * scale; const z = (Math.random()-0.5) * 2 * thickness * Math.cos(r*Math.PI/2); targets.heart.push(x, y, z); } }
function generateTextTargets(text) { const c=document.createElement('canvas'), ctx=c.getContext('2d'); c.width=1600; c.height=400; ctx.font='Bold 250px Arial'; ctx.fillStyle='white'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text, c.width/2, c.height/2); const data=ctx.getImageData(0,0,c.width,c.height).data, valid=[]; for(let y=0;y<c.height;y+=5) for(let x=0;x<c.width;x+=5) if(data[(y*c.width+x)*4]>128) valid.push({x:(x-c.width/2)*2.5, y:-(y-c.height/2)*2.5, z:(Math.random()-0.5)*150}); if(valid.length===0) for(let i=0;i<CONFIG.particleCount;i++) valid.push({x:0,y:0,z:0}); for(let i=0;i<CONFIG.particleCount;i++) { const p=valid[i%valid.length]; targets.text.push(p.x, p.y, p.z); } }
function generateGalaxyTargets() { for(let i=0;i<CONFIG.particleCount;i++) targets.galaxy.push((Math.random()-0.5)*6000, (Math.random()-0.5)*6000, (Math.random()-0.5)*6000); }

// ** UPDATED PHOTO SPHERE LOGIC (For 49 photos) **
function createPhotos() { 
    photoGroup = new THREE.Group(); photoGroup.scale.set(0,0,0); photoGroup.visible=false; scene.add(photoGroup); 
    const loader = new THREE.TextureLoader(); const radius = 900;
    CONFIG.photos.forEach((url, i) => {
        const phi = Math.acos( -1 + ( 2 * i ) / CONFIG.photos.length );
        const theta = Math.sqrt( CONFIG.photos.length * Math.PI ) * phi;
        const x = radius * Math.cos( theta ) * Math.sin( phi );
        const y = radius * Math.sin( theta ) * Math.sin( phi );
        const z = radius * Math.cos( phi );
        const geo = new THREE.PlaneGeometry(140, 200); 
        
        // Add fallback color (white) in case texture fails to load
        const mat = new THREE.MeshBasicMaterial({ 
            map: loader.load(url), 
            side: THREE.DoubleSide,
            color: 0xffffff // Fallback color
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z); mesh.lookAt(0,0,0);
        const border = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color: 0xff0000}));
        mesh.add(border); mesh.userData = { url: url };
        photoGroup.add(mesh); interactables.push(mesh);
    });
}
function animate() { requestAnimationFrame(animate); if(currentShape!=='gallery' && currentShape!=='final-heart' && currentShape!=='flowers' && currentShape!=='final-console'){ const pos=geometry.attributes.position.array; if(transitionParams.progress<1 && transitionParams.target.length>0){ for(let i=0;i<CONFIG.particleCount;i++){ const idx=i*3; pos[idx] = transitionParams.source[idx] + (transitionParams.target[idx]-transitionParams.source[idx])*transitionParams.progress; pos[idx+1] = transitionParams.source[idx+1] + (transitionParams.target[idx+1]-transitionParams.source[idx+1])*transitionParams.progress; pos[idx+2] = transitionParams.source[idx+2] + (transitionParams.target[idx+2]-transitionParams.source[idx+2])*transitionParams.progress; } geometry.attributes.position.needsUpdate=true; } particles.rotation.y=Date.now()*0.0001; particles.rotation.x=Math.sin(Date.now()*0.0002)*0.1; } else if(currentShape==='gallery') photoGroup.rotation.y+=0.001; renderer.render(scene, camera); }