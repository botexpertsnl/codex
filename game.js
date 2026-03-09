// Empire of Shadows - economy-focused region mafia MVP

const RANKS = ['Small Hustler', 'Street Rat', 'Thug', 'Gangster', 'Capo', 'Underboss', 'Don'];
const LEVEL_THRESHOLDS = [0, 120, 320, 700, 1200, 1900, 2800, 3800];

const CREW_TYPES = [
  { id: 'thug', name: 'Street Thug', unlockLevel: 1, cost: 140, attack: 2, intimidation: 3 },
  { id: 'gangster', name: 'Gangster', unlockLevel: 2, cost: 360, attack: 4, intimidation: 5 },
  { id: 'enforcer', name: 'Enforcer', unlockLevel: 4, cost: 650, attack: 7, intimidation: 6 },
  { id: 'soldier', name: 'Soldier', unlockLevel: 6, cost: 1300, attack: 11, intimidation: 5 },
  { id: 'bodyguard', name: 'Bodyguard', unlockLevel: 5, cost: 950, attack: 3, intimidation: 4 }
];

const SHOP_TYPES = ['Grocery', 'Bar', 'Mechanic', 'Restaurant', 'Pawn Shop', 'Electronics Store'];
const PROPERTY_TYPES = [
  { id: 'bar', name: 'Bar', price: 2500, incomePerMinute: 5, storage: 260 },
  { id: 'nightclub', name: 'Nightclub', price: 20000, incomePerMinute: 15, storage: 600 },
  { id: 'warehouse', name: 'Warehouse', price: 50000, incomePerMinute: 28, storage: 1200 },
  { id: 'gambling-house', name: 'Gambling House', price: 85000, incomePerMinute: 42, storage: 1800 },
  { id: 'casino', name: 'Casino', price: 250000, incomePerMinute: 85, storage: 4200 }
];

const REGION_LAYOUT = {
  Downtown: { x: 35, y: 16, w: 30, h: 24 },
  Harbor: { x: 6, y: 56, w: 34, h: 28 },
  Chinatown: { x: 60, y: 54, w: 34, h: 28 },
  'Industrial Zone': { x: 6, y: 18, w: 24, h: 30 },
  'Old Town': { x: 72, y: 16, w: 22, h: 30 }
};

const REGION_DEFS = [
  { name: 'Downtown', danger: 8, wealth: 9, police: 8, bonus: 'Luxury stores pay more', rival: 'Vespri Family' },
  { name: 'Harbor', danger: 5, wealth: 6, police: 4, bonus: 'Smuggling links', rival: 'Dockside Union' },
  { name: 'Chinatown', danger: 6, wealth: 7, police: 6, bonus: 'Fast pressure actions', rival: 'Jade Circle' },
  { name: 'Industrial Zone', danger: 4, wealth: 5, police: 3, bonus: 'Cheaper logistics', rival: 'Steel Hand' },
  { name: 'Old Town', danger: 3, wealth: 4, police: 2, bonus: 'Easy early expansion', rival: 'No major family' }
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
  money: 900,
  respect: 0,
  reputation: 0,
  crewPool: { thug: 4, gangster: 0, enforcer: 0, soldier: 0, bodyguard: 0 },
  selectedRegion: 'Old Town',
  selectedStreetId: null,
  log: []
};

const state = { regions: createRegions(), now: Date.now() };

