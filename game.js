// Empire of Shadows - rebalanced takeover + crew visibility + layered crimes

const RANKS = ['Small Hustler', 'Street Rat', 'Thug', 'Gangster', 'Capo', 'Underboss', 'Don'];
const LEVEL_THRESHOLDS = [0, 120, 320, 700, 1200, 1900, 2800, 3800];

const CREW_TYPES = [
  { id: 'thug', name: 'Street Thug', unlockLevel: 1, cost: 140, attack: 2, intimidation: 3 },
  { id: 'gangster', name: 'Gangster', unlockLevel: 2, cost: 360, attack: 4, intimidation: 5 },
  { id: 'enforcer', name: 'Enforcer', unlockLevel: 4, cost: 650, attack: 7, intimidation: 6 },
  { id: 'soldier', name: 'Soldier', unlockLevel: 6, cost: 1300, attack: 11, intimidation: 5 },
  { id: 'bodyguard', name: 'Bodyguard', unlockLevel: 5, cost: 950, attack: 3, intimidation: 4 }
];

const PROPERTY_TYPES = [
  { id: 'bar', name: 'Bar', price: 2500, incomePerMinute: 5, storage: 260 },
  { id: 'nightclub', name: 'Nightclub', price: 20000, incomePerMinute: 15, storage: 600 },
  { id: 'warehouse', name: 'Warehouse', price: 50000, incomePerMinute: 28, storage: 1200 },
  { id: 'gambling-house', name: 'Gambling House', price: 85000, incomePerMinute: 42, storage: 1800 },
  { id: 'casino', name: 'Casino', price: 250000, incomePerMinute: 85, storage: 4200 }
];

const SMALL_HUSTLES = [
  { id: 'pony-packs', name: 'Dealing Pony Packs', desc: 'Quick handoffs in alley shadows.', money: [18, 44], xp: [6, 10], cooldownMs: 60000, minLevel: 1 },
  { id: 'street-corner', name: 'Running a Street Corner', desc: 'Push product and dodge patrol routes.', money: [22, 52], xp: [7, 12], cooldownMs: 60000, minLevel: 1 },
  { id: 'parked-cars', name: 'Stealing from Parked Cars', desc: 'Fast smash-and-grab before dawn.', money: [20, 48], xp: [6, 11], cooldownMs: 60000, minLevel: 1 },
  { id: 'illegal-bets', name: 'Collecting Illegal Bets', desc: 'Shake down bettors behind bars and shops.', money: [24, 56], xp: [8, 12], cooldownMs: 60000, minLevel: 1 }
];

const MEDIUM_HUSTLES = [
  { id: 'poker-scam', name: 'Backroom Poker Scam', desc: 'Stacked deck, marked cards, quick exit.', money: [140, 280], xp: [24, 40], cooldownMs: 8 * 60 * 1000, minLevel: 3 },
  { id: 'contraband-run', name: 'Warehouse Contraband Run', desc: 'Move hot cargo through quiet blocks.', money: [180, 360], xp: [28, 44], cooldownMs: 10 * 60 * 1000, minLevel: 4 },
  { id: 'truck-hijack', name: 'Truck Hijack Setup', desc: 'Interception with a violent fallback.', money: [220, 420], xp: [32, 52], cooldownMs: 12 * 60 * 1000, minLevel: 5 }
];

const HEISTS = [
  { id: 'jewelry-job', name: 'Jewelry Store Robbery', desc: 'Glass, steel, and high-risk getaway.', money: [900, 2200], xp: [90, 140], durationMs: 2 * 60 * 1000, cooldownMs: 60 * 60 * 1000 },
  { id: 'armored-hit', name: 'Armored Van Hit', desc: 'Road block ambush with heavy response.', money: [1200, 2800], xp: [110, 170], durationMs: 2.5 * 60 * 1000, cooldownMs: 60 * 60 * 1000 },
  { id: 'casino-room', name: 'Casino Cash Room Robbery', desc: 'Inside contact and timed extraction.', money: [1500, 3400], xp: [130, 190], durationMs: 3 * 60 * 1000, cooldownMs: 60 * 60 * 1000 }
];

const REGION_LAYOUT = {
  Downtown: { x: 35, y: 16, w: 30, h: 24 },
  Harbor: { x: 6, y: 56, w: 34, h: 28 },
  Chinatown: { x: 60, y: 54, w: 34, h: 28 },
  'Industrial Zone': { x: 6, y: 18, w: 24, h: 30 },
  'Old Town': { x: 72, y: 16, w: 22, h: 30 }
};

