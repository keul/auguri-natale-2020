import Phaser from 'phaser';

window.DEBUG = false;
window.SKIP_TIME = false;

let lastRegeneration = 0;

const DAM_MAX_HP = 1000;

const level = window.location.search.replace('?level=', '') || 'intro';

function getCurrentTime(d) {
  if (!d) {
    d = new Date();
  }
  return `${d.getHours()} e ${d.getMinutes()}`;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

let fireEnabled = false;

const LEVEL_SELECTION = {
  intro: {
    title: "L'Attenzione",
    abstract: 'Dove Marco dovrà guardarsi intorno… con attenzione',
    preload: preload1,
    create: create1,
    update: update,
    height: 768,
  },
  castle: {
    title: "L'Attenzione",
    abstract: 'Dove Marco dovrà mostrare di conoscere la storia',
    preload: preload2,
    create: create2,
    update: update,
    height: 768,
  },
  final: {
    title: 'La pazienza',
    abstract: 'Dove Marco dovrà avere molta, molta pazienza… o no?',
    preload: preload3,
    create: create3,
    update: update3,
    height: 479,
  },
  victory: {
    preload: preload4,
    create: create4,
    update: () => {},
    height: 768,
  },
};

const commandSize = 130;

let dam;

const config = {
  type: Phaser.AUTO,
  width: 1024,
  height: LEVEL_SELECTION[level].height,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    width: 1024,
    height: 768,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  backgroundColor: '#4488AA',
  scene: {
    preload: LEVEL_SELECTION[level].preload,
    create: LEVEL_SELECTION[level].create,
    update: LEVEL_SELECTION[level].update,
  },
};

let player;
let sword;
let clock;
let fireballs;
let stars;
let platforms;
let cursors;
let score = 0;
let scoreText;
let missionText;
let damHPText;
let livesLeft;
let hurtSound;
let swordSound;
let gameOverSound;
let playerHurtSound;

const touchButtons = {
  left: false,
  right: false,
  up: false,
  fire: false,
};
let leftCmd;
let rightCmd;
let upCmd;
let fireCmd;

window.game = new Phaser.Game(config);

function randPlusMinus() {
  return Math.random() < 0.5 ? -1 : 1;
}

function preloadcommon() {
  this.load.audio('chapter', ['assets/chapter.ogg', 'assets/chapter.mp3']);
  this.load.image('vortex', '/assets/vortex.jpg');
}

function preload1() {
  preloadcommon.bind(this)();
  this.load.audio('theme', ['assets/bubblebobble.ogg', 'assets/bubblebobble.mp3']);
  this.load.audio('tick', ['assets/tick.ogg', 'assets/tick.mp3']);
  this.load.image('sky', '/assets/sky.png');
  this.load.image('ground', '/assets/platform.png');
  this.load.image('star', '/assets/star.png');
  this.load.image('bomb', '/assets/bomb.png');
  this.load.spritesheet('dude', '/assets/marco.png', {
    frameWidth: 64,
    frameHeight: 75,
  });
  // commands
  this.load.image('cmd-left', '/assets/left-arrow.png');
  this.load.image('cmd-right', '/assets/right-arrow.png');
  this.load.image('cmd-up', '/assets/up-arrow.png');
}

function preload2() {
  preloadcommon.bind(this)();
  this.load.audio('theme', ['assets/col.ogg', 'assets/col.mp3']);
  this.load.audio('tick', ['assets/tick.ogg', 'assets/tick.mp3']);
  this.load.audio('slash', ['assets/slash.ogg', 'assets/slash.mp3']);
  this.load.audio('hurt', ['assets/hurt.ogg', 'assets/hurt.mp3']);
  this.load.audio('hurt-guy', ['assets/hurt-male.ogg', 'assets/hurt-male.mp3']);
  this.load.audio('gameover', ['assets/gameover.ogg', 'assets/gameover.mp3']);
  this.load.image('ground', '/assets/platform.png');
  this.load.spritesheet('fireball', '/assets/fireball.png', {
    frameWidth: 334 / 2,
    frameHeight: 42,
  });
  this.load.spritesheet('sword', '/assets/sword-sprite.png', {
    frameWidth: 120,
    frameHeight: 78,
  });
  this.load.image('v-ground', '/assets/v-platform.png');
  this.load.image('castle', '/assets/col.jpg');
  this.load.image('torch', '/assets/torch.png');
  this.load.image('v1', '/assets/1.jpg');
  this.load.image('v2', '/assets/2.jpg');
  this.load.image('v3', '/assets/3.jpg');
  this.load.image('v4', '/assets/4.jpg');
  this.load.image('trap', '/assets/open-trap.jpg');
  // this.load.image('dam', '/assets/dam-jabba-sprite.png');
  this.load.spritesheet('dude', '/assets/marco.png', {
    frameWidth: 64,
    frameHeight: 75,
  });
  this.load.spritesheet('dam', '/assets/dam-jabba-sprite.png', {
    frameWidth: 240,
    frameHeight: 178,
  });
  // commands
  this.load.image('cmd-left', '/assets/left-arrow.png');
  this.load.image('cmd-right', '/assets/right-arrow.png');
  this.load.image('cmd-fire', '/assets/plus.png');
  this.load.image('cmd-up', '/assets/up-arrow.png');
}

function preload3() {
  preloadcommon.bind(this)();
  this.load.audio('clock-tick', ['assets/tick.ogg', 'assets/tick.mp3']);
  this.load.image('bedroom', '/assets/bedroom.jpg');
  this.load.spritesheet('clock', '/assets/clock.png', {
    frameWidth: 48,
    frameHeight: 46,
  });
  this.load.image('dude', '/assets/marco-static.png');
}

function preload4() {
  this.load.audio('theme', ['assets/ringbell.ogg', 'assets/ringbell.mp3']);
  this.load.image('buonnatale', '/assets/buonnatale.jpg');
}

/* ******* UPDATE ******* */

function getSwordPosition(sword, player) {
  const playerPosition = player.getRightCenter();
  return {
    x: playerPosition.x + 8,
    y: playerPosition.y + 16,
  };
}

function update(time, delta) {
  if (player && player.active) {
    if (player.hit && !player.wound) {
      player.wound = true;
      player.setVelocity(-360, -260);
      player.setTintFill(0xff3333, 0xffffff);
      setTimeout(() => {
        player.clearTint();
        player.wound = false;
        player.hit = false;
      }, 1700);
    } else if (!player.wound && (cursors.left.isDown || touchButtons.left)) {
      player.setVelocityX(-160);
      player.anims.play('left', true);
    } else if (!player.wound && (cursors.right.isDown || touchButtons.right)) {
      player.setVelocityX(160);
      player.anims.play('right', true);
    } else if (!player.wound) {
      player.setVelocityX(0);
      player.anims.play('turn');
    }

    if (!player.wound && player.isFiring) {
      const swordPosition = getSwordPosition(sword, player);
      sword.setPosition(swordPosition.x, swordPosition.y);
      // Check monster hit
      const hitIntersection = Phaser.Geom.Rectangle.Intersection(
        sword.getBounds(),
        dam.getBounds()
      );
      if (hitIntersection.width > 0 && !dam.hitEffect) {
        hurtSound.play();
        dam.setTintFill(0xff3333, 0xffffff);
        dam.hitEffect = true;
        setTimeout(() => {
          dam.clearTint();
        }, 300);
      }
    }

    if (
      !player.wound &&
      fireEnabled &&
      !player.isFiring &&
      (cursors.space.isDown || touchButtons.fire)
    ) {
      player.setVelocityX(player.body.velocity.x / 2);
      player.setVelocityY(player.body.velocity.y / 2);
      player.isFiring = true;
      swordSound.play();
      const swordPosition = getSwordPosition(sword, player);
      sword = this.add.sprite(swordPosition.x, swordPosition.y, 'sword').setScale(0.75);
      sword.on('animationcomplete', (anim, frame) => {
        player.isFiring = false;
        sword.destroy();
        sword = null;
        if (dam.hitEffect) {
          dam.clearTint();
          dam.hitPoints -= randInt(2, 5);
          damHPText.setText(dam.hitPoints + 'HP');
          dam.hitEffect = false;
        }
      });
      sword.anims.play('slash');
    }

    if ((cursors.up.isDown || touchButtons.up) && !player.wound && player.body.touching.down) {
      player.setVelocityY(-330);
    }
  }

  if (dam && dam.active) {
    if (!dam.firing && !dam.sleepFire) {
      dam.firing = true;
      setTimeout(
        () => {
          dam.firing = false;
          const fireball = fireballs.get();
          if (fireball) {
            fireball.fire(dam.x + 60, dam.y - 20);
          }
        },
        dam.hitPoints < 100 ? randInt(2500, 5000) : randInt(4500, 8000)
      );
    }
    dam.anims.play('tail', true);
    if (time > lastRegeneration) {
      lastRegeneration = time + 5000;
      dam.hitPoints += dam.hitPoints < 100 ? randInt(1, 5) : 1;
      if (dam.hitPoints > DAM_MAX_HP) {
        dam.hitPoints = DAM_MAX_HP;
      }
      damHPText.setText(dam.hitPoints + 'HP');
    }
  }
}

function update3() {
  if (clock) {
    clock.anims.play('blink', true);
  }
}

/**
 * Intro charper
 */
async function introChapter(number, title, abstract) {
  const music = this.sound.add('chapter');
  music.play();
  const bg = this.add.image(config.width / 2, config.height / 2 - commandSize, 'vortex');
  const chapterText = this.add
    .text(config.width / 2, 50, 'Parte ' + number, {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#ccffcc',
      backgroundColor: 'rgba(0,0,0,0.2)',
    })
    .setOrigin(0.5, 0);
  const titleText = this.add
    .text(config.width / 2, 250, title, {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#ccffcc',
      backgroundColor: 'rgba(0,0,0,0.5)',
    })
    .setOrigin(0.5, 0);
  const abstractText = this.add
    .text(config.width / 2, 300, abstract, {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#ccffcc',
      backgroundColor: 'rgba(0,0,0,0.5)',
    })
    .setOrigin(0.5, 0);

  return new Promise((resolve) => {
    if (window.DEBUG) {
      music.stop();
      resolve();
      return;
    }
    music.on('complete', () => {
      setTimeout(() => {
        bg.destroy();
        chapterText.destroy();
        titleText.destroy();
        abstractText.destroy();
        resolve();
      }, 1000);
    });
  });
}

/**
 * Level 1
 */
async function create1() {
  await introChapter.bind(this)(1, LEVEL_SELECTION.intro.title, LEVEL_SELECTION.intro.abstract);

  const music = this.sound.add('theme', {
    loop: true,
  });
  music.play();

  const sound = this.sound.add('tick', {
    loop: false,
  });

  this.add.image(config.width / 2, config.height / 2 - commandSize, 'sky');
  this.input.addPointer(2);

  platforms = this.physics.add.staticGroup();

  // Ground
  platforms
    .create(512, 768 - 20 - commandSize, 'ground')
    .setScale(2, 1)
    .refreshBody();

  platforms.create(500, 580 - commandSize, 'ground');
  platforms.create(50, 450 - commandSize, 'ground');
  platforms.create(800, 365 - commandSize, 'ground');

  const createTouchButton = (position, id, direction) => {
    const button = this.add.image(position[0], position[1], id);
    const frame = button.frame;
    const hitArea = new Phaser.Geom.Rectangle(frame.x, frame.y, frame.width, frame.height);
    button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', function () {
      touchButtons[direction] = true;
    });
    const _handleButtonUp = () => {
      touchButtons[direction] = false;
    };
    button.on('pointerup', _handleButtonUp);
    button.on('pointerout', _handleButtonUp);
    return button;
  };

  leftCmd = createTouchButton([10 + 128 / 2, config.height - 128 / 2], 'cmd-left', 'left');
  rightCmd = createTouchButton(
    [10 + 128 + 10 + 128 / 2, config.height - 128 / 2],
    'cmd-right',
    'right'
  );

  upCmd = createTouchButton(
    [config.width - 128 - 10 + 128 / 2, config.height - 128 / 2],
    'cmd-up',
    'up'
  );

  player = this.physics.add.sprite(75, 450, 'dude');

  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: 'turn',
    frames: [{ key: 'dude', frame: 4 }],
    frameRate: 20,
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  cursors = this.input.keyboard.createCursorKeys();

  stars = this.physics.add.group({
    key: 'star',
    repeat: 11,
    setXY: { x: 12, y: 0, stepX: 65 },
  });
  const hiddenStar = this.add.image(config.width / 2 + 95, config.height - 35, 'star');
  const hitArea = new Phaser.Geom.Rectangle(
    hiddenStar.frame.x - 100,
    hiddenStar.frame.y - 150,
    hiddenStar.frame.width + 100,
    150 + hiddenStar.frame.height
  );
  hiddenStar.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  hiddenStar.on('pointerdown', (pointer) => {
    this.clickCount = (this.clickCount || 0) + 1;
    hiddenStar.setPosition(
      hiddenStar.x + randPlusMinus() * parseInt(Phaser.Math.FloatBetween(0, 2), 10),
      hiddenStar.y + parseInt(Phaser.Math.FloatBetween(3, 6), 10)
    );
  });
  hiddenStar.on('pointerup', (pointer) => {
    sound.play();
    if (this.clickCount === 3) {
      hiddenStar.removeAllListeners();
      this.physics.add.existing(hiddenStar);
      hiddenStar.off('pointerdown');
      setTimeout(() => {
        const newStar = this.physics.add.sprite(24, 22, 'star');
        newStar.setPosition(config.width - 100, -100);
        stars.add(newStar, true);
        newStar.setBounceY(0.9);
      }, 3000);
    }
  });

  stars.children.iterate(function (child) {
    child.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4));
  });

  scoreText = this.add.text(16, 16, 'Stelle toccate: 0', {
    fontSize: '32px',
    fill: '#000',
  });

  missionText = this.add
    .text(config.width / 2, config.height - 32, 'Tocca 13', {
      fontSize: '32px',
      fill: '#000',
    })
    .setOrigin(0.5);

  this.physics.add.collider(player, platforms);
  this.physics.add.collider(stars, platforms);

  function collectStar(player, star) {
    star.disableBody(true, true);

    score += 1;
    if (score === 13) {
      scoreText.setText('Livello 1 Completato!');
      setTimeout(() => {
        window.location.href = window.location.pathname + '?level=castle';
      }, 5000);
    } else {
      scoreText.setText('Stelle toccate: ' + score);
    }
  }

  this.physics.add.overlap(player, stars, collectStar, null, this);
}