function createRegions() {
  return REGION_DEFS.map((regionDef, index) => {
    const streets = STREET_NAMES[regionDef.name].map((streetName, i) => {
      const difficulty = 12 + regionDef.danger * 4 + i * 3;
      const rivalOwned = i >= 3 && regionDef.name !== 'Old Town';
      const ownerType = rivalOwned ? 'rival' : i % 2 === 0 ? 'neutral' : 'rival';
      const shopCount = 3 + ((index + i) % 8); // 3-10 shops
      const requiredCrewPresence = 1 + Math.floor((difficulty - 10) / 12);
      const shops = createShops(streetName, shopCount, regionDef.wealth, regionDef.danger);

      return {
        id: `${regionDef.name}-${streetName}`.replace(/\s+/g, '-').toLowerCase(),
        name: streetName,
        region: regionDef.name,
        difficulty,
        ownerType,
        controlState: ownerType === 'player' ? 'controlled' : 'contested',
        shops,
        assignedCrew: { thug: 0, gangster: 0, enforcer: 0, soldier: 0, bodyguard: 0 },
        requiredCrewPresence,
        takeoverCooldownEnd: 0,
        lastIncomeUpdate: Date.now()
      };
    });

    return {
      ...regionDef,
      controlState: 'contested',
      properties: PROPERTY_TYPES.map((p) => ({
        ...p,
        owned: 0,
        storedMoney: 0,
        lastUpdate: Date.now()
      })),
      streets,
      shopNetwork: streets.reduce((sum, street) => sum + street.shops.length, 0
      )
    };
  });
}

function createShops(streetName, count, wealth, danger) {
  return Array.from({ length: count }).map((_, i) => {
    const baseIncome = 1 + Math.floor((wealth + (i % 3)) / 5); // mostly $1-$3 early
    const incomePerMinute = Math.max(1, Math.min(4, baseIncome));
    const storageCapacity = 24 + Math.floor(Math.random() * 18) + wealth * 2; // fills around 20-30m
    return {
      id: `${streetName}-${i}`.replace(/\s+/g, '-').toLowerCase(),
      shopName: `${SHOP_TYPES[i % SHOP_TYPES.length]} #${i + 1}`,
      shopType: SHOP_TYPES[i % SHOP_TYPES.length],
      intimidationLevel: danger + Math.floor(Math.random() * 4),
      loyaltyFear: 20 + Math.floor(Math.random() * 60),
      paymentStatus: 'not approached',
      assignedGangster: null,
      actionEnd: 0,
      actionType: null,
      incomePerMinute,
      storedMoney: 0,
      storageCapacity,
      lastUpdate: Date.now()
    };
  });
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
function getStreet(region, id) { return region.streets.find((s) => s.id === id); }
function secondsLeft(end) { return Math.max(0, Math.ceil((end - state.now) / 1000)); }

function addLog(text) {
  player.log.unshift(`[${new Date().toLocaleTimeString()}] ${text}`);
  player.log = player.log.slice(0, 50);
}

function showModal(title, message) {
  ui.modalTitle.textContent = title;
  ui.modalMessage.textContent = message;
  ui.modal.classList.remove('hidden');
}

function recalcLevel() {
  let lv = 1;
  LEVEL_THRESHOLDS.forEach((threshold, idx) => { if (player.respect >= threshold) lv = idx + 1; });
  if (lv !== player.level) {
    player.level = lv;
    player.rank = RANKS[Math.min(RANKS.length - 1, lv - 1)];
    showModal('Level Up', `You reached level ${lv} (${player.rank}).`);
    addLog(`Level up to ${player.rank}.`);
  }
}

function computeRegionDominance(region) {
  const controlled = region.streets.filter((s) => s.ownerType === 'player').length;
  return Math.round((controlled / region.streets.length) * 100);
}

function getStreetStorageData(street) {
  const maxStorage = street.shops.reduce((sum, shop) => sum + shop.storageCapacity, 0);
  const storedMoney = street.shops.reduce((sum, shop) => sum + shop.storedMoney, 0);
  return { maxStorage, storedMoney };
}

function updateEconomyStorage() {
  state.now = Date.now();
  const incomeBoost = 1 + Math.floor(player.level / 4) * 0.1;

  state.regions.forEach((region) => {
    region.streets.forEach((street) => {
      const { maxStorage, storedMoney } = getStreetStorageData(street);
      street.shops.forEach((shop) => {
        const elapsedMin = (state.now - shop.lastUpdate) / 60000;
        if (elapsedMin <= 0) return;

        if (shop.paymentStatus === 'paying protection' && storedMoney < maxStorage) {
          const gain = shop.incomePerMinute * incomeBoost * elapsedMin;
          shop.storedMoney = Math.min(shop.storageCapacity, shop.storedMoney + gain);
        }
        shop.lastUpdate = state.now;
      });
    });

    region.properties.forEach((property) => {
      if (property.owned < 1) {
        property.lastUpdate = state.now;
        return;
      }
      const elapsedMin = (state.now - property.lastUpdate) / 60000;
      if (elapsedMin <= 0) return;
      const maxStorage = property.storage * property.owned;
      const gain = property.incomePerMinute * property.owned * elapsedMin;
      property.storedMoney = Math.min(maxStorage, property.storedMoney + gain);
      property.lastUpdate = state.now;
    });
  });
}

function upkeepTick() {
  const totalCrew = Object.values(player.crewPool).reduce((a, b) => a + b, 0);
  player.money = Math.max(0, player.money - Math.floor(totalCrew * 0.4));
}

function resolveShopAction(region, street, shop) {
  const crewType = shop.assignedGangster || 'thug';
  const crewDef = CREW_TYPES.find((c) => c.id === crewType);
  const assigned = street.assignedCrew[crewType] || 0;
  if (assigned <= 0) {
    shop.paymentStatus = 'refusing';
    shop.actionEnd = 0;
    return;
  }

  const intimidationPower = crewDef.intimidation * 10 + assigned * 8 + player.level * 3;
  const difficulty = shop.intimidationLevel * 8 + region.police * 4;
  const roll = intimidationPower - difficulty + Math.floor(Math.random() * 28);

  let message;
  if (roll >= 20) {
    shop.paymentStatus = 'paying protection';
    player.respect += 7;
    player.reputation += 3;
    message = `${shop.shopName} starts paying protection.`;
  } else {
    const risk = Math.random();
    shop.paymentStatus = 'refusing';
    if (risk < 0.26) {
      street.assignedCrew[crewType] = Math.max(0, street.assignedCrew[crewType] - 1);
      message = `${shop.shopName} refused. One ${crewDef.name} arrested.`;
    } else if (risk < 0.37) {
      street.assignedCrew[crewType] = Math.max(0, street.assignedCrew[crewType] - 1);
      message = `${shop.shopName} resisted. One ${crewDef.name} killed.`;
    } else {
      message = `${shop.shopName} remains refusing.`;
    }
  }

  shop.actionEnd = 0;
  shop.actionType = null;
  addLog(message);
  showModal('Shop Pressure Result', message);
}

function updateTimersAndActions() {
  state.now = Date.now();
  state.regions.forEach((region) => {
    region.streets.forEach((street) => {
      street.shops.forEach((shop) => {
        if (shop.actionEnd && state.now >= shop.actionEnd) resolveShopAction(region, street, shop);
      });
    });
  });
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
  ui.respectValue.textContent = Math.floor(player.respect);
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
    zone.innerHTML = `<strong>${region.name}</strong><small>Control ${computeRegionDominance(region)}%</small>`;
    zone.addEventListener('click', () => selectRegion(region.name));
    ui.regionMap.appendChild(zone);
  });
}