// Rebalanced region progression.
const REGION_DEFS = [
  { name: 'Old Town', danger: 2, wealth: 3, police: 2, difficultyTag: 'Easy', governmentDefended: false, rivalPressure: 'Low', takeoverMod: -16, bonus: 'Best beginner foothold' },
  { name: 'Chinatown', danger: 3, wealth: 5, police: 3, difficultyTag: 'Easy (Rival Heavy)', governmentDefended: false, rivalPressure: 'High', takeoverMod: -9, bonus: 'Many gangs, but open alleys' },
  { name: 'Downtown', danger: 7, wealth: 9, police: 7, difficultyTag: 'Difficult', governmentDefended: false, rivalPressure: 'High', takeoverMod: 8, bonus: 'High-end profits' },
  { name: 'Industrial Zone', danger: 9, wealth: 8, police: 8, difficultyTag: 'Very Difficult', governmentDefended: true, rivalPressure: 'Medium', takeoverMod: 16, bonus: 'Government checkpoints' },
  { name: 'Harbor', danger: 9, wealth: 8, police: 9, difficultyTag: 'Very Difficult', governmentDefended: true, rivalPressure: 'High', takeoverMod: 18, bonus: 'Naval patrol pressure' }
];

const STREET_NAMES = {
  Downtown: ['King Ave', 'Mercer Alley', 'Union Blvd', 'Silver Court', 'Embassy Row'],
  Harbor: ['Dockline Road', 'Salt Market', 'Anchor Street', 'Pier 7 Lane', 'Captain Way'],
  Chinatown: ['Lotus Road', 'Temple Court', 'Red Lantern St', 'Silk Passage', 'Dragon Gate'],
  'Industrial Zone': ['Iron Yard', 'Foundry Street', 'Boiler Avenue', 'Coal Belt', 'Machine Row'],
  'Old Town': ['Bell Tower Rd', 'Cobble Street', 'Raven Square', 'Cathedral Lane', 'Heritage Way']
};

const SHOP_TYPES = ['Grocery', 'Bar', 'Mechanic', 'Restaurant', 'Pawn Shop', 'Electronics Store'];

const player = {
  level: 1,
  rank: RANKS[0],
  money: 900,
  xp: 0,
  reputation: 0,
  selectedRegion: 'Old Town',
  selectedStreetId: null,
  log: [],
  crewMembers: []
};

const state = {
  regions: createRegions(),
  now: Date.now(),
  crimes: { cooldowns: {}, activeHeist: null }
};

let crewCounter = 1;

function createRegions() {
  return REGION_DEFS.map((regionDef, index) => {
    const streets = STREET_NAMES[regionDef.name].map((streetName, i) => {
      const baseDefense = 14 + regionDef.danger * 4 + i * 3 + regionDef.takeoverMod;
      const rivalOwned = regionDef.name === 'Chinatown' ? i >= 2 : i >= 3;
      return {
        id: `${regionDef.name}-${streetName}`.replace(/\s+/g, '-').toLowerCase(),
        name: streetName,
        region: regionDef.name,
        difficulty: baseDefense,
        ownerType: rivalOwned ? 'rival' : (i % 2 === 0 ? 'neutral' : 'rival'),
        controlState: 'contested',
        shops: createShops(streetName, 3 + ((index + i) % 8), regionDef.wealth, regionDef.danger),
        requiredCrewPresence: Math.max(1, Math.floor(baseDefense / 18)),
        takeoverCooldownEnd: 0
      };
    });

    return {
      ...regionDef,
      controlState: 'contested',
      properties: PROPERTY_TYPES.map((p) => ({ ...p, owned: 0, storedMoney: 0, lastUpdate: Date.now() })),
      streets,
      shopNetwork: streets.reduce((sum, s) => sum + s.shops.length, 0)
    };
  });
}

function createShops(streetName, count, wealth, danger) {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${streetName}-${i}`.replace(/\s+/g, '-').toLowerCase(),
    shopName: `${SHOP_TYPES[i % SHOP_TYPES.length]} #${i + 1}`,
    shopType: SHOP_TYPES[i % SHOP_TYPES.length],
    intimidationLevel: danger + Math.floor(Math.random() * 4),
    paymentStatus: 'not approached',
    assignedGangster: null,
    actingCrewId: null,
    actionEnd: 0,
    incomePerMinute: Math.max(1, Math.min(4, 1 + Math.floor((wealth + (i % 3)) / 5))),
    storedMoney: 0,
    storageCapacity: 24 + Math.floor(Math.random() * 18) + wealth * 2,
    lastUpdate: Date.now()
  }));
}

function addCrewMember(typeId, region) {
  const type = CREW_TYPES.find((c) => c.id === typeId);
  player.crewMembers.push({
    id: `${type.name.split(' ')[0].toUpperCase()}-${String(crewCounter++).padStart(3, '0')}`,
    type: typeId,
    typeName: type.name,
    region,
    streetId: null,
    status: 'Available',
    recoveryEnd: 0
  });
}

for (let i = 0; i < 6; i += 1) addCrewMember('thug', 'Old Town');

