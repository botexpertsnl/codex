// Empire of Shadows - Region-based mobile mafia strategy MVP

const RANKS = ['Small Hustler', 'Street Rat', 'Thug', 'Gangster', 'Capo', 'Underboss', 'Don'];
const LEVEL_THRESHOLDS = [0, 120, 300, 560, 920, 1400, 2000, 2800];

const CREW_TYPES = [
  { id: 'thug', name: 'Street Thug', unlockLevel: 1, cost: 120, attack: 2, intimidation: 3, survival: 0.55, upkeep: 1 },
  { id: 'gangster', name: 'Gangster', unlockLevel: 2, cost: 260, attack: 4, intimidation: 5, survival: 0.72, upkeep: 2 },
  { id: 'enforcer', name: 'Enforcer', unlockLevel: 4, cost: 420, attack: 6, intimidation: 6, survival: 0.8, upkeep: 3 },
  { id: 'soldier', name: 'Soldier', unlockLevel: 6, cost: 700, attack: 9, intimidation: 5, survival: 0.82, upkeep: 4 },
  { id: 'bodyguard', name: 'Bodyguard', unlockLevel: 5, cost: 600, attack: 3, intimidation: 3, survival: 0.9, upkeep: 3 }
];

const SHOP_TYPES = ['Bakery', 'Pawn Shop', 'Liquor Store', 'Cafe', 'Butcher', 'Tailor', 'Barber', 'Electronics', 'Bookstore'];
const PROPERTY_TYPES = [
  { id: 'bar', name: 'Bar', baseCost: 450, income: 35, bonus: 'Recruit boost' },
  { id: 'nightclub', name: 'Nightclub', baseCost: 900, income: 78, bonus: 'Reputation boost' },
  { id: 'gambling-house', name: 'Gambling House', baseCost: 1250, income: 105, bonus: 'Respect boost' },
  { id: 'warehouse', name: 'Warehouse', baseCost: 1500, income: 120, bonus: 'Takeover prep' },
  { id: 'casino', name: 'Casino', baseCost: 2200, income: 185, bonus: 'Large passive income' },
  { id: 'safehouse', name: 'Safehouse', baseCost: 1700, income: 85, bonus: 'Crew survival bonus' }
];

const REGION_LAYOUT = {
  Downtown: { x: 35, y: 16, w: 30, h: 24 },
  Harbor: { x: 6, y: 56, w: 34, h: 28 },
  Chinatown: { x: 60, y: 54, w: 34, h: 28 },
  'Industrial Zone': { x: 6, y: 18, w: 24, h: 30 },
  'Old Town': { x: 72, y: 16, w: 22, h: 30 }
};

const REGION_DEFS = [
  { name: 'Downtown', danger: 7, wealth: 9, police: 7, bonus: 'High-end extortion profits', rival: 'Vespri Family' },
  { name: 'Harbor', danger: 5, wealth: 6, police: 4, bonus: 'Smuggling routes', rival: 'Dockside Union' },
  { name: 'Chinatown', danger: 6, wealth: 7, police: 6, bonus: 'Fast intimidation actions', rival: 'Jade Circle' },
  { name: 'Industrial Zone', danger: 4, wealth: 5, police: 3, bonus: 'Cheap fortification', rival: 'Steel Hand' },
  { name: 'Old Town', danger: 3, wealth: 4, police: 2, bonus: 'Easy starter influence', rival: 'No major family' }
];

const STREET_NAMES = {
  Downtown: ['King Ave', 'Mercer Alley', 'Union Blvd', 'Silver Court', 'Embassy Row'],
  Harbor: ['Dockline Road', 'Salt Market', 'Anchor Street', 'Pier 7 Lane', 'Captain Way'],
  Chinatown: ['Lotus Road', 'Temple Court', 'Red Lantern St', 'Silk Passage', 'Dragon Gate'],
  'Industrial Zone': ['Iron Yard', 'Foundry Street', 'Boiler Avenue', 'Coal Belt', 'Machine Row'],
  'Old Town': ['Bell Tower Rd', 'Cobble Street', 'Raven Square', 'Cathedral Lane', 'Heritage Way']
};

