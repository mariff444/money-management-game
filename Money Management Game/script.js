// ================= ข้อมูลตั้งต้นและระบบภาษา =================
let currentLang = 'th'; 

// *LOGIC: ฟังก์ชันสลับภาษา* เช็คว่า currentLang เป็น en ไหม ถ้าใช่ส่งข้อความภาษาอังกฤษกลับ ถ้าไม่ใช่ส่งภาษาไทยกลับ
function l(thText, enText) { return currentLang === 'en' ? enText : thText; }

const FOOD_MENU = [
    { th: "หมูปิ้ง", en: "Grilled Pork", price: 30 }, { th: "อาหารตามสั่ง", en: "Cook-to-order", price: 50 },
    { th: "ไก่ทอด", en: "Fried Chicken", price: 35 }, { th: "ไก่เทอริยากิ", en: "Teriyaki Chicken", price: 40 },
    { th: "ซูชิ", en: "Sushi", price: 25 }, { th: "ก๋วยเตี๋ยวเนื้อ", en: "Beef Noodles", price: 50 }
];

const MOOD_LEVELS = { th: ["แย่มาก", "แย่", "ปกติ", "ดี", "ดีมาก"], en: ["Terrible", "Bad", "Normal", "Good", "Great"] };
const MOOD_COLORS = ["#9f70ba", "#1397f0", "#ffd80e", "#ff8d22", "#ea5180"];
const WEATHER_TYPES = ["sunny", "rainy", "cloudy"];
const WEATHER_MAP = {
    "sunny": { th: "แดดจ้า", en: "Sunny", emoji: "☀️" }, "rainy": { th: "ฝนตก", en: "Rainy", emoji: "🌧️" }, "cloudy": { th: "มีเมฆ", en: "Cloudy", emoji: "☁️" }
};
const TIME_MAP = {
    "morning": { th: "เช้า", en: "Morning" }, "noon": { th: "เที่ยง", en: "Noon" },
    "evening": { th: "เย็น", en: "Evening" }, "end": { th: "กลางคืน", en: "Night" }
};

// ================= ระบบเสียง (Sound System) =================
const bgm = new Audio('sound/coffee.mp3'); bgm.loop = true; bgm.volume = 0.4; 
const sfxMoney = new Audio('sound/money.mp3');
const sfxMoodUp = new Audio('sound/energy-up.mp3');
const sfxMoodDrain = new Audio('sound/energy-drain.mp3');
const sfxSpin = new Audio('sound/spin.wav'); sfxSpin.loop = true; 

function playSfx(audioObj) {
    audioObj.currentTime = 0; // รีเซ็ตเวลาเป็น 0 เพื่อให้กดรัวๆ แล้วเสียงเล่นซ้ำได้ทันที
    audioObj.play().catch(err => console.log("SFX play failed:", err));
}

// ================= ตัวแปรสถานะผู้เล่น =================
let money = 0;
let energy = 100;
let moodIndex = 4; 
let currentDay = 1;
let currentWeather = "sunny";
let currentPhase = ""; 
let moodProtectTurns = 0; 
let startOfDayMoney = 0; 
let tempBonusTh = ""; 
let tempBonusEn = ""; 

// ตัวแปรสำหรับเก็บประวัติเนื้อเรื่องปัจจุบัน ไว้ใช้อัปเดตภาษา Real-time ตอนกดปุ่ม
let activeStory = { senderTh: "", senderEn: "", textTh: "", textEn: "" };
let activeButtons = [];

// ================= เชื่อมต่อตัวแปรกับ HTML =================
const uiDay = document.getElementById("day-ui");
const uiWeather = document.getElementById("weather-ui");
const uiTime = document.getElementById("time-ui");
const uiMoney = document.getElementById("money-ui");
const uiEnergy = document.getElementById("energy-ui");
const uiMood = document.getElementById("mood-ui");
const actionArea = document.getElementById("action-area");
const gameWindow = document.querySelector(".game-window"); 
const IMAGE_PATH = 'image/'; 

