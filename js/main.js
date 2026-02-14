// =========================================================
// GLOBAL VARIABLES & SETUP
// ประกาศตัวแปรหลักที่จะใช้ทั่วทั้งโปรแกรม
// =========================================================
let scene, camera, renderer, particles, geometry, material, photoGroup;
const targets = { sphere: [], heart: [], text: [], galaxy: [] }; // เก็บตำแหน่งจุดของแต่ละรูปร่าง
let currentShape = 'sphere'; // รูปร่างปัจจุบัน
let clickCount = 0; // นับจำนวนครั้งที่คลิกเพื่อเปลี่ยนฉาก

// ตัวแปรสำหรับการคลิกและ Interaction
let raycaster = new THREE.Raycaster(); // ใช้ยิงแสงเช็คว่าเมาส์ชี้โดนอะไร
let mouse = new THREE.Vector2(); 
let interactables = []; // รายการวัตถุที่คลิกได้ (รูปภาพ)

// ตัวแปรเสียงและเกมกดหัวใจ
const music = document.getElementById('bg-music');
let lovePower = 0; 
let holdInterval; 
let isHolding = false;

// =========================================================
// 1. BOOT SEQUENCE (หน้าจอ Console เริ่มต้น)
// =========================================================
const startBtn = document.getElementById('start-btn');
const consoleOutput = document.getElementById('console-output');

startBtn.addEventListener('click', async () => {
    // เริ่มเล่นเพลงเมื่อกดปุ่ม (ต้องมี User Interaction ก่อน Browser ถึงจะยอมให้เล่นเสียง)
    music.volume = 0.5; 
    music.play().catch(e => console.log("Audio needed")); // กัน Error ถ้าเล่นไม่ได้
    
    startBtn.style.display = 'none'; 
    consoleOutput.style.display = 'block';

    // วนลูปพิมพ์ข้อความทีละบรรทัดตามที่ตั้งไว้ใน CONFIG
    for (let line of CONFIG.storyLines) { 
        await typeLine(line.text, line.speed); 
        await wait(line.delay); 
    }

    // ซ่อนหน้า Console แล้วโชว์หน้าใส่รหัสผ่าน
    gsap.to('#console-layer', { duration: 1, opacity: 0, onComplete: () => {
        document.getElementById('console-layer').style.display = 'none';
        const secLayer = document.getElementById('security-layer'); 
        secLayer.style.display = 'flex';
        gsap.to(secLayer, { duration: 1, opacity: 1 }); 
        document.getElementById('pass-input').focus();
    }});
});

// ฟังก์ชันพิมพ์ตัวอักษรทีละตัว (Typewriter Effect)
function typeLine(text, speed) { 
    return new Promise(resolve => { 
        let i = 0; 
        const div = document.createElement('div'); 
        div.className = 'log-line'; 
        consoleOutput.appendChild(div); 
        consoleOutput.scrollTop = consoleOutput.scrollHeight; // เลื่อน Scroll ลงล่างสุดเสมอ
        
        function typeChar() { 
            if (i < text.length) { 
                div.textContent += text.charAt(i); 
                i++; 
                setTimeout(typeChar, speed); 
            } else { resolve(); } 
        } 
        typeChar(); 
    }); 
}

// ฟังก์ชันหน่วงเวลา (Helper function)
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// =========================================================
// 2. PASSWORD SYSTEM (ระบบเช็ครหัสผ่าน)
// =========================================================
document.getElementById('pass-input').addEventListener('keyup', (e) => {
    // เช็คว่ารหัสตรงกับใน CONFIG ไหม
    if(e.target.value === CONFIG.passcode) {
        // ถ้ารหัสถูก: เปลี่ยนสีเป็นเขียว, เปลี่ยนไอคอนล็อค
        e.target.style.borderColor = "#00ff00"; 
        e.target.style.color = "#00ff00";
        document.querySelector('.lock-icon').innerHTML = "🔓";
        
        // รอ 1 วินาทีแล้วเข้าสู่โลก 3D
        setTimeout(() => {
            gsap.to('#security-layer', { duration: 1, opacity: 0, onComplete: () => {
                document.getElementById('security-layer').style.display = 'none'; 
                initThreeJS(); // เริ่มต้นระบบ 3D
            }});
        }, 1000);
    }
});