const ui = {
  levelValue: document.getElementById('levelValue'),
  rankValue: document.getElementById('rankValue'),
  moneyValue: document.getElementById('moneyValue'),
  respectValue: document.getElementById('respectValue'),
  reputationValue: document.getElementById('reputationValue'),
  regionMap: document.getElementById('regionMap'),
  regionMeta: document.getElementById('regionMeta'),
  regionCrewSummary: document.getElementById('regionCrewSummary'),
  selectedRegionLabel: document.getElementById('selectedRegionLabel'),
  selectedStreetLabel: document.getElementById('selectedStreetLabel'),
  propertyRegionLabel: document.getElementById('propertyRegionLabel'),
  streetList: document.getElementById('streetList'),
  shopList: document.getElementById('shopList'),
  crewPanel: document.getElementById('crewPanel'),
  propertyList: document.getElementById('propertyList'),
  crimePanel: document.getElementById('crimePanel'),
  activityLog: document.getElementById('activityLog'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalClose: document.getElementById('modalClose')
};

const fmtMoney = (v) => `$${Math.floor(v).toLocaleString()}`;
const getRegion = () => state.regions.find((r) => r.name === player.selectedRegion);
const getStreet = (region, id) => region.streets.find((s) => s.id === id);
const secondsLeft = (end) => Math.max(0, Math.ceil((end - state.now) / 1000));
const randRange = ([min, max]) => min + Math.floor(Math.random() * (max - min + 1));

function addLog(text) {
  player.log.unshift(`[${new Date().toLocaleTimeString()}] ${text}`);
  player.log = player.log.slice(0, 60);
}

function showModal(title, message) {
  ui.modalTitle.textContent = title;
  ui.modalMessage.textContent = message;
  ui.modal.classList.remove('hidden');
}

function getRankBonus() { return RANKS.indexOf(player.rank) * 2.5; }

function recalcLevel() {
  let lv = 1;
  LEVEL_THRESHOLDS.forEach((threshold, idx) => { if (player.xp >= threshold) lv = idx + 1; });
  if (lv !== player.level) {
    player.level = lv;
    player.rank = RANKS[Math.min(RANKS.length - 1, lv - 1)];
    showModal('Level Up', `You reached level ${lv} (${player.rank}).`);
    addLog(`Level up to ${player.rank}.`);
  }
}

function syncCrewRecovery() {
  player.crewMembers.forEach((member) => {
    if (member.status === 'Recovering' && member.recoveryEnd > 0 && state.now >= member.recoveryEnd) {
      member.status = 'Available';
      member.recoveryEnd = 0;
      addLog(`${member.id} recovered and is available again.`);
    }
  });
}

function getCrewInRegion(regionName) {
  return player.crewMembers.filter((m) => m.region === regionName || m.status === 'On Heist');
}

function getRegionCrewSummary(regionName) {
  const members = getCrewInRegion(regionName);
  const total = members.length;
  const available = members.filter((m) => m.status === 'Available').length;
  const assigned = members.filter((m) => m.status === 'Assigned to street' || m.status === 'Assigned to shop intimidation').length;
  const unavailable = members.filter((m) => m.status === 'On hustle' || m.status === 'On heist' || m.status === 'Recovering').length;
  const arrested = members.filter((m) => m.status === 'Arrested').length;
  const killed = members.filter((m) => m.status === 'Killed').length;
  return { total, available, assigned, unavailable, arrested, killed };
}

function findAvailableCrew(typeId, regionName, count = 1) {
  return player.crewMembers.filter((m) => m.type === typeId && m.region === regionName && m.status === 'Available').slice(0, count);
}

function getCrewPowerForStreet(street) {
  return player.crewMembers
    .filter((m) => m.streetId === street.id && (m.status === 'Assigned to street' || m.status === 'Assigned to shop intimidation'))
    .reduce((sum, m) => sum + CREW_TYPES.find((c) => c.id === m.type).attack, 0);
}

function getAssignedCountForStreet(street) {
  return player.crewMembers.filter((m) => m.streetId === street.id && (m.status === 'Assigned to street' || m.status === 'Assigned to shop intimidation')).length;
}

function updateEconomyStorage() {
  state.now = Date.now();
  const incomeBoost = 1 + Math.floor(player.level / 4) * 0.1;

  state.regions.forEach((region) => {
    region.streets.forEach((street) => {
      const streetMax = street.shops.reduce((sum, s) => sum + s.storageCapacity, 0);
      const streetStored = street.shops.reduce((sum, s) => sum + s.storedMoney, 0);
      street.shops.forEach((shop) => {
        const elapsed = (state.now - shop.lastUpdate) / 60000;
        if (elapsed > 0 && shop.paymentStatus === 'paying protection' && streetStored < streetMax) {
          shop.storedMoney = Math.min(shop.storageCapacity, shop.storedMoney + shop.incomePerMinute * incomeBoost * elapsed);
        }
        shop.lastUpdate = state.now;
      });
    });

    region.properties.forEach((property) => {
      if (property.owned < 1) { property.lastUpdate = state.now; return; }
      const elapsed = (state.now - property.lastUpdate) / 60000;
      if (elapsed > 0) property.storedMoney = Math.min(property.storage * property.owned, property.storedMoney + property.incomePerMinute * property.owned * elapsed);
      property.lastUpdate = state.now;
    });
  });
}

function upkeepTick() {
  const activeCrew = player.crewMembers.filter((m) => m.status !== 'Killed' && m.status !== 'Arrested').length;
  player.money = Math.max(0, player.money - Math.floor(activeCrew * 0.35));
}

function resolveShopAction(region, street, shop) {
  const member = player.crewMembers.find((m) => m.id === shop.actingCrewId);
  if (!member) {
    shop.paymentStatus = 'refusing';
    shop.actionEnd = 0;
    return;
  }

  const crew = CREW_TYPES.find((c) => c.id === member.type);
  const roll = (crew.intimidation * 10 + player.level * 3) - (shop.intimidationLevel * 8 + region.police * 4) + Math.floor(Math.random() * 28);

  let message;
  if (roll >= 20) {
    shop.paymentStatus = 'paying protection';
    player.xp += 7;
    player.reputation += 3;
    message = `${shop.shopName} starts paying protection.`;
    member.status = 'Assigned to street';
  } else {
    const risk = Math.random();
    shop.paymentStatus = 'refusing';
    if (risk < 0.22) {
      member.status = 'Arrested';
      member.streetId = null;
      message = `${shop.shopName} refused. ${member.id} was arrested.`;
    } else if (risk < 0.30) {
      member.status = 'Killed';
      member.streetId = null;
      message = `${shop.shopName} resisted. ${member.id} was killed.`;
    } else {
      member.status = 'Assigned to street';
      message = `${shop.shopName} remains refusing.`;
    }
  }

  shop.actionEnd = 0;
  shop.actingCrewId = null;
  addLog(message);
  showModal('Shop Pressure Result', message);
}

function resolveActiveHeist() {
  const heist = state.crimes.activeHeist;
  if (!heist || state.now < heist.endsAt) return;

  const def = HEISTS.find((h) => h.id === heist.heistId);
  const success = Math.random() * 100 < Math.min(88, 58 + player.level * 3 + getRankBonus());
  let money = success ? randRange(def.money) : Math.floor(randRange(def.money) * 0.25);
  let xp = success ? randRange(def.xp) : Math.floor(randRange(def.xp) * 0.4);

  heist.crewIds.forEach((id) => {
    const member = player.crewMembers.find((m) => m.id === id);
    if (!member) return;
    if (!success && Math.random() < 0.22) {
      member.status = 'Arrested'; member.streetId = null;
    } else if (!success && Math.random() < 0.14) {
      member.status = 'Killed'; member.streetId = null;
    } else {
      member.status = 'Recovering'; member.recoveryEnd = state.now + 45000; member.streetId = null;
    }
  });

  player.money += money;
  player.xp += xp;
  player.reputation += success ? 10 : 3;
  recalcLevel();

  state.crimes.activeHeist = null;
  const result = `${def.name}: ${success ? 'SUCCESS' : 'FAILED'} | +${fmtMoney(money)} | +${xp} XP`;
  addLog(result);
  showModal('Heist Result', result);
}

function updateTimersAndActions() {
  state.now = Date.now();
  syncCrewRecovery();

  state.regions.forEach((region) => region.streets.forEach((street) => street.shops.forEach((shop) => {
    if (shop.actionEnd && state.now >= shop.actionEnd) resolveShopAction(region, street, shop);
  })));

  resolveActiveHeist();
}

function getCooldownLeft(id) {
  const end = state.crimes.cooldowns[id] || 0;
  return Math.max(0, end - state.now);
}

function selectRegion(name) {
  player.selectedRegion = name;
  player.selectedStreetId = null;
  renderAll();
}

function renderTopBar() {
  ui.levelValue.textContent = player.level;
  ui.rankValue.textContent = player.rank;
  ui.moneyValue.textContent = fmtMoney(player.money);
  ui.respectValue.textContent = Math.floor(player.xp);
  ui.reputationValue.textContent = Math.floor(player.reputation);
}

function renderRegionMap() {
  ui.regionMap.innerHTML = '';
  state.regions.forEach((region) => {
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = `region-zone ${player.selectedRegion === region.name ? 'active' : ''}`;
    zone.style.setProperty('--x', `${REGION_LAYOUT[region.name].x}%`);
    zone.style.setProperty('--y', `${REGION_LAYOUT[region.name].y}%`);
    zone.style.setProperty('--w', `${REGION_LAYOUT[region.name].w}%`);
    zone.style.setProperty('--h', `${REGION_LAYOUT[region.name].h}%`);
    const controlled = region.streets.filter((s) => s.ownerType === 'player').length;
    zone.innerHTML = `<strong>${region.name}</strong><small>${region.difficultyTag} · Control ${Math.round((controlled / region.streets.length) * 100)}%</small>`;
    zone.addEventListener('click', () => selectRegion(region.name));
    ui.regionMap.appendChild(zone);
  });
}

function renderRegionMeta() {
  const region = getRegion();
  const summary = getRegionCrewSummary(region.name);

  ui.selectedRegionLabel.textContent = region.name;
  ui.propertyRegionLabel.textContent = region.name;
  ui.regionMeta.textContent = `${region.difficultyTag} · Danger ${region.danger}/10 · Wealth ${region.wealth}/10 · Police ${region.police}/10 · Rival ${region.rivalPressure}${region.governmentDefended ? ' · Government Defended' : ''}`;

  ui.regionCrewSummary.innerHTML = `
    <span class="sum-pill">Total Crew: ${summary.total}</span>
    <span class="sum-pill">Available: ${summary.available}</span>
    <span class="sum-pill">Assigned: ${summary.assigned}</span>
    <span class="sum-pill">Unavailable: ${summary.unavailable}</span>
    <span class="sum-pill">Arrested: ${summary.arrested}</span>
    <span class="sum-pill">Killed: ${summary.killed}</span>
  `;
}

function ownerBadge(owner) {
  if (owner === 'player') return '<span class="badge player">Player</span>';
  if (owner === 'rival') return '<span class="badge rival">Rival</span>';
  return '<span class="badge neutral">Neutral</span>';
}

function collectStreetIncome(streetId) {
  const region = getRegion();
  const street = getStreet(region, streetId);
  const collected = Math.floor(street.shops.reduce((sum, shop) => sum + shop.storedMoney, 0));
  if (collected <= 0) return showModal('No Collection', `No protection money stored on ${street.name} yet.`);

  street.shops.forEach((shop) => { shop.storedMoney = 0; shop.lastUpdate = state.now; });
  player.money += collected;
  addLog(`Collected ${fmtMoney(collected)} from ${street.name}.`);
  showModal('Collection Complete', `Collected ${fmtMoney(collected)} protection money from ${street.name}.`);
  renderAll();
}

function renderStreets() {
  const region = getRegion();
  ui.streetList.innerHTML = '';

  region.streets.forEach((street) => {
    const maxStorage = street.shops.reduce((s, sh) => s + sh.storageCapacity, 0);
    const stored = street.shops.reduce((s, sh) => s + sh.storedMoney, 0);
    const cooldown = secondsLeft(street.takeoverCooldownEnd);
    const assignedCrew = getAssignedCountForStreet(street);

    const card = document.createElement('div');
    card.className = 'street-card';
    card.innerHTML = `
      <div class="row"><strong>${street.name}</strong>${ownerBadge(street.ownerType)}</div>
      <div class="muted">Shops ${street.shops.length} · Stored ${fmtMoney(stored)} / ${fmtMoney(maxStorage)} · Street Defense ${street.difficulty}</div>
      <div class="muted">Assigned Crew: ${assignedCrew} · Required Crew: ${street.requiredCrewPresence} · Cooldown ${cooldown}s</div>
      <div class="inline-actions">
        <button class="btn dark" data-action="select" data-street="${street.id}">Select</button>
        <button class="btn primary" data-action="takeover" data-street="${street.id}" ${cooldown > 0 ? 'disabled' : ''}>Take Over Street</button>
        <button class="btn dark" data-action="collect" data-street="${street.id}">Collect Street</button>
      </div>
    `;

    card.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      const sid = btn.dataset.street;
      if (btn.dataset.action === 'select') { player.selectedStreetId = sid; renderAll(); }
      if (btn.dataset.action === 'takeover') attemptTakeover(sid);
      if (btn.dataset.action === 'collect') collectStreetIncome(sid);
    }));

    ui.streetList.appendChild(card);
  });
}