// ================= ระบบเปลี่ยนภาษาหลัก =================
function toggleLanguage() {
    // สลับภาษาปัจจุบัน
    currentLang = currentLang === 'th' ? 'en' : 'th';
    
    // อัปเดต Label (ป้ายกำกับคงที่บนหน้าจอ)
    document.getElementById("lbl-money").textContent = l("เงิน:", "Money:");
    document.getElementById("lbl-energy").textContent = l("พลัง:", "Energy:");
    document.getElementById("lbl-date").textContent = l("วันที่:", "Day:");
    document.getElementById("lbl-time").textContent = l("เวลา:", "Time:");
    
    // อัปเดตคำในหน้าต่าง Pop-up
    const slotTitle = document.getElementById("slot-title");
    if(slotTitle) slotTitle.textContent = l("เงินทุนของคุณคือ", "Your Starting Fund");

    const lblStart = document.getElementById("lbl-sum-start");
    if(lblStart) {
        lblStart.textContent = l("เงินเริ่มต้น:", "Started with:");
        document.getElementById("lbl-sum-spent").textContent = l("ใช้ไป:", "Spent:");
        document.getElementById("lbl-sum-remain").textContent = l("คงเหลือ:", "Remaining:");
        document.getElementById("btn-continue-day").textContent = l("ลุยต่อ!", "Let's go!");
    }
    
    const dayTitle = document.getElementById("transition-day-title");
    if(dayTitle) dayTitle.innerHTML = l(`วันที่ ${currentDay}`, `DAY ${currentDay}`);

    // อัปเดตแถบสถานะให้เป็นภาษาล่าสุด
    updateStats();
    // รีเฟรชกล่องข้อความและปุ่มด้านล่าง
    refreshUI();
}

function setStory(senderTh, senderEn, textTh, textEn) {
    activeStory = { senderTh, senderEn, textTh, textEn };
    refreshUI();
}

function setButtons(buttonsArray) {
    activeButtons = buttonsArray;
    refreshUI();
}

// *LOGIC:* ฟังก์ชันอัปเดตกล่องข้อความและปุ่มใหม่ทั้งหมดตามภาษาที่ถูกเลือก
function refreshUI() {
    const nameTag = document.getElementById("speaker-name");
    const storyText = document.getElementById("story-text");

    if(nameTag) nameTag.textContent = l(activeStory.senderTh, activeStory.senderEn);
    if(storyText) storyText.innerHTML = l(activeStory.textTh, activeStory.textEn);

    actionArea.innerHTML = "";
    activeButtons.forEach(btn => {
        const button = document.createElement("button");
        button.className = "btn-action";
        button.innerHTML = l(btn.lTh, btn.lEn); 
        button.onclick = btn.action;
        actionArea.appendChild(button);
    });
}

// ================= ฟังก์ชันช่วยเหลือทั่วไป =================
function updateBackground(imageName) {
    if (imageName && gameWindow) gameWindow.style.backgroundImage = `url('${IMAGE_PATH}${imageName}')`;
    else if (gameWindow) gameWindow.style.backgroundImage = 'none'; 
}

// แอนิเมชันตัวเลขเด้งใหญ่ๆ ตรงกลางจอ (เช่น เวลากินข้าว)
function showCenterFloat(text, typeClass) {
    const floater = document.createElement("div");
    floater.className = `center-floating-text ${typeClass}`;
    floater.innerHTML = text;
    gameWindow.appendChild(floater);
    setTimeout(() => floater.remove(), 1800); 
}

// อัปเดตเงิน: เปลี่ยนตัวเลขในระบบ โชว์แอนิเมชัน และเล่นเสียง
function updateMoney(amount) {
    money += amount;
    if (amount !== 0) {
        showCenterFloat(amount > 0 ? `💰 +${amount} ฿` : `💸 ${amount} ฿`, amount > 0 ? 'money-up' : 'money-down');
        playSfx(sfxMoney); 
    }
}

// อัปเดตพลังงาน
function updateEnergy(amount) {
    let oldEnergy = energy;
    energy = Math.max(0, Math.min(100, Math.round(energy + amount)));
    let diff = energy - oldEnergy;
    if (diff !== 0) {
        showCenterFloat(diff > 0 ? `⚡ +${diff}` : `⚡ ${diff}`, diff > 0 ? 'energy-up' : 'energy-down');
    }
}

// อัปเดตความสุข
function updateMood(amount) {
    let oldMood = moodIndex;
    moodIndex = Math.max(0, Math.min(4, moodIndex + amount));
    let diff = moodIndex - oldMood;
    
    if (diff > 0) {
        showCenterFloat(l(`😊 ความสุข +${diff}`, `😊 Mood +${diff}`), 'mood-up');
        playSfx(sfxMoodUp);
    } else if (diff < 0) {
        showCenterFloat(l(`😭 ความสุข ${diff}`, `😭 Mood ${diff}`), 'mood-down');
        playSfx(sfxMoodDrain);
    }
}