// =========================================================
// 3. THREE.JS INITIALIZATION (ตั้งค่าระบบ 3D)
// =========================================================
function initThreeJS() {
    const container = document.getElementById('canvas-container');
    
    // สร้าง Scene และหมอกจางๆ
    scene = new THREE.Scene(); 
    scene.background = new THREE.Color(0x000000); 
    scene.fog = new THREE.FogExp2(0x000000, 0.0003);
    
    // ตั้งกล้อง
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 8000); 
    camera.position.z = 1000;
    
    // ตั้งค่า Renderer (ตัววาดภาพ)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // คำนวณตำแหน่งจุดต่างๆ เตรียมไว้ (Sphere, Heart, Text, Galaxy)
    generateSphereTargets(); 
    generateBeautifulHeartTargets(); 
    generateTextTargets(CONFIG.textToMorph); 
    generateGalaxyTargets();

    // สร้างจุด (Particles)
    const sprite = createParticleTexture(); // สร้าง Texture จุดแสงฟุ้งๆ
    geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(CONFIG.particleCount * 3);
    const colArray = new Float32Array(CONFIG.particleCount * 3);
    const colorObj = new THREE.Color();

    // สุ่มตำแหน่งเริ่มต้นและสีของจุด
    for(let i=0; i<CONFIG.particleCount; i++) {
        posArray[i*3] = (Math.random()-0.5)*2500; 
        posArray[i*3+1] = (Math.random()-0.5)*2500; 
        posArray[i*3+2] = (Math.random()-0.5)*2500;
        
        colorObj.setHSL(0, 1.0, 0.5 + Math.random()*0.3); // สีโทนแดง-ชมพู
        colArray[i*3] = colorObj.r; 
        colArray[i*3+1] = colorObj.g; 
        colArray[i*3+2] = colorObj.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3)); 
    geometry.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
    
    material = new THREE.PointsMaterial({ 
        size: CONFIG.particleSize, 
        map: sprite, 
        vertexColors: true, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false, 
        transparent: true, 
        opacity: 1.0 
    });
    
    particles = new THREE.Points(geometry, material); 
    scene.add(particles);

    // สร้างอัลบั้มรูปเตรียมไว้ (แต่ซ่อนก่อน)
    createPhotos(); 
    
    // เริ่มต้นที่ทรงกลม และเริ่ม Animation Loop
    morphTo('sphere'); 
    animate();

    // Event Listeners
    window.addEventListener('click', onCanvasClick);
    window.addEventListener('resize', () => { 
        camera.aspect = window.innerWidth/window.innerHeight; 
        camera.updateProjectionMatrix(); 
        renderer.setSize(window.innerWidth, window.innerHeight); 
    });
}

// สร้าง Texture วงกลมฟุ้งๆ ด้วย Canvas 2D
function createParticleTexture() {
    const canvas = document.createElement('canvas'); 
    canvas.width = 64; canvas.height = 64; 
    const ctx = canvas.getContext('2d'); 
    const grad = ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); 
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)'); 
    grad.addColorStop(0.6, 'rgba(255,255,255,0.2)'); 
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; 
    ctx.fillRect(0,0,64,64); 
    return new THREE.CanvasTexture(canvas);
}

// =========================================================
// 4. INTERACTION & TRANSITIONS (การคลิกเปลี่ยนฉาก)
// =========================================================
function onCanvasClick(e) {
    // 1. ถ้าอยู่ในโหมด Gallery ให้เช็คว่าคลิกโดนรูปไหม
    if(currentShape === 'gallery') {
        mouse.x = (e.clientX/window.innerWidth)*2-1; 
        mouse.y = -(e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables);
        if(intersects.length > 0) { 
            openPopup(intersects[0].object.userData.url); 
            return; 
        }
    }

    // ห้ามคลิกเปลี่ยนฉากถ้าอยู่ในหน้าจบ หรือหน้าดอกไม้
    if(currentShape === 'final-heart' || currentShape === 'flowers' || currentShape === 'final-console') return;

    // 2. คลิกปกติเพื่อเปลี่ยน Shape ถัดไป
    clickCount++;
    const shapes = ['heart', 'text', 'gallery', 'sphere', 'final-heart']; 
    let shapeName = (clickCount <= shapes.length) ? shapes[clickCount-1] : 'final-heart';
    morphTo(shapeName);
}