function attemptTakeover(streetId) {
  const region = getRegion();
  const street = getStreet(region, streetId);
  if (secondsLeft(street.takeoverCooldownEnd) > 0) return;

  // New formula: level + rank provide gradual bonuses, while region/street defense dominates.
  const crewPower = getCrewPowerForStreet(street);
  const levelBonus = player.level * 1.4;
  const rankBonus = getRankBonus();
  const governmentPenalty = region.governmentDefended ? 10 : 0;
  const rivalPenalty = street.ownerType === 'rival' ? 9 : 0;
  const required = street.difficulty + governmentPenalty + rivalPenalty;

  let chance = 46 + crewPower * 1.7 + levelBonus + rankBonus - required;
  chance += (region.name === 'Old Town' ? 12 : 0) + (region.name === 'Chinatown' ? 8 : 0);
  chance = Math.max(6, Math.min(88, Math.round(chance)));

  if (street.ownerType === 'rival' && region.governmentDefended && player.level < 5) {
    return showModal('Takeover Blocked', 'Government-backed rival streets in this region need stronger growth first.');
  }

  const roll = Math.floor(Math.random() * 100);
  street.takeoverCooldownEnd = state.now + 60000;

  const success = roll < chance;
  if (success) {
    street.ownerType = 'player';
    street.controlState = 'controlled';
    player.xp += 16;
    player.reputation += 6;
    addLog(`${street.name} captured. (Chance ${chance}%, Roll ${roll})`);
    showModal('Street Takeover', `Success on ${street.name}. You now control the street.`);
  } else {
    player.xp += 5;
    addLog(`Takeover failed on ${street.name}. (Chance ${chance}%, Roll ${roll})`);
    showModal('Street Takeover', `Failed on ${street.name}. Build crew power and level bonuses.`);
  }

  recalcLevel();
  renderAll();
}