// ตรวจสอบและอัปเดต UI แถบสถานะด้านบน รวมถึงเช็คว่า Game Over หรือยัง
function updateStats() {
    uiDay.textContent = currentDay;
    if (uiWeather && currentWeather) uiWeather.textContent = WEATHER_MAP[currentWeather].emoji;
    uiMoney.textContent = money;
    uiEnergy.textContent = energy;
    
    // เปลี่ยนสีขอบและเงาของความสุขตามระดับอารมณ์
    if (uiMood) {
        uiMood.textContent = MOOD_LEVELS[currentLang][moodIndex];
        const moodContainer = uiMood.closest('.mood-content');
        if (moodContainer) {
            const currentColor = MOOD_COLORS[moodIndex];
            moodContainer.style.borderColor = currentColor; 
            moodContainer.style.boxShadow = `0 0 15px ${currentColor}66`; 
        }
    }

    if (uiTime) {
        let phaseKey = "morning";
        if (currentPhase.includes("noon")) phaseKey = "noon";
        if (currentPhase.includes("evening")) phaseKey = "evening";
        if (currentPhase.includes("end")) phaseKey = "end";
        uiTime.textContent = TIME_MAP[phaseKey][currentLang];
    }

    if (money < 0) return triggerGameOver("คุณ", "You", "เงินหมดแล้ว... ฉันจะอยู่ต่อยังไงดี", "Out of money... How am I supposed to survive?");
    if (energy <= 0) return triggerGameOver("ระบบ", "System", "คุณพลังงานหมดเกลี้ยง จนสลบเหมือดไปเลย", "You completely ran out of energy and passed out");
    if (moodIndex === 0) return triggerGameOver("คุณ", "You", "ฉัน... ฉันรับไม่ไหวแล้ว ความสุขไม่เหลือเลย", "I... I can't take this anymore. No happiness left");
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomFoods() { return [...FOOD_MENU].sort(() => 0.5 - Math.random()).slice(0, 2); }

// ================= ระบบเริ่มเกม =================
// เตรียมหน้าต่างและภาษาให้พร้อมก่อนเล่น
toggleLanguage(); 
toggleLanguage(); 
setStory("ระบบ", "System", "ยินดีต้อนรับสู่สัปดาห์หฤโหด! กดสุ่มเงินก้อนแรกเพื่อเริ่มต้นชีวิตได้เลย", "Welcome to Survival Week! Spin for your initial fund to start living.");
setButtons([{ lTh: "เริ่มสุ่มเงินทุน", lEn: "Spin Starting Fund", action: startMoneySpin }]);

// กดเริ่มสุ่มเงิน
async function startMoneySpin() {
    if (bgm.paused) bgm.play().catch(err => console.log("BGM play failed:", err));
    sfxSpin.currentTime = 0;
    sfxSpin.play().catch(err => console.log("Spin SFX play failed:", err));

    money = 0; energy = 100; moodIndex = 4; currentDay = 1; moodProtectTurns = 0; 
    currentWeather = WEATHER_TYPES[randomInt(0, 2)]; currentPhase = "morning";
    updateStats();
    setButtons([]); 
    
    const slotScreen = document.getElementById('slot-screen');
    const slotContainer = document.getElementById('slots');
    slotScreen.style.display = 'flex'; 
    slotContainer.innerHTML = '';
    
    // สร้างช่องสล็อต 4 หลัก
    const TOTAL_SLOTS = 4;
    for(let i = 0; i < TOTAL_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.innerHTML = `<div id="digit-${i}">0</div>`;
        slotContainer.appendChild(slot);
    }
    
    setStory("ระบบ", "System", "กำลังประมวลผลเงินทุนเริ่มต้นของคุณในสัปดาห์นี้...", "Processing your starting fund for this week...");
    
    // สุ่มเลขทุนประเดิม
    const targetMoney = randomInt(1000, 2000);
    const moneyStr = String(targetMoney).padStart(TOTAL_SLOTS, '0');
    
    const animationTasks = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const delay = i * 200; 
        const duration = 1000 + (i * 300); 
        // หน่วงเวลาช่องถัดๆ ไปให้หยุดช้าลงทีละสเต็ป
        const task = new Promise(r => setTimeout(r, delay))
            .then(() => animateSingleSlot(i, moneyStr[i], duration));
        animationTasks.push(task);
    }
    
    await Promise.all(animationTasks); // รอจนหยุดครบทุกช่อง
    sfxSpin.pause();
    updateMoney(targetMoney);
    updateStats();
    
    setStory("ระบบ", "System", 
        `สุ่มเสร็จสิ้น! คุณได้รับทุนประเดิมสัปดาห์ <b>${targetMoney} ฿</b><br>กำลังเตรียมเข้าสู่วันที่ 1...`,
        `Spin complete! You received <b>${targetMoney} ฿</b> to start.<br>Preparing Day 1...`);
    
    // พอสุ่มเสร็จ ซ่อนสล็อต และขึ้นหน้าโชว์ วันที่ 1
    setTimeout(() => {
        document.getElementById('slot-screen').style.display = 'none';
        showDayTransition(true); 
    }, 2000); 
}