// ฟังก์ชันหลักในการเปลี่ยนรูปร่าง (Morphing Logic)
function morphTo(shape) {
    currentShape = shape;
    
    // กรณี: เข้าโหมด Gallery (โชว์รูปภาพ)
    if(shape === 'gallery') {
        gsap.to(material, {opacity:0, duration:1}); // ซ่อนจุด
        photoGroup.visible = true;
        gsap.to(photoGroup.scale, {x:1, y:1, z:1, duration:2, ease:"back.out(1.7)"}); // เด้งรูปภาพขึ้นมา
        
        // ให้จุดกระจายเป็น Galaxy พื้นหลัง
        transitionParams.target = targets.galaxy; 
        gsap.to(transitionParams, {duration:2, progress:1});
    } 
    // กรณี: เข้าโหมดหัวใจสุดท้าย (เตรียมเล่นเกมกด)
    else if(shape === 'final-heart') {
        gsap.to(photoGroup.scale, {x:0, y:0, z:0, duration:1, onComplete:()=>{photoGroup.visible=false;}});
        gsap.to(material, {opacity:0, duration:1}); // ซ่อนจุด 3D
        
        const finalLayer = document.getElementById('final-heart-layer'); 
        finalLayer.classList.add('active'); 
        gsap.to(finalLayer, {opacity:1, duration:2}); // โชว์หน้า UI หัวใจ CSS
    } 
    // กรณี: เปลี่ยนรูปร่าง 3D ปกติ (Sphere, Heart, Text)
    else {
        // ซ่อนรูปภาพ (ถ้ามี)
        if(photoGroup.visible) {
            gsap.to(photoGroup.scale, {x:0, y:0, z:0, duration:1, onComplete:()=>{photoGroup.visible=false;}});
        }
        
        gsap.to(material, {opacity:1, duration:1}); 
        
        // Reset progress การเคลื่อนที่
        transitionParams.progress = 0; 
        // บันทึกตำแหน่งปัจจุบันเป็นจุดเริ่มต้น
        transitionParams.source = Float32Array.from(geometry.attributes.position.array); 
        // กำหนดเป้าหมายใหม่
        transitionParams.target = targets[shape]; 
        // ใช้ GSAP เลื่อนค่า progress จาก 0 -> 1
        gsap.to(transitionParams, {duration:2.5, progress:1, ease:"power2.inOut"});
    }
}

// =========================================================
// 5. GAME LOGIC (เกมกดหัวใจเติมหลอด)
// =========================================================
const heartBtn = document.getElementById('heart-btn');
const startEvents = ['mousedown', 'touchstart']; 
const endEvents = ['mouseup', 'touchend', 'mouseleave'];

// ผูก Event การกดค้างและการปล่อย
startEvents.forEach(evt => heartBtn.addEventListener(evt, (e) => { 
    if(e.cancelable && evt === 'touchstart') e.preventDefault(); // กันจอมือถือเลื่อน
    startHold(); 
}));
endEvents.forEach(evt => document.addEventListener(evt, () => { 
    if(isHolding) endHold(); 
}));

function startHold() { 
    if(currentShape !== 'final-heart') return; 
    isHolding = true; 
    heartBtn.classList.add('holding'); 
    clearInterval(holdInterval); 
    // เพิ่มค่า Love Power ขึ้นเรื่อยๆ
    holdInterval = setInterval(() => { lovePower += 2; updateLoveMeter(); }, 30); 
}

function endHold() { 
    isHolding = false; 
    heartBtn.classList.remove('holding'); 
    clearInterval(holdInterval); 
    // ถ้าปล่อยปุ่ม ค่าจะค่อยๆ ลดลง
    holdInterval = setInterval(() => { 
        if(lovePower > 0 && !isHolding) { lovePower -= 1; updateLoveMeter(); } 
        else { clearInterval(holdInterval); } 
    }, 30); 
}

function updateLoveMeter() { 
    // ถ้าเต็ม 100% ให้เข้าสู่ฉากจบ (ดอกไม้)
    if(lovePower >= 100) { 
        lovePower = 100; 
        clearInterval(holdInterval); 
        showFlowers(); 
    } 
    document.getElementById('p-fill').style.width = lovePower + "%"; 
    document.getElementById('heart-status').innerText = "LOVE POWER: " + lovePower + "%"; 
}