function renderRegionMeta() {
  const region = getRegion();
  ui.selectedRegionLabel.textContent = region.name;
  ui.propertyRegionLabel.textContent = region.name;
  ui.regionMeta.textContent = `Danger ${region.danger}/10 · Wealth ${region.wealth}/10 · Police ${region.police}/10 · Rival ${region.rival} · Bonus: ${region.bonus}`;
}

function ownerBadge(owner) {
  if (owner === 'player') return '<span class="badge player">Player</span>';
  if (owner === 'rival') return '<span class="badge rival">Rival</span>';
  return '<span class="badge neutral">Neutral</span>';
}

function assignedPower(street) {
  return Object.entries(street.assignedCrew).reduce((sum, [id, amount]) => {
    const c = CREW_TYPES.find((crew) => crew.id === id);
    return sum + c.attack * amount;
  }, 0);
}

function collectStreetIncome(streetId) {
  const region = getRegion();
  const street = getStreet(region, streetId);
  const before = street.shops.reduce((sum, shop) => sum + shop.storedMoney, 0);
  const collected = Math.floor(before);
  if (collected <= 0) {
    showModal('No Collection', `No protection money stored on ${street.name} yet.`);
    return;
  }
  street.shops.forEach((shop) => { shop.storedMoney = 0; shop.lastUpdate = state.now; });
  player.money += collected;
  addLog(`Collected ${fmtMoney(collected)} protection money from ${street.name}.`);
  showModal('Collection Complete', `Collected ${fmtMoney(collected)} protection money from ${street.name}.`);
  renderAll();
}