// อนิเมชันแต่ละช่องสล็อต (อันนี้คงความมั่วตัวเลขไว้ให้ดูอลังการ)
async function animateSingleSlot(index, targetDigit, duration) {
    return new Promise(resolve => {
        const slot = document.getElementById('slots').children[index];
        const inner = document.getElementById(`digit-${index}`);
        const tickInterval = 50;
        const totalTicks = Math.floor(duration / tickInterval);
        let currentTick = 0;

        const timer = setInterval(() => {
            if (currentTick < totalTicks) {
                inner.textContent = Math.floor(Math.random() * 10); 
            } else {
                inner.textContent = targetDigit; 
                slot.className = 'slot done'; 
                const popEffect = document.createElement('div');
                popEffect.className = 'pop-digit';
                popEffect.textContent = targetDigit;
                slot.appendChild(popEffect);
                setTimeout(() => { popEffect.remove(); }, 800);
                clearInterval(timer);
                resolve();
            }
            currentTick++;
        }, tickInterval);
    });
}

// ================= ระบบ Animation สรุปผลข้ามวันแบบ Counter Smooth =================

// *LOGIC:* ฟังก์ชันตัวเลขวิ่งแบบ Smooth (Counter) 
// รับค่าเริ่มต้น (startValue) และวิ่งไปยังเป้าหมาย (targetValue) ตามระยะเวลา (duration) ที่กำหนด
async function animateCounter(element, startValue, targetValue, duration) {
    return new Promise(resolve => {
        const interval = 30; // อัปเดต UI ทุกๆ 30ms ทำให้ดูเนียนตา
        const totalSteps = Math.floor(duration / interval);
        const valueChangePerStep = (targetValue - startValue) / totalSteps;
        let currentStep = 0;
        let currentValue = startValue;

        const timer = setInterval(() => {
            currentStep++;
            currentValue += valueChangePerStep;
            
            // ถ้าวิ่งถึงเป้าหมาย หรือเกินสเต็ปที่กำหนด ให้เซ็ตเป็นเลขเป้าหมายเป๊ะๆ เพื่อป้องกันทศนิยม
            if (currentStep >= totalSteps) {
                element.textContent = targetValue;
                clearInterval(timer);
                resolve();
            } else {
                element.textContent = Math.round(currentValue); // ปัดเศษแสดงแต่จำนวนเต็ม
            }
        }, interval);
    });
}