// =========================================================
// 6. ENDING SEQUENCE (ฉากจบดอกไม้ & ข้อความ)
// =========================================================
function showFlowers() {
    currentShape = 'flowers';
    // ซ่อน UI หัวใจ -> โชว์สวนดอกไม้
    gsap.to('#final-heart-layer', {opacity:0, duration:1, onComplete:()=>{
        document.getElementById('final-heart-layer').style.display='none';
        const flowers = document.getElementById('flower-world'); 
        flowers.style.display='flex';
        flowers.classList.remove('flower-paused'); // เริ่ม Animation ดอกไม้
        gsap.to(flowers, {opacity:1, duration:3});
        
        // โชว์ข้อความ Happy Valentine
        setTimeout(() => {
            const overlay = document.getElementById('valentine-overlay'); 
            overlay.style.display = 'flex';
            gsap.to(overlay, { opacity: 1, duration: 2 });
            gsap.to('#next-chapter-btn', { opacity: 1, delay: 1, duration: 1 });
        }, 4000);
    }});
}

// เข้าสู่หน้าข้อความสุดท้าย (Console สุดท้าย)
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

    // พิมพ์ข้อความสุดท้ายจาก CONFIG
    for (let line of CONFIG.blessingLines) {
        const div = document.createElement('div'); 
        div.className = 'final-line'; 
        container.appendChild(div);
        for (let char of line) { 
            div.textContent += char; 
            await new Promise(r => setTimeout(r, 30)); 
        }
        await new Promise(r => setTimeout(r, 400));
    }
    
    // จบการทำงาน รอ 3 วิ แล้ววนกลับไปเริ่มต้นใหม่ (Reset)
    await new Promise(r => setTimeout(r, 3000));
    gsap.to('#final-console-layer', { opacity: 0, duration: 2, onComplete: () => {
        document.getElementById('final-console-layer').style.display = 'none';
        document.getElementById('final-console-layer').style.opacity = 1;
        container.innerHTML = '';
        
        // Reset ค่าทั้งหมด
        lovePower = 0; 
        document.getElementById('p-fill').style.width = "0%"; 
        document.getElementById('heart-status').innerText = "HOLD TO FILL LOVE"; 
        heartBtn.classList.remove('holding');
        clickCount = 0; 
        morphTo('sphere'); // กลับไปหน้าแรก
    }});
}

// Pop-up ดูรูปขนาดใหญ่
function openPopup(url) { 
    document.getElementById('popup-img').src=url; 
    document.getElementById('popup-overlay').style.display='flex'; 
}
function closePopup() { 
    document.getElementById('popup-overlay').style.display='none'; 
}

// =========================================================
// 7. MATH & GEOMETRY (คำนวณตำแหน่งจุดต่างๆ)
// =========================================================
const transitionParams = { progress: 0, source: [], target: [] };

// คำนวณทรงกลม (Sphere)
function generateSphereTargets() { 
    for(let i=0;i<CONFIG.particleCount;i++){ 
        const r=800, t=Math.random()*Math.PI*2, p=Math.acos((Math.random()*2)-1); 
        targets.sphere.push(r*Math.sin(p)*Math.cos(t), r*Math.sin(p)*Math.sin(t), r*Math.cos(p)); 
    }
}

// คำนวณรูปหัวใจ 3D (Heart)
function generateBeautifulHeartTargets() { 
    const scale=35, thickness=120; 
    for(let i=0; i<CONFIG.particleCount; i++) { 
        const t=Math.random()*Math.PI*2, r=Math.sqrt(Math.random()); 
        const x = 16*Math.pow(Math.sin(t),3) * r * scale; 
        const y = (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)) * r * scale; 
        const z = (Math.random()-0.5) * 2 * thickness * Math.cos(r*Math.PI/2); 
        targets.heart.push(x, y, z); 
    } 
}

// แปลงข้อความ Text เป็นจุด (ใช้ Canvas scan pixel)
function generateTextTargets(text) { 
    const c=document.createElement('canvas'), ctx=c.getContext('2d'); 
    c.width=1600; c.height=400; 
    ctx.font='Bold 250px Arial'; 
    ctx.fillStyle='white'; 
    ctx.textAlign='center'; 
    ctx.textBaseline='middle'; 
    ctx.fillText(text, c.width/2, c.height/2); 
    
    const data=ctx.getImageData(0,0,c.width,c.height).data, valid=[]; 
    // Scan หา pixel ที่ไม่ใช่สีดำ
    for(let y=0;y<c.height;y+=5) 
        for(let x=0;x<c.width;x+=5) 
            if(data[(y*c.width+x)*4]>128) 
                valid.push({x:(x-c.width/2)*2.5, y:-(y-c.height/2)*2.5, z:(Math.random()-0.5)*150}); 
    
    // เติมจุดให้ครบจำนวน
    if(valid.length===0) for(let i=0;i<CONFIG.particleCount;i++) valid.push({x:0,y:0,z:0}); 
    for(let i=0;i<CONFIG.particleCount;i++) { 
        const p=valid[i%valid.length]; 
        targets.text.push(p.x, p.y, p.z); 
    } 
}

