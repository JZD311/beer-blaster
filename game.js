let nickname = localStorage.getItem('nickname') || null;

// Подключение Supabase
const supabaseUrl = 'https://poqlvcnqbvcnyqlvxekm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcWx2Y25xYnZjbnlxbHZ4ZWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODkwMDYsImV4cCI6MjA2MDM2NTAwNn0.pBPMAQia8jzNT-e-dAT0hJ_t_QrHZUdSMU6JDdcA1JE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM и переменные
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const playerImg = new Image();
playerImg.src = 'player.png';

const enemyImg = new Image();
enemyImg.src = 'enemy.png';

const bossImg = new Image();
bossImg.src = 'boss.png';

const bgImg = new Image();
bgImg.src = 'background.png';

let bgY = 0;
let direction = null;
let gameStarted = false;
let gameOver = false;
let score = 0;
let missedEnemies = 0;
let boss = null;
let bossSpawned = false;
const enemies = [];
let enemySpawnTimer = 0;

const player = {
  x: WIDTH / 2 - 24,
  y: HEIGHT - 70,
  width: 48,
  height: 48,
  speed: 4,
  bullets: [],
};

// Управление тапами
canvas.addEventListener('touchstart', (e) => {
  const x = e.touches[0].clientX;
  direction = (x < window.innerWidth / 2) ? 'left' : 'right';
});
canvas.addEventListener('touchend', () => {
  direction = null;
});

// Автострельба
setInterval(() => {
  if (gameStarted && !gameOver) {
    playerShoot();
  }
}, 400);

function playerShoot() {
  player.bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 7,
  });
}

function startGame() {
  if (!nickname) {
    nickname = prompt("Введи свой ник:");
    if (!nickname) nickname = "Безымянный";
    localStorage.setItem('nickname', nickname);
  }

  document.getElementById('startScreen').style.display = 'none';
  gameOver = false;
  gameStarted = true;
  missedEnemies = 0;
  score = 0;
  boss = null;
  bossSpawned = false;
  enemies.length = 0;
  player.bullets.length = 0;
  loop();
}

// Supabase — сохранить результат
async function saveScore(name, score) {
  const { error } = await supabase.from('scores').insert([{ nickname: name, score }]);
  if (error) console.error('Ошибка сохранения:', error);
}

// Supabase — загрузить топ 10
async function loadLeaderboard() {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);
  if (error) {
    console.error('Ошибка загрузки топа:', error);
    return;
  }
  const leaderboard = document.getElementById('topScores');
  leaderboard.innerHTML = data.map((entry, i) => `${i + 1}) ${entry.nickname}: ${entry.score}`).join('<br>');
}

function update() {
  bgY += 1;
  if (bgY >= HEIGHT) bgY = 0;
  if (!gameStarted || gameOver) return;

  if (direction === 'left') player.x -= player.speed;
  if (direction === 'right') player.x += player.speed;
  player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));

  player.bullets = player.bullets.filter(b => b.y > 0);
  player.bullets.forEach(b => b.y -= b.speed);

  if (++enemySpawnTimer > 30) {
    enemies.push({
      x: Math.random() * (WIDTH - 40),
      y: -40,
      width: 40,
      height: 40,
      speed: 2 + Math.random() * 2,
    });
    enemySpawnTimer = 0;
  }

  enemies.forEach((e, ei) => {
    e.y += e.speed;
    if (e.y > HEIGHT) {
      enemies.splice(ei, 1);
      missedEnemies++;
      if (missedEnemies >= 5) {
        gameOver = true;
      }
    }
  });

  enemies.forEach((enemy, ei) => {
    player.bullets.forEach((bullet, bi) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemies.splice(ei, 1);
        player.bullets.splice(bi, 1);
        score += 100;
      }
    });
  });

  if (score >= 1500 && !bossSpawned) {
    boss = {
      x: WIDTH / 2 - 64,
      y: -128,
      width: 128,
      height: 128,
      speed: 1,
      hp: 30
    };
    bossSpawned = true;
  }

  if (boss) {
    boss.y += boss.speed;
    player.bullets = player.bullets.filter((bullet) => {
      if (!boss) return true;
      if (
        bullet.x < boss.x + boss.width &&
        bullet.x + bullet.width > boss.x &&
        bullet.y < boss.y + boss.height &&
        bullet.y + bullet.height > boss.y
      ) {
        boss.hp -= 1;
        if (boss.hp <= 0) {
          score += 1000;
          boss = null;
        }
        return false;
      }
      return true;
    });
  }

  document.getElementById('score').textContent = `Счёт: ${score} | Пропущено: ${missedEnemies} / 5`;
}

function draw() {
  ctx.drawImage(bgImg, 0, bgY - HEIGHT, WIDTH, HEIGHT);
  ctx.drawImage(bgImg, 0, bgY, WIDTH, HEIGHT);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
  ctx.fillStyle = 'lime';
  player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));
  if (boss) ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
}

function loop() {
  update();
  draw();
  if (!gameOver) {
    requestAnimationFrame(loop);
  } else {
    saveScore(nickname, score);
    loadLeaderboard();
    document.getElementById('startText').innerText = 'Ты проиграл! Попробуешь ещё раз?';
    document.getElementById('startScreen').style.display = 'flex';
    gameStarted = false;
  }
}

loadLeaderboard();
window.startGame = startGame;