const player = {
  level: 1,
  rank: RANKS[0],
  money: 1400,
  respect: 0,
  reputation: 0,
  influence: 100,
  crewPool: { thug: 5, gangster: 0, enforcer: 0, soldier: 0, bodyguard: 0 },
  globalCrewLost: 0,
  selectedRegion: 'Old Town',
  selectedStreetId: null,
  log: []
};

const state = {
  regions: createRegions(),
  now: Date.now()
};

function createRegions() {
  return REGION_DEFS.map((regionDef, index) => {
    const streets = STREET_NAMES[regionDef.name].map((streetName, i) => {
      const incomePotential = 25 + regionDef.wealth * 6 + i * 6;
      const difficulty = 10 + regionDef.danger * 4 + i * 3;
      const rivalOwned = i >= 3 && regionDef.name !== 'Old Town';
      const ownerType = rivalOwned ? 'rival' : i % 2 === 0 ? 'neutral' : 'rival';
      const shopCount = 3 + ((index + i) % 8);
      const requiredCrewPresence = 1 + Math.floor((difficulty - 8) / 12);
      return {
        id: `${regionDef.name}-${streetName}`.replace(/\s+/g, '-').toLowerCase(),
        name: streetName,
        region: regionDef.name,
        incomePotential,
        difficulty,
        ownerType,
        controlState: ownerType === 'player' ? 'controlled' : 'contested',
        shops: createShops(streetName, shopCount, incomePotential),
        assignedCrew: { thug: 0, gangster: 0, enforcer: 0, soldier: 0, bodyguard: 0 },
        requiredCrewPresence,
        takeoverCooldownEnd: 0
      };
    });

    return {
      ...regionDef,
      controlState: 'contested',
      properties: PROPERTY_TYPES.map((prop, idx) => ({ ...prop, owned: 0, cost: prop.baseCost + idx * 60 + index * 100 })),
      streets,
      shopNetwork: streets.reduce((sum, s) => sum + s.shops.length, 0)
    };
  });
}

function createShops(streetName, count, baseIncome) {
  const shops = [];
  for (let i = 0; i < count; i += 1) {
    const type = SHOP_TYPES[i % SHOP_TYPES.length];
    shops.push({
      id: `${streetName}-${i}`.replace(/\s+/g, '-').toLowerCase(),
      shopName: `${type} #${i + 1}`,
      shopType: type,
      loyaltyFear: 20 + Math.floor(Math.random() * 60),
      incomeAmount: Math.floor(baseIncome * (0.22 + Math.random() * 0.5)),
      status: 'not approached',
      assignedGangster: null,
      actionEnd: 0,
      actionType: null
    });
  }
  return shops;
}

const ui = {
  levelValue: document.getElementById('levelValue'),
  rankValue: document.getElementById('rankValue'),
  moneyValue: document.getElementById('moneyValue'),
  respectValue: document.getElementById('respectValue'),
  reputationValue: document.getElementById('reputationValue'),
  regionMap: document.getElementById('regionMap'),
  regionMeta: document.getElementById('regionMeta'),
  selectedRegionLabel: document.getElementById('selectedRegionLabel'),
  selectedStreetLabel: document.getElementById('selectedStreetLabel'),
  propertyRegionLabel: document.getElementById('propertyRegionLabel'),
  streetList: document.getElementById('streetList'),
  shopList: document.getElementById('shopList'),
  crewPanel: document.getElementById('crewPanel'),
  propertyList: document.getElementById('propertyList'),
  activityLog: document.getElementById('activityLog'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalClose: document.getElementById('modalClose')
};

function fmtMoney(v) { return `$${Math.floor(v).toLocaleString()}`; }
function getRegion() { return state.regions.find((r) => r.name === player.selectedRegion); }
function getStreet(region, streetId) { return region.streets.find((s) => s.id === streetId); }
function secondsLeft(end) { return Math.max(0, Math.ceil((end - state.now) / 1000)); }

function addLog(text) {
  player.log.unshift(`[${new Date().toLocaleTimeString()}] ${text}`);
  player.log = player.log.slice(0, 40);
}

function showModal(title, message) {
  ui.modalTitle.textContent = title;
  ui.modalMessage.textContent = message;
  ui.modal.classList.remove('hidden');
}

function getRankForLevel(level) {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 1.2))];
}