function renderShops() {
  const region = getRegion();
  const street = getStreet(region, player.selectedStreetId);
  ui.shopList.innerHTML = '';

  if (!street) {
    ui.selectedStreetLabel.textContent = 'Select a street';
    ui.shopList.innerHTML = '<p class="muted">Only shops of the selected region/street are shown.</p>';
    return;
  }

  ui.selectedStreetLabel.textContent = `${street.name} (${region.name})`;

  street.shops.forEach((shop) => {
    const timer = secondsLeft(shop.actionEnd);
    const options = CREW_TYPES.filter((c) => player.level >= c.unlockLevel).map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="row"><strong>${shop.shopName}</strong><span class="badge neutral">${shop.paymentStatus}</span></div>
      <div class="muted">${shop.shopType} · Income ${fmtMoney(shop.incomePerMinute)}/min · Stored ${fmtMoney(shop.storedMoney)} / ${fmtMoney(shop.storageCapacity)}</div>
      <div class="muted">Assigned ${shop.assignedGangster || '-'} · Timer ${timer}s</div>
      <div class="inline-actions">
        <select class="assign-select">${options}</select>
        <button class="btn dark" data-action="assign">Assign</button>
        <button class="btn warn" data-action="pressure" ${timer > 0 ? 'disabled' : ''}>Intimidate / Bribe</button>
      </div>
    `;

    card.querySelector('[data-action="assign"]').addEventListener('click', () => {
      shop.assignedGangster = card.querySelector('select').value;
      addLog(`${shop.assignedGangster} assigned to ${shop.shopName}.`);
      renderShops();
    });

    card.querySelector('[data-action="pressure"]').addEventListener('click', () => startShopPressure(region, street, shop));
    ui.shopList.appendChild(card);
  });
}

function startShopPressure(region, street, shop) {
  const type = shop.assignedGangster || 'thug';
  if (street.ownerType !== 'player') return showModal('Street Not Controlled', 'Capture this street first, then pressure its shops.');

  const assignedStreetThugs = player.crewMembers.filter((m) => m.streetId === street.id && m.type === 'thug' && m.status === 'Assigned to street').length;
  if (assignedStreetThugs < street.requiredCrewPresence) {
    return showModal('Need Street Presence', `Assign at least ${street.requiredCrewPresence} street thugs to ${street.name}.`);
  }

  const candidate = player.crewMembers.find((m) => m.streetId === street.id && m.type === type && m.status === 'Assigned to street');
  if (!candidate) return showModal('No Crew Assigned', `Assign at least 1 ${type} to this street first.`);

  candidate.status = 'Assigned to shop intimidation';
  shop.paymentStatus = 'intimidated';
  shop.actionEnd = state.now + (10000 + region.police * 800);
  shop.actingCrewId = candidate.id;
  addLog(`${candidate.id} started pressure on ${shop.shopName}.`);
  renderAll();
}

function renderCrew() {
  const region = getRegion();
  ui.crewPanel.innerHTML = '';

  const summary = getRegionCrewSummary(region.name);
  const summaryCard = document.createElement('div');
  summaryCard.className = 'crew-card';
  summaryCard.innerHTML = `<strong>${region.name} Crew Overview</strong>
    <div class="muted">Total ${summary.total} · Available ${summary.available} · Assigned ${summary.assigned} · Unavailable ${summary.unavailable} · Arrested ${summary.arrested} · Killed ${summary.killed}</div>`;
  ui.crewPanel.appendChild(summaryCard);

  const recruit = document.createElement('div');
  recruit.className = 'crew-card';
  recruit.innerHTML = '<strong>Recruit Crew</strong>';

  CREW_TYPES.forEach((crew) => {
    const regionPool = player.crewMembers.filter((m) => m.region === region.name && m.type === crew.id && m.status !== 'Killed').length;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="muted">${crew.name} in ${region.name}: ${regionPool} · ${fmtMoney(crew.cost)} · unlock L${crew.unlockLevel}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn dark';
    btn.textContent = 'Recruit';
    btn.disabled = player.level < crew.unlockLevel || player.money < crew.cost;
    btn.addEventListener('click', () => {
      player.money -= crew.cost;
      player.xp += 4;
      addCrewMember(crew.id, region.name);
      addLog(`${crew.name} recruited in ${region.name}.`);
      showModal('Crew Recruited', `${crew.name} joined in ${region.name}.`);
      recalcLevel();
      renderAll();
    });
    row.appendChild(btn);
    recruit.appendChild(row);
  });

  ui.crewPanel.appendChild(recruit);

  const street = getStreet(region, player.selectedStreetId);
  const assign = document.createElement('div');
  assign.className = 'crew-card';
  if (!street) {
    assign.innerHTML = '<strong>Street Assignment</strong><p class="muted">Select a street to assign crew.</p>';
  } else {
    assign.innerHTML = `<strong>Assign Crew to ${street.name}</strong>`;
    CREW_TYPES.forEach((crew) => {
      if (player.level < crew.unlockLevel) return;
      const assignedCount = player.crewMembers.filter((m) => m.streetId === street.id && m.type === crew.id && m.status !== 'Killed' && m.status !== 'Arrested').length;
      const availableCount = findAvailableCrew(crew.id, region.name).length;

      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="muted">${crew.name}: assigned ${assignedCount} · available in region ${availableCount}</span>`;

      const plus = document.createElement('button');
      plus.className = 'btn dark';
      plus.textContent = '+1';
      plus.disabled = availableCount < 1;
      plus.addEventListener('click', () => {
        const member = findAvailableCrew(crew.id, region.name, 1)[0];
        if (!member) return;
        member.status = 'Assigned to street';
        member.streetId = street.id;
        renderAll();
      });

      const minus = document.createElement('button');
      minus.className = 'btn dark';
      minus.textContent = '-1';
      minus.disabled = assignedCount < 1;
      minus.addEventListener('click', () => {
        const member = player.crewMembers.find((m) => m.type === crew.id && m.streetId === street.id && (m.status === 'Assigned to street' || m.status === 'Assigned to shop intimidation'));
        if (!member) return;
        member.status = 'Available';
        member.streetId = null;
        renderAll();
      });

      const actions = document.createElement('div');
      actions.className = 'inline-actions';
      actions.append(plus, minus);
      row.appendChild(actions);
      assign.appendChild(row);
    });
  }
  ui.crewPanel.appendChild(assign);

  const crewList = document.createElement('div');
  crewList.className = 'crew-card';
  crewList.innerHTML = `<strong>${region.name} Crew Members</strong>`;

  const regionMembers = player.crewMembers.filter((m) => m.region === region.name || m.status === 'On heist');
  regionMembers.forEach((m) => {
    const streetName = m.streetId ? (region.streets.find((s) => s.id === m.streetId)?.name || m.streetId) : '-';
    const row = document.createElement('div');
    row.className = 'row crew-member-row';
    row.innerHTML = `<span><strong>${m.id}</strong> · ${m.typeName}</span><span class="badge neutral">${m.status}</span><span class="muted">Region: ${m.region} · Street: ${streetName}</span>`;
    crewList.appendChild(row);
  });

  ui.crewPanel.appendChild(crewList);
}