function renderStreets() {
  const region = getRegion();
  ui.streetList.innerHTML = '';

  region.streets.forEach((street) => {
    const cooldown = secondsLeft(street.takeoverCooldownEnd);
    const storage = getStreetStorageData(street);
    const card = document.createElement('div');
    card.className = 'street-card';
    card.innerHTML = `
      <div class="row"><strong>${street.name}</strong>${ownerBadge(street.ownerType)}</div>
      <div class="muted">Shops ${street.shops.length} · Stored ${fmtMoney(storage.storedMoney)} / ${fmtMoney(storage.maxStorage)} · Difficulty ${street.difficulty}</div>
      <div class="muted">Required crew ${street.requiredCrewPresence} · Assigned power ${assignedPower(street)} · Cooldown ${cooldown}s</div>
      <div class="inline-actions">
        <button class="btn dark" data-action="select" data-street="${street.id}">Select</button>
        <button class="btn primary" data-action="takeover" data-street="${street.id}" ${cooldown > 0 ? 'disabled' : ''}>Take Over Street</button>
        <button class="btn dark" data-action="collect" data-street="${street.id}">Collect Street</button>
      </div>
    `;

    card.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { action, street: sid } = btn.dataset;
        if (action === 'select') {
          player.selectedStreetId = sid;
          renderAll();
        }
        if (action === 'takeover') attemptTakeover(sid);
        if (action === 'collect') collectStreetIncome(sid);
      });
    });

    ui.streetList.appendChild(card);
  });
}