// *LOGIC:* โชว์หน้าต่างสรุปผลเปลี่ยนวัน
async function showDayTransition(isFirstDay) {
    const screen = document.getElementById('day-transition-screen');
    const dayTitle = document.getElementById('transition-day-title');
    const summaryBox = document.getElementById('daily-summary');
    const btnContinue = document.getElementById('btn-continue-day');

    screen.style.display = 'flex';
    btnContinue.style.display = 'none'; 

    // อัปเดตภาษาให้แสดงแค่วันที่อย่างเดียว (เช่น "วันที่ 4" ถ้าเป็นไทย)
    dayTitle.innerHTML = l(`วันที่ ${currentDay}`, `DAY ${currentDay}`);

    if(isFirstDay) {
        // วันแรกสุดของการเริ่มเกม ข้ามกล่องสรุปเงินไปเลย
        summaryBox.style.display = 'none';
        startOfDayMoney = money; 
        setTimeout(() => { btnContinue.style.display = 'block'; }, 1500);
    } else {
        // วันอื่นๆ โชว์สรุปการใช้เงิน
        summaryBox.style.display = 'block';
        const elStart = document.getElementById('summary-start');
        const elSpent = document.getElementById('summary-spent');
        const elRemain = document.getElementById('summary-remain');

        // รีเซ็ตค่าก่อนรัน
        elStart.textContent = "0";
        elSpent.style.opacity = 0; 
        elRemain.textContent = "0";

        let spentAmount = startOfDayMoney - money; 

        // 1. วิ่งตัวเลขเงินตั้งต้น (จาก 0 ไปยังยอดเมื่อเช้า)
        await animateCounter(elStart, 0, startOfDayMoney, 800);
        
        // 2. เด้งโชว์ตัวเลขที่ใช้ไปในวันนี้ (สีแดง)
        elSpent.textContent = `-${spentAmount}`;
        elSpent.style.opacity = 1;
        if(spentAmount > 0) playSfx(sfxMoodDrain); 
        
        await new Promise(r => setTimeout(r, 600)); // หน่วงเวลาให้คนดูแปปนึง
        
        // 3. วิ่งตัวเลขลด/เพิ่มลงมายังยอดปัจจุบัน (จากยอดเมื่อเช้า วิ่งไปหายอดคงเหลือปัจจุบัน)
        // นี่คือจุดที่ทำให้มัน "ลดลงมาปกติ" แบบสมูท
        await animateCounter(elRemain, startOfDayMoney, money, 1000);
        playSfx(sfxMoney); 

        startOfDayMoney = money; // เซฟยอดปัจจุบันเป็นยอดเช้าวันต่อไป
        btnContinue.style.display = 'block'; 
    }
}

// กดปุ่มเพื่อลุยต่อเข้าสู่ตอนเช้า
function closeDayTransition() {
    document.getElementById('day-transition-screen').style.display = 'none';
    startNewDay(tempBonusTh, tempBonusEn); 
    tempBonusTh = ""; tempBonusEn = ""; 
}

// ================= ระบบนอนหลับพักผ่อน =================
// *LOGIC:* เมื่อกดปุ่มนอนหลับ จะมาเข้าฟังก์ชันนี้ก่อน
function sleepAndStartNewDay() {
    tempBonusTh = "";
    tempBonusEn = "";
    
    // โอกาส 40% ที่จะได้บัฟอารมณ์ดีตอนเช้า
    if (Math.random() < 0.4 && moodIndex < 4) {
        updateMood(1); 
        // เซฟข้อความบัฟไว้ โชว์ตอนหน้าจอเปลี่ยนเป็นเช้า
        tempBonusTh = "<span style='color:#ffe000;'>เมื่อคืนหลับสนิทมาก ตื่นมาเลยอารมณ์ดีเป็นพิเศษ! (ความสุขเพิ่มขึ้น 1 ระดับ)</span><br><br>";
        tempBonusEn = "<span style='color:#ffe000;'>Slept really well last night, woke up feeling great! (Mood up 1 level)</span><br><br>";
    }
    
    // เรียกหน้าต่าง Day Transition แทนที่จะเปลี่ยนฉากไปเลย
    showDayTransition(false);
}

// ================= ระบบ Game Loop หลัก =================
function startNewDay(bonusTh = "", bonusEn = "") {
    if (currentDay > 7) return triggerWin();
    
    currentWeather = WEATHER_TYPES[randomInt(0, 2)];
    currentPhase = "morning";
    updateStats();
    updateBackground('home_morning.png'); 

    let w = WEATHER_MAP[currentWeather];
    setStory("ความคิดของคุณ", "Your Thoughts", 
        `${bonusTh}เช้าวันที่ ${currentDay} แล้วหรอเนี่ย... วันนี้อากาศ <i>${w.th}</i> แฮะ ท้องร้องจัง หาอะไรกินดีกว่า`,
        `${bonusEn}Is it Day ${currentDay} already? Today is <i>${w.en}</i>. I'm starving, let's find some food.`);

    let foods = getRandomFoods();
    setButtons([
        { lTh: `กิน ${foods[0].th} (${foods[0].price}฿)`, lEn: `Eat ${foods[0].en} (${foods[0].price}฿)`, action: () => eatFood(foods[0], "morning_travel") },
        { lTh: `กิน ${foods[1].th} (${foods[1].price}฿)`, lEn: `Eat ${foods[1].en} (${foods[1].price}฿)`, action: () => eatFood(foods[1], "morning_travel") },
        { lTh: "ไม่กินอะไรเลย", lEn: "Skip meal", action: () => proceedTo("morning_travel", "คุณ", "You", "อดข้าวเช้าไปละกัน ประหยัดเงิน...", "I'll skip breakfast to save money...") }
    ]);
}