function recalcLevel() {
  let nextLevel = 1;
  LEVEL_THRESHOLDS.forEach((threshold, idx) => {
    if (player.respect >= threshold) nextLevel = idx + 1;
  });
  if (nextLevel !== player.level) {
    player.level = nextLevel;
    player.rank = getRankForLevel(nextLevel);
    showModal('Level Up', `You reached level ${player.level} (${player.rank}). New crew and tougher regions unlocked.`);
    addLog(`Level up! You are now ${player.rank}.`);
  }
}

function computeRegionDominance(region) {
  const controlled = region.streets.filter((s) => s.ownerType === 'player').length;
  return Math.round((controlled / region.streets.length) * 100);
}

function upkeepTick() {
  const totalCrew = Object.values(player.crewPool).reduce((a, b) => a + b, 0);
  const cost = Math.floor(totalCrew * 0.6);
  player.money = Math.max(0, player.money - cost);
}

function passiveIncomeTick() {
  state.regions.forEach((region) => {
    region.streets.forEach((street) => {
      street.shops.forEach((shop) => {
        if (shop.status === 'paying protection') {
          player.money += Math.floor(shop.incomeAmount * 0.5);
        }
      });
    });
    region.properties.forEach((property) => {
      if (property.owned > 0) player.money += property.income * property.owned;
    });
  });
}

function updateTimersAndActions() {
  state.now = Date.now();
  state.regions.forEach((region) => {
    region.streets.forEach((street) => {
      street.shops.forEach((shop) => {
        if (shop.actionEnd && state.now >= shop.actionEnd) {
          resolveShopAction(region, street, shop);
        }
      });
    });
  });
}

function resolveShopAction(region, street, shop) {
  const crewType = shop.assignedGangster || 'thug';
  const crewDef = CREW_TYPES.find((c) => c.id === crewType);
  const assigned = street.assignedCrew[crewType] || 0;
  if (assigned <= 0) {
    shop.status = 'refusing';
    clearShopAction(shop);
    return;
  }

  const dangerPenalty = region.danger * 4 + region.police * 3;
  const intimidationPower = crewDef.intimidation * 10 + player.level * 4 + assigned * 7;
  const roll = intimidationPower - dangerPenalty + Math.floor(Math.random() * 30);

  let message = '';
  if (roll >= 35) {
    shop.status = 'paying protection';
    player.respect += 8;
    player.reputation += 3;
    message = `${shop.shopName} now pays protection.`;
  } else {
    const riskRoll = Math.random();
    if (riskRoll < 0.28) {
      shop.status = 'refusing';
      street.assignedCrew[crewType] = Math.max(0, street.assignedCrew[crewType] - 1);
      player.globalCrewLost += 1;
      message = `${shop.shopName} refused. One ${crewDef.name} was arrested.`;
    } else if (riskRoll < 0.42) {
      shop.status = 'refusing';
      street.assignedCrew[crewType] = Math.max(0, street.assignedCrew[crewType] - 1);
      player.globalCrewLost += 1;
      message = `${shop.shopName} resisted. One ${crewDef.name} was killed.`;
    } else {
      shop.status = 'intimidated';
      message = `${shop.shopName} is shaken but not paying yet.`;
    }
  }

  clearShopAction(shop);
  addLog(message);
  showModal('Shop Pressure Result', message);
}

function clearShopAction(shop) {
  shop.actionEnd = 0;
  shop.actionType = null;
}

function selectRegion(name) {
  player.selectedRegion = name;
  player.selectedStreetId = null;
  renderAll();
}

function renderTopBar() {
  ui.levelValue.textContent = `${player.level}`;
  ui.rankValue.textContent = player.rank;
  ui.moneyValue.textContent = fmtMoney(player.money);
  ui.respectValue.textContent = `${Math.floor(player.respect)}`;
  ui.reputationValue.textContent = `${Math.floor(player.reputation)}`;
}