function attemptTakeover(streetId) {
  const region = getRegion();
  const street = getStreet(region, streetId);
  if (secondsLeft(street.takeoverCooldownEnd) > 0) return;

  if (street.ownerType === 'rival' && player.level < 6) {
    showModal('Takeover Blocked', 'Rival-family streets require higher level and Soldier support.');
    return;
  }

  const requiredPower = street.difficulty + region.danger * 3 + (street.ownerType === 'rival' ? 18 : 0);
  const chance = Math.max(8, Math.min(90, 40 + assignedPower(street) - requiredPower + player.level * 2));
  const roll = Math.floor(Math.random() * 100);
  street.takeoverCooldownEnd = state.now + 60000;

  let result;
  if (roll < chance) {
    street.ownerType = 'player';
    street.controlState = 'controlled';
    player.respect += 16;
    player.reputation += 6;
    result = `${street.name} captured. Shops still require individual pressure.`;
  } else {
    player.respect += 4;
    result = `Takeover failed on ${street.name}.`; 
  }

  addLog(result);
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
    ui.shopList.innerHTML = '<p class="muted">Only shops of the selected region/street are shown.</p>';
    return;
  }

  ui.selectedStreetLabel.textContent = `${street.name} (${region.name})`;
  street.shops.forEach((shop) => {
    const timer = secondsLeft(shop.actionEnd);
    const options = CREW_TYPES.filter((c) => player.level >= c.unlockLevel)
      .map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="row"><strong>${shop.shopName}</strong><span class="badge neutral">${shop.paymentStatus}</span></div>
      <div class="muted">${shop.shopType} · Income ${fmtMoney(shop.incomePerMinute)}/min · Stored ${fmtMoney(shop.storedMoney)} / ${fmtMoney(shop.storageCapacity)}</div>
      <div class="muted">Intimidation ${shop.intimidationLevel} · Assigned ${shop.assignedGangster || '-'} · Timer ${timer}s</div>
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
  if (street.ownerType !== 'player') {
    showModal('Street Not Controlled', 'Capture this street first, then pressure its shops.');
    return;
  }
  if (street.assignedCrew.thug < street.requiredCrewPresence) {
    showModal('Need Street Presence', `Assign at least ${street.requiredCrewPresence} thugs to ${street.name}.`);
    return;
  }
  if ((street.assignedCrew[type] || 0) < 1) {
    showModal('No Crew Assigned', `Assign at least 1 ${type} to this street first.`);
    return;
  }

  shop.paymentStatus = 'intimidated';
  shop.actionType = 'pressure';
  shop.actionEnd = state.now + (10000 + region.police * 800);
  addLog(`Started pressure on ${shop.shopName}.`);
  renderShops();
}

function renderCrew() {
  const region = getRegion();
  const street = getStreet(region, player.selectedStreetId);
  ui.crewPanel.innerHTML = '';

  const recruit = document.createElement('div');
  recruit.className = 'crew-card';
  recruit.innerHTML = '<strong>Recruit Crew</strong>';

  CREW_TYPES.forEach((crew) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<span class="muted">${crew.name} (pool ${player.crewPool[crew.id]}) · ${fmtMoney(crew.cost)} · unlock L${crew.unlockLevel}</span>`;
    const btn = document.createElement('button');
    btn.className = 'btn dark';
    btn.textContent = 'Recruit';
    btn.disabled = player.level < crew.unlockLevel || player.money < crew.cost;
    btn.addEventListener('click', () => {
      player.money -= crew.cost;
      player.crewPool[crew.id] += 1;
      player.respect += 4;
      addLog(`${crew.name} recruited.`);
      showModal('Crew Recruited', `${crew.name} joined your operation.`);
      recalcLevel();
      renderAll();
    });
    row.appendChild(btn);
    recruit.appendChild(row);
  });

  ui.crewPanel.appendChild(recruit);

  const assign = document.createElement('div');
  assign.className = 'crew-card';
  if (!street) {
    assign.innerHTML = '<strong>Street Assignment</strong><p class="muted">Select a street to assign crew.</p>';
  } else {
    assign.innerHTML = `<strong>Assign Crew to ${street.name}</strong>`;
    CREW_TYPES.forEach((crew) => {
      if (player.level < crew.unlockLevel) return;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="muted">${crew.name}: assigned ${street.assignedCrew[crew.id]} (pool ${player.crewPool[crew.id]})</span>`;
      const plus = document.createElement('button');
      plus.className = 'btn dark';
      plus.textContent = '+1';
      plus.disabled = player.crewPool[crew.id] < 1;
      plus.addEventListener('click', () => { player.crewPool[crew.id] -= 1; street.assignedCrew[crew.id] += 1; renderAll(); });
      const minus = document.createElement('button');
      minus.className = 'btn dark';
      minus.textContent = '-1';
      minus.disabled = street.assignedCrew[crew.id] < 1;
      minus.addEventListener('click', () => { street.assignedCrew[crew.id] -= 1; player.crewPool[crew.id] += 1; renderAll(); });
      const actions = document.createElement('div');
      actions.className = 'inline-actions';
      actions.append(plus, minus);
      row.appendChild(actions);
      assign.appendChild(row);
    });
  }
  ui.crewPanel.appendChild(assign);
}

function collectPropertyIncome(propertyId) {
  const region = getRegion();
  const property = region.properties.find((p) => p.id === propertyId);
  const collected = Math.floor(property.storedMoney);
  if (collected <= 0) {
    showModal('No Collection', `${property.name} has no stored income yet.`);
    return;
  }
  property.storedMoney = 0;
  property.lastUpdate = state.now;
  player.money += collected;
  addLog(`Collected ${fmtMoney(collected)} from ${property.name} in ${region.name}.`);
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
      player.respect += 10;
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
  renderProperties();
  renderLog();
}

function init() {
  addLog('Economy started: income is manual collection only.');
  ui.modalClose.addEventListener('click', () => ui.modal.classList.add('hidden'));

  setInterval(() => {
    updateEconomyStorage();
    updateTimersAndActions();
    renderStreets();
    renderShops();
    renderProperties();
  }, 1000);

  setInterval(() => {
    upkeepTick();
    recalcLevel();
    renderTopBar();
  }, 6000);

  renderAll();
}

init();