// *LOGIC:* กินข้าว แล้วคำนวณสเตตัสตามสภาพอากาศ 
function eatFood(food, nextPhase) {
    updateMoney(-food.price);
    updateEnergy(food.price * 1.2); 
    
    if (currentWeather === "rainy") {
        proceedTo(nextPhase, food.th + "ร้านริมทาง", food.en + " Stall", 
            `มื้อนี้กิน <b>${food.th}</b> ฝนก็ตกเฉอะแฉะ บรรยากาศน่านอนต่อชะมัด...`,
            `Ate <b>${food.en}</b>. It's raining and gloomy, makes me want to sleep...`);
    } else {
        proceedTo(nextPhase, food.th + "ร้านริมทาง", food.en + " Stall", 
            `จัดไป! <b>${food.th}</b> อร่อยยย พลังงานมาเต็ม!`,
            `Nice! <b>${food.en}</b> is delicious. Energy refilled!`);
    }
}

// *LOGIC:* ฟังก์ชันหลักที่ขับเคลื่อนเนื้อเรื่อง (State Machine) รับ Phase ถัดไปและแสดงเนื้อเรื่อง
function proceedTo(phase, senderTh, senderEn, prevMsgTh, prevMsgEn) {
    if (moodProtectTurns > 0) moodProtectTurns--; 
    
    currentPhase = phase;
    updateStats();
    // ถ้าสเตตัสพัง ให้ Game Over หยุดวงจรทันที
    if (money < 0 || energy <= 0 || moodIndex === 0) return; 

    // เปลี่ยนแปลงเนื้อเรื่องและปุ่มกดตาม Phase ต่างๆ ในวัน
    if (phase === "morning_travel") {
        setStory(senderTh, senderEn, 
            `${prevMsgTh}<br><br><span style="color:#eee">สายแล้ว! จะไปมหาลัยยังไงดี?</span>`,
            `${prevMsgEn}<br><br><span style="color:#eee">It's late! How should I get to uni?</span>`);
        setButtons([
            { lTh: "นั่งวินมอไซค์ (20฿) - เร็ว", lEn: "Motorcycle Taxi (20฿) - Fast", action: () => travel("วิน", "noon_food") },
            { lTh: "เดินไปเอง (ฟรี) - เหนื่อย", lEn: "Walk (Free) - Tiring", action: () => travel("เดิน", "noon_food") }
        ]);
    } 
    else if (phase === "noon_food") {
        let willMoodDrop = Math.random() < 0.4;
        let studyTh = doStudy('th', willMoodDrop); 
        let studyEn = doStudy('en', willMoodDrop);
        updateStats(); 
        if (money < 0 || energy <= 0 || moodIndex === 0) return; 
        updateBackground('classroom.png'); 

        setStory("ระบบ", "System", 
            `${prevMsgTh}<br><br>${studyTh}<br><br><b>พักเที่ยงแล้ว!</b> หิวจนตาลาย หาอะไรกินกันดีกว่า`,
            `${prevMsgEn}<br><br>${studyEn}<br><br><b>Noon Break!</b> I'm dizzy from hunger, let's eat.`);
        
        let foods = getRandomFoods();
        setButtons([
            { lTh: `กิน ${foods[0].th} (${foods[0].price}฿)`, lEn: `Eat ${foods[0].en} (${foods[0].price}฿)`, action: () => eatFood(foods[0], "noon_drink") },
            { lTh: `กิน ${foods[1].th} (${foods[1].price}฿)`, lEn: `Eat ${foods[1].en} (${foods[1].price}฿)`, action: () => eatFood(foods[1], "noon_drink") },
            { lTh: "ไม่กินอะไรเลย", lEn: "Skip meal", action: () => proceedTo("noon_drink", "ความคิดของคุณ", "Your Thoughts", "อดข้าวเที่ยง... ทนหิวเอาละกัน", "Skipping lunch... just gotta endure the hunger.") }
        ]);
    }
    else if (phase === "noon_drink") {
        setStory(senderTh, senderEn, 
            `${prevMsgTh}<br><br><span style="color:#eee">เดินผ่านร้านน้ำพอดี รับอะไรเย็นๆ สักแก้วไหม?</span>`,
            `${prevMsgEn}<br><br><span style="color:#eee">Walking past a drink stall. Want something cold?</span>`);
        setButtons([
            { lTh: "ซื้อน้ำปั่น (40฿) <span style='color:#ffe000;'>(กันความสุขลด)</span>", lEn: "Smoothie (40฿) <span style='color:#ffe000;'>(Prevent Mood Drop)</span>", action: () => buyDrink("evening_food") },
            { lTh: "ไม่ดื่ม - ประหยัด", lEn: "Don't buy - Save money", action: () => proceedTo("evening_food", "ความคิดของคุณ", "Your Thoughts", "ไม่เอาดีกว่า เปลืองเงิน...", "Better not, too expensive...") }
        ]);
    }
    else if (phase === "evening_food") {
        let willMoodDrop = Math.random() < 0.4;
        let studyTh = doStudy('th', willMoodDrop); 
        let studyEn = doStudy('en', willMoodDrop);
        updateStats(); 
        if (money < 0 || energy <= 0 || moodIndex === 0) return; 
        updateBackground('shopping_district.png'); 

        setStory("ระบบ", "System", 
            `${prevMsgTh}<br><br>${studyTh}<br><br><b>เลิกเรียนแล้ว!</b> ท้องร้องหนักมาก หาอะไรกินก่อนกลับหอดีไหม?`,
            `${prevMsgEn}<br><br>${studyEn}<br><br><b>Classes over!</b> Stomach is growling. Food before going back?`);
        
        let foods = getRandomFoods();
        setButtons([
            { lTh: `กิน ${foods[0].th} (${foods[0].price}฿)`, lEn: `Eat ${foods[0].en} (${foods[0].price}฿)`, action: () => eatFood(foods[0], "evening_travel") },
            { lTh: `กิน ${foods[1].th} (${foods[1].price}฿)`, lEn: `Eat ${foods[1].en} (${foods[1].price}฿)`, action: () => eatFood(foods[1], "evening_travel") },
            { lTh: "ไม่กินอะไรเลย", lEn: "Skip meal", action: () => proceedTo("evening_travel", "ความคิดของคุณ", "Your Thoughts", "กลับไปนอนหอเลยละกัน อดเอา...", "Just heading straight back to bed. I'll endure it...") }
        ]);
    }
    else if (phase === "evening_travel") {
        updateBackground('school_evening.png'); 
        setStory(senderTh, senderEn, 
            `${prevMsgTh}<br><br><span style="color:#eee">เหนื่อยมาทั้งวันแล้ว จะกลับหอยังไงดี?</span>`,
            `${prevMsgEn}<br><br><span style="color:#eee">Exhausted from a long day. How to go back?</span>`);
        setButtons([
            { lTh: "นั่งวินมอไซค์ (20฿) - สบาย", lEn: "Motorcycle Taxi (20฿) - Comfy", action: () => travel("วิน", "end_day") },
            { lTh: "เดินกลับ (ฟรี) - ทรมาน", lEn: "Walk (Free) - Tiring", action: () => travel("เดิน", "end_day") }
        ]);
    }
    else if (phase === "end_day") {
        updateBackground('home_evening.png'); 
        currentDay++; 
        setStory(senderTh, senderEn, 
            `${prevMsgTh}<br><br>เย้! กลับถึงหอแล้ว วันนี้รอดมาได้! พรุ่งนี้ต้องลุยต่อ...`,
            `${prevMsgEn}<br><br>Yay! Back at the dorm safely! Gotta survive tomorrow...`);
        setButtons([
            { lTh: "นอนหลับพักผ่อน", lEn: "Go to sleep", action: sleepAndStartNewDay }
        ]);
    }
}