function renderRegionMap() {
  ui.regionMap.innerHTML = '';
  state.regions.forEach((region) => {
    const btn = document.createElement('button');
    btn.className = `region-zone ${player.selectedRegion === region.name ? 'active' : ''}`;
    btn.type = 'button';
    btn.style.setProperty('--x', `${REGION_LAYOUT[region.name].x}%`);
    btn.style.setProperty('--y', `${REGION_LAYOUT[region.name].y}%`);
    btn.style.setProperty('--w', `${REGION_LAYOUT[region.name].w}%`);
    btn.style.setProperty('--h', `${REGION_LAYOUT[region.name].h}%`);
    const dominance = computeRegionDominance(region);
    btn.innerHTML = `<strong>${region.name}</strong><small>Control ${dominance}%</small>`;
    btn.addEventListener('click', () => selectRegion(region.name));
    ui.regionMap.appendChild(btn);
  });
}

function renderRegionMeta() {
  const region = getRegion();
  const dominance = computeRegionDominance(region);
  ui.selectedRegionLabel.textContent = region.name;
  ui.propertyRegionLabel.textContent = region.name;
  ui.regionMeta.textContent = `Danger ${region.danger}/10 · Wealth ${region.wealth}/10 · Police ${region.police}/10 · Rival: ${region.rival} · Bonus: ${region.bonus} · Dominance ${dominance}%`;
}

function ownerBadge(owner) {
  if (owner === 'player') return '<span class="badge player">Player</span>';
  if (owner === 'rival') return '<span class="badge rival">Rival Family</span>';
  return '<span class="badge neutral">Neutral</span>';
}

function availableAssignedPower(street) {
  return Object.entries(street.assignedCrew).reduce((sum, [id, count]) => {
    const crew = CREW_TYPES.find((c) => c.id === id);
    return sum + crew.attack * count;
  }, 0);
}

function renderStreets() {
  const region = getRegion();
  ui.streetList.innerHTML = '';
  region.streets.forEach((street) => {
    const cooldown = secondsLeft(street.takeoverCooldownEnd);
    const card = document.createElement('div');
    card.className = 'street-card';
    card.innerHTML = `
      <div class="row"><strong>${street.name}</strong>${ownerBadge(street.ownerType)}</div>
      <div class="muted">Income ${fmtMoney(street.incomePotential)} · Difficulty ${street.difficulty} · Shops ${street.shops.length} · Required crew ${street.requiredCrewPresence}</div>
      <div class="row"><span class="muted">Assigned Power: ${availableAssignedPower(street)}</span><span class="timer">Cooldown: ${cooldown}s</span></div>
      <div class="inline-actions">
        <button class="btn dark" data-street="${street.id}" data-action="select">Select Street</button>
        <button class="btn primary" data-street="${street.id}" data-action="takeover" ${cooldown > 0 ? 'disabled' : ''}>Take Over Street</button>
      </div>
    `;
    card.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const sid = btn.dataset.street;
        if (action === 'select') {
          player.selectedStreetId = sid;
          renderAll();
        } else {
          attemptTakeover(sid);
        }
      });
    });
    ui.streetList.appendChild(card);
  });
}