// คำนวณกาแล็กซี (Galaxy - จุดกระจายทั่วๆ)
function generateGalaxyTargets() { 
    for(let i=0;i<CONFIG.particleCount;i++) 
        targets.galaxy.push((Math.random()-0.5)*6000, (Math.random()-0.5)*6000, (Math.random()-0.5)*6000); 
}

// =========================================================
// 8. PHOTO SPHERE (สร้างอัลบั้มรูป 3D)
// =========================================================
function createPhotos() { 
    photoGroup = new THREE.Group(); 
    photoGroup.scale.set(0,0,0); 
    photoGroup.visible=false; 
    scene.add(photoGroup); 
    
    const loader = new THREE.TextureLoader(); 
    const radius = 900; // รัศมีทรงกลมรูปภาพ
    
    CONFIG.photos.forEach((url, i) => {
        // ใช้สูตร Fibonacci Sphere เพื่อกระจายรูปให้ทั่วทรงกลมเท่าๆ กัน
        const phi = Math.acos( -1 + ( 2 * i ) / CONFIG.photos.length );
        const theta = Math.sqrt( CONFIG.photos.length * Math.PI ) * phi;
        const x = radius * Math.cos( theta ) * Math.sin( phi );
        const y = radius * Math.sin( theta ) * Math.sin( phi );
        const z = radius * Math.cos( phi );
        
        const geo = new THREE.PlaneGeometry(140, 200); // ขนาดรูป
        const mat = new THREE.MeshBasicMaterial({ 
            map: loader.load(url), 
            side: THREE.DoubleSide,
            color: 0xffffff 
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z); 
        mesh.lookAt(0,0,0); // หันหน้าเข้าหาจุดศูนย์กลาง
        
        // สร้างกรอบสีแดงรอบรูป
        const border = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color: 0xff0000}));
        mesh.add(border); 
        mesh.userData = { url: url }; // เก็บ URL ไว้ใช้ตอนคลิก
        photoGroup.add(mesh); 
        interactables.push(mesh);
    });
}

// =========================================================
// 9. ANIMATION LOOP (หัวใจหลักของการขยับภาพ)
// =========================================================
function animate() { 
    requestAnimationFrame(animate); // วนลูปฟังก์ชันนี้เรื่อยๆ (approx 60fps)
    
    // ถ้าไม่ใช่โหมดพิเศษ ให้ขยับจุด Particles
    if(currentShape!=='gallery' && currentShape!=='final-heart' && currentShape!=='flowers' && currentShape!=='final-console'){ 
        const pos=geometry.attributes.position.array; 
        
        // คำนวณตำแหน่งจุดระหว่างการเปลี่ยนรูปร่าง (Interpolation)
        if(transitionParams.progress<1 && transitionParams.target.length>0){ 
            for(let i=0;i<CONFIG.particleCount;i++){ 
                const idx=i*3; 
                // สูตร Linear Interpolation: จุดปัจจุบัน + (เป้าหมาย - ปัจจุบัน) * ความคืบหน้า
                pos[idx] = transitionParams.source[idx] + (transitionParams.target[idx]-transitionParams.source[idx])*transitionParams.progress; 
                pos[idx+1] = transitionParams.source[idx+1] + (transitionParams.target[idx+1]-transitionParams.source[idx+1])*transitionParams.progress; 
                pos[idx+2] = transitionParams.source[idx+2] + (transitionParams.target[idx+2]-transitionParams.source[idx+2])*transitionParams.progress; 
            } 
            geometry.attributes.position.needsUpdate=true; // บอก Three.js ว่าตำแหน่งเปลี่ยนแล้ว
        } 
        
        // หมุนกลุ่มดาวช้าๆ
        particles.rotation.y=Date.now()*0.0001; 
        particles.rotation.x=Math.sin(Date.now()*0.0002)*0.1; 
    } 
    // ถ้าโหมด Gallery ให้หมุนอัลบั้มรูป
    else if(currentShape==='gallery') {
        photoGroup.rotation.y+=0.001; 
    }
    
    renderer.render(scene, camera); // วาดภาพลงจอ
}