// ================= ระบบกิจกรรมรอง =================
function travel(method, nextPhase) {
    let msgTh = "", msgEn = "";
    if (method === "วิน") {
        updateMoney(-20);
        msgTh = "นั่งวินมอเตอร์ไซค์แป๊บเดียวก็ถึง สบายจังเลย~ แต่วูบไป 20 บาท";
        msgEn = "Took a motorcycle taxi, arrived in a flash. So comfortable~ but lost 20฿";
    } else {
        if (currentWeather === "sunny") {
            updateEnergy(-20); 
            msgTh = "เดินตากแดดร้อนจัด พลังงานลดลงฮวบๆ เลย! โอ๊ย... จะเป็นลม";
            msgEn = "Walking under the burning sun drains energy fast! Ugh... I'm fainting";
        } else if (currentWeather === "rainy") {
            updateEnergy(-10);
            updateMood(-1); 
            msgTh = "เดินลุยฝนกลับหอ เปียกปอนไปหมด เฉอะแฉะชะมัด!";
            msgEn = "Walking through the rain, got completely soaked. So wet!";
        } else {
            updateEnergy(-10);
            msgTh = "เดินชิวๆ รับลมเย็นๆ ประหยัดเงินได้ตั้ง 20 บาทแหนะ";
            msgEn = "A chill walk with a cool breeze. Saved 20฿!";
        }
    }
    proceedTo(nextPhase, "ความคิดของคุณ", "Your Thoughts", msgTh, msgEn);
}