function collectPropertyIncome(propertyId) {
  const region = getRegion();
  const property = region.properties.find((p) => p.id === propertyId);
  const collected = Math.floor(property.storedMoney);
  if (collected <= 0) return showModal('No Collection', `${property.name} has no stored income yet.`);

  property.storedMoney = 0;
  property.lastUpdate = state.now;
  player.money += collected;
  addLog(`Collected ${fmtMoney(collected)} from ${property.name}.`);
  showModal('Collection Complete', `Collected ${fmtMoney(collected)} from ${property.name}.`);
  renderAll();
}

function renderProperties() {
  const region = getRegion();
  ui.propertyList.innerHTML = '';

  region.properties.forEach((property) => {
    const maxStorage = property.storage * Math.max(1, property.owned);
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
      <div class="row"><strong>${property.name}</strong><span class="badge neutral">Owned ${property.owned}</span></div>
      <div class="muted">Stored ${fmtMoney(property.storedMoney)} / ${fmtMoney(maxStorage)} · Rate ${fmtMoney(property.incomePerMinute)}/min each</div>
      <div class="muted">Price ${fmtMoney(property.price)} · Manual collection required</div>
      <div class="inline-actions">
        <button class="btn primary" data-action="buy" ${player.money < property.price ? 'disabled' : ''}>Buy</button>
        <button class="btn dark" data-action="collect" ${property.owned < 1 ? 'disabled' : ''}>Collect</button>
      </div>
    `;

    card.querySelector('[data-action="buy"]').addEventListener('click', () => {
      player.money -= property.price;
      property.owned += 1;
      player.xp += 10;
      property.lastUpdate = state.now;
      addLog(`${property.name} purchased in ${region.name}.`);
      showModal('Property Purchased', `${property.name} acquired. Income must still be collected manually.`);
      recalcLevel();
      renderAll();
    });

    card.querySelector('[data-action="collect"]').addEventListener('click', () => collectPropertyIncome(property.id));
    ui.propertyList.appendChild(card);
  });
}

function hasMediumCrewRequirement(regionName) {
  return player.crewMembers.some((m) => m.region === regionName && m.status === 'Available' && (m.type === 'gangster' || m.type === 'enforcer'));
}

function runInstantCrime(def, tier) {
  if (player.level < def.minLevel) return showModal('Crime Unavailable', `Need level ${def.minLevel}.`);
  const cdLeft = getCooldownLeft(def.id);
  if (cdLeft > 0) return showModal('Cooldown Active', `${def.name} available in ${secondsLeft(state.now + cdLeft)}s.`);
  if (tier === 'medium' && !hasMediumCrewRequirement(player.selectedRegion)) return showModal('Crew Requirement', 'Need at least 1 Gangster or Enforcer available in this region.');

  state.crimes.cooldowns[def.id] = state.now + def.cooldownMs;
  let money = randRange(def.money);
  let xp = randRange(def.xp);
  let message = `${def.name} pulled off: +${fmtMoney(money)} and +${xp} XP.`;

  if (tier === 'medium' && Math.random() > 0.72) {
    money = Math.floor(money * 0.35);
    xp = Math.floor(xp * 0.5);
    const crew = findAvailableCrew('thug', player.selectedRegion, 1)[0];
    if (crew && Math.random() < 0.25) {
      crew.status = 'Arrested';
      crew.streetId = null;
      message = `${def.name} went bad. ${crew.id} was arrested.`;
    } else {
      message = `${def.name} stumbled. Small payout recovered.`;
    }
  }

  player.money += money;
  player.xp += xp;
  recalcLevel();
  addLog(message);
  showModal(tier === 'small' ? 'Small Hustle Result' : 'Medium Hustle Result', message);
  renderAll();
}

function startHeist(def) {
  if (player.level < 6) return showModal('Heist Locked', 'Heists unlock at level 6.');
  if (state.crimes.activeHeist) return showModal('Heist In Progress', 'Finish the active heist first.');
  if (getCooldownLeft(def.id) > 0) return showModal('Cooldown Active', `${def.name} is cooling down.`);

  const crew = findAvailableCrew('thug', player.selectedRegion, 3);
  if (crew.length < 3) return showModal('Not Enough Crew', 'Heists require 3 available Street Thugs in this region.');

  crew.forEach((m) => { m.status = 'On heist'; m.streetId = null; });
  state.crimes.activeHeist = {
    heistId: def.id,
    startedAt: state.now,
    endsAt: state.now + def.durationMs,
    crewIds: crew.map((m) => m.id)
  };
  state.crimes.cooldowns[def.id] = state.now + def.cooldownMs;

  addLog(`Heist started: ${def.name}. Crew committed: ${crew.map((m) => m.id).join(', ')}`);
  showModal('Heist Started', `${def.name} is underway. Crew unavailable until resolved.`);
  renderAll();
}

function renderCrimeGroup(title, activities, tier) {
  const wrapper = document.createElement('div');
  wrapper.className = 'crew-card';
  wrapper.innerHTML = `<strong>${title}</strong>`;

  activities.forEach((def) => {
    const cooldownSecs = Math.ceil(getCooldownLeft(def.id) / 1000);
    const activeHeist = tier === 'heist' && state.crimes.activeHeist?.heistId === def.id;

    const row = document.createElement('div');
    row.className = 'property-card';
    row.innerHTML = `
      <div class="row"><strong>${def.name}</strong><span class="badge neutral">${tier.toUpperCase()}</span></div>
      <div class="muted">${def.desc}</div>
      <div class="muted">Reward ${fmtMoney(def.money[0])}-${fmtMoney(def.money[1])} · XP ${def.xp[0]}-${def.xp[1]}</div>
      <div class="muted">Cooldown ${Math.round((def.cooldownMs || 0) / 60000)}m · ${tier === 'heist' ? 'Need 3 thugs' : `Need L${def.minLevel}`}</div>
      <div class="muted">${activeHeist ? `Active timer ${secondsLeft(state.crimes.activeHeist.endsAt)}s` : `Cooldown ${cooldownSecs}s`}</div>
    `;

    const action = document.createElement('button');
    action.className = tier === 'heist' ? 'btn warn' : 'btn dark';
    action.textContent = tier === 'heist' ? 'Start Heist' : 'Run Activity';
    action.disabled = cooldownSecs > 0 || activeHeist || (tier === 'heist' && state.crimes.activeHeist);

    action.addEventListener('click', () => {
      if (tier === 'small') runInstantCrime(def, 'small');
      if (tier === 'medium') runInstantCrime(def, 'medium');
      if (tier === 'heist') startHeist(def);
    });

    row.appendChild(action);
    wrapper.appendChild(row);
  });

  return wrapper;
}

function renderCrimes() {
  ui.crimePanel.innerHTML = '';
  ui.crimePanel.appendChild(renderCrimeGroup('Small Side Hustles', SMALL_HUSTLES, 'small'));
  ui.crimePanel.appendChild(renderCrimeGroup('Medium Hustles', MEDIUM_HUSTLES, 'medium'));
  ui.crimePanel.appendChild(renderCrimeGroup('Big Heists', HEISTS, 'heist'));
}

function renderLog() {
  ui.activityLog.innerHTML = '';
  player.log.forEach((entry) => {
    const line = document.createElement('div');
    line.className = 'log-item';
    line.textContent = entry;
    ui.activityLog.appendChild(line);
  });
}

function renderAll() {
  renderTopBar();
  renderRegionMap();
  renderRegionMeta();
  renderStreets();
  renderShops();
  renderCrew();
  renderCrimes();
  renderProperties();
  renderLog();
}

function getCooldownLeft(id) {
  const end = state.crimes.cooldowns[id] || 0;
  return Math.max(0, end - state.now);
}

function init() {
  addLog('System online: rebalanced takeovers + full crew status visibility.');
  ui.modalClose.addEventListener('click', () => ui.modal.classList.add('hidden'));

  setInterval(() => {
    updateEconomyStorage();
    updateTimersAndActions();
    renderStreets();
    renderShops();
    renderProperties();
    renderCrimes();
    renderCrew();
    renderRegionMeta();
  }, 1000);

  setInterval(() => {
    upkeepTick();
    recalcLevel();
    renderTopBar();
  }, 6000);

  renderAll();
}

init();