/**
 * Level 2
 */
async function create2() {
  await introChapter.bind(this)(2, LEVEL_SELECTION.castle.title, LEVEL_SELECTION.castle.abstract);
  this.add.image(0, 0, 'castle').setOrigin(0, 0);
  this.input.addPointer(3);
  fireEnabled = true;

  const music = this.sound.add('theme', {
    loop: true,
  });
  music.play();

  const sound = this.sound.add('tick', {
    loop: false,
  });

  hurtSound = this.sound.add('hurt', {
    loop: false,
  });

  playerHurtSound = this.sound.add('hurt-guy', {
    loop: false,
  });

  gameOverSound = this.sound.add('gameover', {
    loop: false,
  });

  swordSound = this.sound.add('slash', {
    loop: false,
  });

  platforms = this.physics.add.staticGroup();
  platforms.create(350, 470, 'ground');
  platforms.create(100, 400, 'v-ground');
  platforms.children.iterate((children) => {
    children.setAlpha(0);
  });

  dam = this.physics.add.sprite(570, 330, 'dam');
  dam.hitPoints = DAM_MAX_HP;
  damHPText = this.add.text(dam.x + 20, dam.y - 30, dam.hitPoints + 'HP', {
    fontSize: '20px',
    fill: 'red',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255, 0.6)',
  });
  dam.setCollideWorldBounds(true);
  dam.setBounce(0.2);

  const Fireball = new Phaser.Class({
    Extends: Phaser.GameObjects.Sprite,

    initialize: function Bullet(scene) {
      Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'fireball');
      this.setScale(0.7);
      this.anims.play('fireball-move');
    },

    fire: function (x, y) {
      this.setPosition(x - 50, y + 12);
      this.speedX =
        dam.hitPoints < 500 ? Phaser.Math.GetSpeed(300, 1) : Phaser.Math.GetSpeed(200, 1);
      this.speedY = Phaser.Math.GetSpeed(30, 1);
      this.direction = randPlusMinus();
      if (this.direction === -1) {
        this.speedY = Phaser.Math.GetSpeed(10, 1);
      }
      this.setActive(true);
      this.setVisible(true);
    },

    update: function (time, delta) {
      this.x -= this.speedX * delta;
      this.y -= this.speedY * this.direction * delta;

      if (this.x < 150) {
        this.setActive(false);
        this.setVisible(false);
      }
    },
  });

  fireballs = this.physics.add.group({
    classType: Fireball,
    maxSize: 1,
    runChildUpdate: true,
    allowGravity: false,
  });

  const createTouchButton = (position, id, direction) => {
    const button = this.add.image(position[0], position[1], id);
    const frame = button.frame;
    const hitArea = new Phaser.Geom.Rectangle(frame.x, frame.y, frame.width, frame.height);
    button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', function () {
      touchButtons[direction] = true;
    });
    const _handleButtonUp = () => {
      touchButtons[direction] = false;
    };
    button.on('pointerup', _handleButtonUp);
    button.on('pointerout', _handleButtonUp);
    return button;
  };

  let lives = 4;
  livesLeft = this.add.image(417, 583, 'v4');

  const torch = this.add.image(326, 310, 'torch');
  const hitArea = new Phaser.Geom.Rectangle(
    torch.frame.x - torch.frame.width / 2,
    torch.frame.y - torch.frame.height / 2,
    torch.frame.width * 2,
    torch.frame.height * 1.5
  );
  torch.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
  torch.on('pointerdown', (pointer) => {
    this.touched = (this.touched || 0) + 1;
    sound.play();
    if (this.touched === 5) {
      torch.setPosition(torch.x, torch.y + 20);
      this.add.image(515, 394, 'trap');
      dam.depth = 1;
      player.depth = 1;
      dam.setCollideWorldBounds(false);
      // dam.destroy(true);
      const plat = platforms.children.get(0);
      platforms.children.clear();
      platforms.create(350 - 165, 470, 'ground');
      platforms.create(100, 400, 'v-ground');
      platforms.children.iterate((children) => {
        children.setAlpha(0);
      });
      plat.setPosition(plat.x - 165, plat.y);
      this.physics.world.colliders.removeAll();
      this.physics.add.collider(player, platforms);
      missionText.setText('Livello 2 Completato!');
      setTimeout(() => {
        window.location.href = window.location.pathname + '?level=final';
      }, 5000);
    }
  });

  leftCmd = createTouchButton([10 + 128 / 2, config.height - 128 / 2], 'cmd-left', 'left');
  rightCmd = createTouchButton(
    [10 + 128 + 10 + 128 / 2, config.height - 128 / 2],
    'cmd-right',
    'right'
  );

  upCmd = createTouchButton(
    [config.width - 128 * 2 - 10 + 128 / 2, config.height - 128 / 2],
    'cmd-up',
    'up'
  );

  fireCmd = createTouchButton(
    [config.width - 128 - 10 + 128 / 2, config.height - 128 / 2],
    'cmd-fire',
    'fire'
  );

  player = this.physics.add.sprite(160, 400, 'dude');

  player.setBounce(0.2);
  player.setCollideWorldBounds(true);

  this.anims.create({
    key: 'left',
    frames: this.anims.generateFrameNumbers('dude', { start: 8, end: 5 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: 'turn',
    frames: [{ key: 'dude', frame: 5 }],
    frameRate: 20,
  });

  this.anims.create({
    key: 'right',
    frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
    frameRate: 10,
    repeat: -1,
  });

  this.anims.create({
    key: 'tail',
    frames: this.anims.generateFrameNumbers('dam', { start: 0, end: 1 }),
    frameRate: 5,
    repeat: -1,
  });

  this.anims.create({
    key: 'slash',
    frames: this.anims.generateFrameNumbers('sword', { start: 0, end: 1 }),
    frameRate: 7,
    repeat: 1,
  });

  this.anims.create({
    key: 'fireball-move',
    frames: this.anims.generateFrameNumbers('fireball', { start: 0, end: 1 }),
    frameRate: 20,
    repeat: -1,
  });

  cursors = this.input.keyboard.createCursorKeys();

  missionText = this.add.text(16, 16, "Sconfiggi l'Orribile Mostro", {
    fontSize: '32px',
    fill: '#babf87',
    fontWeight: 'bold',
  });

  const playerCollider = this.physics.add.collider(player, platforms);
  this.physics.add.collider(dam, platforms);
  this.physics.add.collider(fireballs, platforms);

  function kill(playerSprite, painSource) {
    if (player.hit || !painSource.active) {
      return;
    }
    playerHurtSound.play();
    player.hit = true;
    lives--;
    if (lives === 0) {
      missionText.setText('Game Over!');
      gameOverSound.play();
      this.physics.world.removeCollider(playerCollider);
      player.setCollideWorldBounds(false);
      if (sword) {
        sword.destroy();
      }
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } else {
      livesLeft.destroy(true);
      livesLeft = this.add.image(417, 583, 'v' + lives);
    }
  }

  this.physics.add.overlap(player, fireballs, kill, null, this);
  this.physics.add.overlap(player, dam, kill, null, this);
}

/**
 * Level 3
 */
async function create3() {
  await introChapter.bind(this)(3, LEVEL_SELECTION.final.title, LEVEL_SELECTION.final.abstract);
  const now = new Date();
  const future = new Date();
  future.setMinutes(future.getMinutes() + (52 + 19 * 60));
  this.add.image(0, 0, 'bedroom').setOrigin(0, 0);
  player = this.add.image(490, 235, 'dude');
  player.setRotation(0.25);
  player.setScale(1.3);

  const text = [
    'Eccellente Marco! 👏',
    'Il premio è quasi tuo…',
    'Ma ora devi avere… PAZIENZA!',
    'Ora riposati…',
    "Potrai riscuotere il tuo regalo tra un po'…",
    'Esattamente tra 19 ore e 52 minuti',
    'Ora sono le ' + getCurrentTime(now),
    'Questo significa: alle ' + getCurrentTime(future),
    'Ma attento!',
    'Se lasci il gioco per più di un minuto…',
    'Dovrai ricominciare!',
    'Devi avere pazienza… 👋',
  ];

  const baloonTexts = [
    'TIME',
    'TIME',
    'Uff… TIME',
    'TIME',
    'Sono le… ugh. TIME',
    'TIME e SECS secondi…',
    'Le TIME…',
    'TIME',
    'Non sono sicuro di avere abbastanza pazienza…',
    'Vorrei fossero già le ' + getCurrentTime(future),
    'Se solo ci fosse un modo per accelerare il tempo…',
  ];

  const music = this.sound.add('clock-tick', {
    // rate: 0.3,
    loop: false,
  });
  music.on('complete', () => {
    setTimeout(() => {
      music.play();
    }, 1000);
  });
  music.play();

  clock = this.add.sprite(700, 115, 'clock');
  this.anims.create({
    key: 'blink',
    frames: this.anims.generateFrameNumbers('clock', { start: 0, end: 1 }),
    frameRate: 2,
    repeat: -1,
    showOnStart: true,
  });
  const clockHitArea = new Phaser.Geom.Rectangle(
    clock.frame.x - clock.frame.width,
    clock.frame.y - clock.frame.height,
    clock.frame.width * 2,
    clock.frame.height * 2
  );
  clock.hitTimes = 0;
  clock.setInteractive(clockHitArea, Phaser.Geom.Rectangle.Contains);
  let baloonInterval = null;
  clock.on('pointerdown', () => {
    if (missionText.textStep <= text.length || baloonInterval) {
      return;
    }
    if (clock.hitTimes + 1 > baloonTexts.length) {
      clock.hitTimes = 0;
    }
    const nextText = baloonTexts[clock.hitTimes];
    clock.hitTimes++;
    const now = new Date();
    // Victory!
    if (now.getTime() > future.getTime() || window.SKIP_TIME) {
      missionText.setText('Livello 3 Completato!\n(Non è che hai barato, vero?)');
      setTimeout(() => {
        window.location.href = window.location.pathname + '?level=victory';
      }, 5000);
      baloonText.setText('HOORAY! LE TIME!!!!'.replace('TIME', getCurrentTime(now)));

      return;
    }
    baloonText.setText(
      nextText.replace('TIME', getCurrentTime(now)).replace('SECS', now.getSeconds().toString())
    );
    baloonInterval = setTimeout(
      () => {
        baloonInterval = null;
        baloonText.setText('');
      },
      window.DEBUG ? 500 : 3000
    );
  });

  const baloonText = this.add
    .text(510, 160, '', {
      fontSize: '26px',
      backgroundColor: 'white',
      color: 'black',
    })
    .setOrigin(0.5);
  baloonText.setRotation(0.25);

  missionText = this.add
    .text(config.width / 2, config.height - 55, text[0], {
      fontSize: '32px',
      align: 'center',
    })
    .setOrigin(0.5);
  missionText.textStep = 0;
  const textHitArea = new Phaser.Geom.Rectangle(
    missionText.frame.x,
    missionText.frame.y,
    missionText.frame.width,
    missionText.frame.height
  );
  function adjustInteraction() {
    const nextText = text[missionText.textStep] || '';
    missionText.textStep++;
    if (!nextText) {
      missionText.off('pointerdown');
    }
    const toDisplay = nextText.replace('TIME', getCurrentTime(now));
    missionText.setText(toDisplay);
    textHitArea.setTo(
      missionText.frame.x,
      missionText.frame.y - 30,
      missionText.frame.width,
      missionText.frame.height + 30
    );
    missionText.disableInteractive();
    missionText.setInteractive(textHitArea, Phaser.Geom.Rectangle.Contains);
  }
  adjustInteraction();
  missionText.on('pointerdown', adjustInteraction);
}

/**
 * Level Finale
 */
function create4() {
  this.add.image(0, 0, 'buonnatale').setOrigin(0, 0);
  const music = this.sound.add('theme');
  music.play();
  const height = 50;
  missionText = this.add
    .text(config.width / 2, 100, 'Ben fatto!', {
      fontSize: '38px',
      color: 'lightblue',
    })
    .setOrigin(0.5, 0);
  missionText = this.add
    .text(
      config.width / 2,
      100 + height + missionText.frame.height,
      'Ti sei guadagnato il regalo!',
      {
        fontSize: '32px',
        backgroundColor: 'rgba(0,0,0,0.3)',
      }
    )
    .setOrigin(0.5, 0);
  missionText = this.add
    .text(
      config.width / 2,
      100 + height * 2 + missionText.frame.height,
      'Devi scrivere una cosa nel gruppo della Famiglia',
      {
        fontSize: '32px',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }
    )
    .setOrigin(0.5, 0);
  missionText = this.add
    .text(
      config.width / 2,
      100 + height * 3 + missionText.frame.height,
      '"Il mio colore preferito è…"',
      {
        fontSize: '32px',
        fontStyle: 'italic',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }
    )
    .setOrigin(0.5, 0);
  missionText = this.add
    .text(
      config.width / 2,
      100 + height * 4 + missionText.frame.height,
      '…seguito dal tuo "colore preferito"',
      {
        fontSize: '32px',
        fontStyle: 'italic',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }
    )
    .setOrigin(0.5, 0);
}