function buyDrink(nextPhase) {
    updateMoney(-40);
    updateMood(1); 
    moodProtectTurns = 2; // บัฟไม่ให้อารมณ์ตกตอนเรียน
    
    proceedTo(nextPhase, "พ่อค้าน้ำปั่น", "Smoothie Vendor", 
        "ขอบคุณครับน้อง! น้ำปั่นเย็นๆ ชื่นใจ ความสุขพุ่งปรี๊ด!",
        "Thanks! Cold smoothie is so refreshing, happiness stonks!");
}

let lastEnergyDrop = 0; 
function doStudy(lang, willMoodDrop) {
    if (lang === 'th') {
        lastEnergyDrop = randomInt(30, 70); 
        updateEnergy(-lastEnergyDrop);
    }
    let msg = lang === 'th' 
        ? `เข้าเรียนคลาสนี้ทำเอาพลังงานแทบหมด เสียพลังงานไป <b>${lastEnergyDrop}</b>! ` 
        : `Attending this class drained my energy by <b>${lastEnergyDrop}</b>! `;

    if (willMoodDrop) { 
        if (moodProtectTurns > 0) {
            msg += lang === 'th' 
                ? `<br><i>อาจารย์สั่งงานเยอะ แต่ยังอารมณ์ดีจากน้ำปั่นอยู่!`
                : `<br><i>Lots of homework, but the smoothie kept you happy!`;
        } else {
            if (lang === 'th') updateMood(-1);
            msg += lang === 'th' 
                ? `<br><i>แถมอาจารย์สั่งงานเยอะมาก เครียดเลย... ความสุขลดลง 1 ระดับ!`
                : `<br><i>Plus, the prof gave so much homework. Stressed... Happiness drops`;
        }
    }
    return msg;
}

// ================= ฉากจบ =================
function triggerGameOver(senderTh, senderEn, reasonTh, reasonEn) {
    updateBackground('home_evening.png'); 
    bgm.pause(); 
    setStory(senderTh, senderEn, 
        `<b>Game Over!</b> <br>${reasonTh}<br>คุณเอาตัวรอดไปได้ถึงวันที่ ${currentDay}`,
        `<b>Game Over!</b> <br>${reasonEn}<br>You survived until Day ${currentDay}`);
    setButtons([{ lTh: "เริ่มใหม่ (สุ่มเงินทุน)", lEn: "Restart (Spin Fund)", action: startMoneySpin }]);
}

function triggerWin() {
    updateBackground('home_morning.png'); 
    bgm.pause(); 
    setStory("ระบบ", "System", 
        `<b>ยินดีด้วย! </b><br>คุณรอดชีวิตครบ 1 สัปดาห์หฤโหดแล้ว!<br><i>คะแนนของคุณคือเงินเก็บที่เหลือ: <b>${money} บาท</b></i>`,
        `<b>Congratulations! </b><br>You survived the grueling week!<br><i>Your score is your remaining savings: <b>${money} ฿</b></i>`);
    setButtons([{ lTh: "เล่นอีกครั้งเพื่อทำลายสถิติ", lEn: "Play again to beat the record", action: startMoneySpin }]);
}