function attemptTakeover(streetId) {
  const region = getRegion();
  const street = getStreet(region, streetId);
  if (secondsLeft(street.takeoverCooldownEnd) > 0) return;

  const assignedPower = availableAssignedPower(street);
  const requiredPower = street.difficulty + region.danger * 3 + (street.ownerType === 'rival' ? 20 : 0);
  const soldierCount = street.assignedCrew.soldier;

  if (street.ownerType === 'rival' && player.level < 6) {
    showModal('Takeover Blocked', 'Rival family turf requires higher level and Soldier crew unlocks.');
    addLog(`Failed attack on ${street.name}: level too low for rival family.`);
    return;
  }

  if (street.ownerType === 'rival' && soldierCount < 1) {
    showModal('Takeover Blocked', 'You need at least 1 Soldier assigned to attack rival family streets.');
    addLog(`Failed attack on ${street.name}: no Soldier assigned.`);
    return;
  }

  const chance = Math.max(8, Math.min(92, 45 + (assignedPower - requiredPower) + player.level * 2 - region.police));
  const roll = Math.floor(Math.random() * 100);
  street.takeoverCooldownEnd = state.now + 60000;

  let result = '';
  if (roll < chance) {
    street.ownerType = 'player';
    street.controlState = 'controlled';
    player.money += Math.floor(street.incomePotential * 0.7);
    player.respect += 18;
    player.reputation += 7;
    result = `Success! ${street.name} captured. Street shops still need individual pressure.`;
  } else {
    player.respect += 5;
    if (Math.random() < 0.38) {
      const losses = Math.min(1, street.assignedCrew.thug);
      street.assignedCrew.thug -= losses;
      if (losses > 0) result = `Takeover failed. ${losses} thug arrested.`;
    }
    if (!result) result = 'Takeover failed. Crew escaped but territory held.';
  }

  addLog(`${street.name}: ${result}`);
  showModal('Street Takeover Result', `${result} (Chance ${chance}%, Roll ${roll}%)`);
  recalcLevel();
  renderAll();
}

function renderShops() {
  const region = getRegion();
  const street = getStreet(region, player.selectedStreetId);
  ui.shopList.innerHTML = '';

  if (!street) {
    ui.selectedStreetLabel.textContent = 'Select a street';
    ui.shopList.innerHTML = '<p class="muted">Pick a street first. Region filtering is active.</p>';
    return;
  }

  ui.selectedStreetLabel.textContent = `${street.name} (${region.name})`;

  street.shops.forEach((shop) => {
    const cooldown = secondsLeft(shop.actionEnd);
    const crewOptions = CREW_TYPES.filter((c) => player.level >= c.unlockLevel).map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="row"><strong>${shop.shopName}</strong><span class="badge neutral">${shop.status}</span></div>
      <div class="muted">Type ${shop.shopType} · Fear ${shop.loyaltyFear} · Income ${fmtMoney(shop.incomeAmount)}</div>
      <div class="row"><span class="muted">Assigned: ${shop.assignedGangster || '-'}</span><span class="timer">Action Timer: ${cooldown}s</span></div>
      <div class="inline-actions">
        <select data-shop="${shop.id}" class="assign-select">${crewOptions}</select>
        <button class="btn dark" data-shop="${shop.id}" data-action="assign">Assign</button>
        <button class="btn warn" data-shop="${shop.id}" data-action="intimidate" ${cooldown > 0 ? 'disabled' : ''}>Intimidate / Bribe</button>
      </div>
    `;

    card.querySelector('[data-action="assign"]').addEventListener('click', () => {
      const value = card.querySelector('select').value;
      shop.assignedGangster = value;
      addLog(`${value} assigned to ${shop.shopName}.`);
      renderShops();
    });

    card.querySelector('[data-action="intimidate"]').addEventListener('click', () => startShopPressure(region, street, shop));

    ui.shopList.appendChild(card);
  });
}

function startShopPressure(region, street, shop) {
  const type = shop.assignedGangster || 'thug';
  const assigned = street.assignedCrew[type] || 0;
  if (street.ownerType !== 'player') {
    showModal('Street Not Controlled', 'Capture this street first. Then pressure each shop owner one by one.');
    return;
  }
  if (street.assignedCrew.thug < street.requiredCrewPresence) {
    showModal('Insufficient Crew Presence', `Assign at least ${street.requiredCrewPresence} Street Thugs to this street first.`);
    return;
  }
  if (assigned <= 0) {
    showModal('No Assigned Gangster', `Assign at least 1 ${type} to this street before intimidation.`);
    return;
  }

  shop.status = 'intimidated';
  shop.actionType = 'pressure';
  shop.actionEnd = state.now + (10000 + region.police * 800);
  addLog(`Action started on ${shop.shopName}; results in ${secondsLeft(shop.actionEnd)}s.`);
  renderShops();
}

function renderCrew() {
  const region = getRegion();
  ui.crewPanel.innerHTML = '';

  const recruitCard = document.createElement('div');
  recruitCard.className = 'crew-card';
  recruitCard.innerHTML = '<strong>Recruit Crew (global pool)</strong>';

  CREW_TYPES.forEach((crew) => {
    const unlocked = player.level >= crew.unlockLevel;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="muted">${crew.name} (Pool: ${player.crewPool[crew.id]}) · Cost ${fmtMoney(crew.cost)} · Unlock L${crew.unlockLevel}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn dark';
    btn.textContent = 'Recruit';
    btn.disabled = !unlocked || player.money < crew.cost;
    btn.addEventListener('click', () => {
      player.money -= crew.cost;
      player.crewPool[crew.id] += 1;
      player.respect += 4;
      player.reputation += 1;
      addLog(`${crew.name} recruited.`);
      showModal('Crew Recruited', `${crew.name} joined your network.`);
      recalcLevel();
      renderAll();
    });
    row.appendChild(btn);
    recruitCard.appendChild(row);
  });
  ui.crewPanel.appendChild(recruitCard);

  const street = getStreet(region, player.selectedStreetId);
  const assignCard = document.createElement('div');
  assignCard.className = 'crew-card';
  if (!street) {
    assignCard.innerHTML = '<strong>Street Assignment</strong><p class="muted">Select a street to assign crew in this region.</p>';
  } else {
    assignCard.innerHTML = `<strong>Assign Crew to ${street.name}</strong>`;
    CREW_TYPES.forEach((crew) => {
      if (player.level < crew.unlockLevel) return;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="muted">${crew.name}: assigned ${street.assignedCrew[crew.id]} (pool ${player.crewPool[crew.id]})</span>`;
      const actions = document.createElement('div');
      actions.className = 'inline-actions';
      const plus = document.createElement('button');
      plus.className = 'btn dark';
      plus.textContent = '+1';
      plus.disabled = player.crewPool[crew.id] < 1;
      plus.addEventListener('click', () => {
        player.crewPool[crew.id] -= 1;
        street.assignedCrew[crew.id] += 1;
        renderAll();
      });
      const minus = document.createElement('button');
      minus.className = 'btn dark';
      minus.textContent = '-1';
      minus.disabled = street.assignedCrew[crew.id] < 1;
      minus.addEventListener('click', () => {
        street.assignedCrew[crew.id] -= 1;
        player.crewPool[crew.id] += 1;
        renderAll();
      });
      actions.append(plus, minus);
      row.appendChild(actions);
      assignCard.appendChild(row);
    });
  }
  ui.crewPanel.appendChild(assignCard);
}

function renderProperties() {
  const region = getRegion();
  ui.propertyList.innerHTML = '';
  region.properties.forEach((property) => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
      <div class="row"><strong>${property.name}</strong><span class="badge neutral">Owned ${property.owned}</span></div>
      <div class="muted">Cost ${fmtMoney(property.cost)} · Income ${fmtMoney(property.income)}/tick · ${property.bonus}</div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = 'Buy Property';
    btn.disabled = player.money < property.cost;
    btn.addEventListener('click', () => {
      player.money -= property.cost;
      property.owned += 1;
      player.respect += 10;
      player.reputation += 3;
      addLog(`${property.name} purchased in ${region.name}.`);
      showModal('Property Purchased', `${property.name} now generates passive income in ${region.name}.`);
      recalcLevel();
      renderAll();
    });
    card.appendChild(btn);
    ui.propertyList.appendChild(card);
  });
}

function renderLog() {
  ui.activityLog.innerHTML = '';
  player.log.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.textContent = entry;
    ui.activityLog.appendChild(div);
  });
}

function renderAll() {
  renderTopBar();
  renderRegionMap();
  renderRegionMeta();
  renderStreets();
  renderShops();
  renderCrew();
  renderProperties();
  renderLog();
}

function init() {
  addLog('Welcome boss. Select a region to begin your rise.');
  ui.modalClose.addEventListener('click', () => ui.modal.classList.add('hidden'));

  setInterval(() => {
    updateTimersAndActions();
    renderStreets();
    renderShops();
  }, 1000);

  setInterval(() => {
    passiveIncomeTick();
    upkeepTick();
    recalcLevel();
    renderTopBar();
    renderLog();
  }, 6000);

  renderAll();
}

init();
