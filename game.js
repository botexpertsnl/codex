/*
  Empire of Shadows - Mobile-first mafia strategy MVP
  - Core loop: capture streets, recruit crew, buy properties/upgrades, collect income, rank up.
*/

const RANKS = [
  { name: 'Street Rat', respectRequired: 0 },
  { name: 'Thug', respectRequired: 120 },
  { name: 'Gangster', respectRequired: 300 },
  { name: 'Capo', respectRequired: 620 },
  { name: 'Underboss', respectRequired: 1050 },
  { name: 'Don', respectRequired: 1650 }
];

const CREW_TYPES = [
  { id: 'street-thug', name: 'Street Thug', cost: 110, attack: 3, defense: 1, description: 'Cheap muscle for quick expansion.' },
  { id: 'enforcer', name: 'Enforcer', cost: 260, attack: 5, defense: 4, description: 'Reliable pressure and intimidation.' },
  { id: 'hitman', name: 'Hitman', cost: 480, attack: 9, defense: 2, description: 'High offensive power for takeovers.' },
  { id: 'bodyguard', name: 'Bodyguard', cost: 420, attack: 2, defense: 8, description: 'Defensive specialist for your turf.' }
];

const PROPERTY_TYPES = [
  { id: 'bar', name: 'Bar', cost: 400, income: 25, description: 'A local front and protection income.' },
  { id: 'nightclub', name: 'Nightclub', cost: 900, income: 65, description: 'Cash-heavy operation with nightlife ties.' },
  { id: 'warehouse', name: 'Warehouse', cost: 1300, income: 100, description: 'Storage and distribution hub.' },
  { id: 'casino', name: 'Casino', cost: 2100, income: 165, description: 'High-risk, high-reward money stream.' }
];

const ITEM_TYPES = [
  { id: 'knife', name: 'Knife', cost: 120, attack: 2, defense: 0, description: 'Basic close combat edge.' },
  { id: 'pistol', name: 'Pistol', cost: 350, attack: 6, defense: 0, description: 'A practical street equalizer.' },
  { id: 'body-armor', name: 'Body Armor', cost: 520, attack: 0, defense: 6, description: 'Essential protection for survival.' },
  { id: 'armored-car', name: 'Armored Car', cost: 1100, attack: 2, defense: 11, description: 'Secure movement through hostile zones.' },
  { id: 'safehouse-security', name: 'Safehouse Security', cost: 1600, attack: 0, defense: 17, description: 'Fortified base operations.' }
];

const OWNER_LABELS = {
  neutral: 'Neutral',
  rival: 'Rival',
  player: 'Your Crew'
};

const ownerPool = ['neutral', 'rival', 'neutral', 'rival', 'neutral'];

const districtDefinitions = [
  { name: 'Downtown', streets: ['King Ave', 'Gilded Row', 'Mercer Alley', 'Jade Street', 'Union Blvd'] },
  { name: 'Harbor', streets: ['Dockline Road', 'Pier 7 Lane', 'Captain Way', 'Salt Market', 'Anchor Street'] },
  { name: 'Chinatown', streets: ['Lotus Road', 'Red Lantern St', 'Silk Passage', 'Temple Court', 'Dragon Gate'] },
  { name: 'Industrial Zone', streets: ['Iron Yard', 'Boiler Avenue', 'Foundry Street', 'Coal Belt', 'Machine Row'] },
  { name: 'Old Town', streets: ['Bell Tower Rd', 'Cathedral Lane', 'Cobble Street', 'Raven Square', 'Heritage Way'] }
];

const districtMapLayout = {
  Downtown: { x: 33, y: 20, w: 34, h: 24 },
  Harbor: { x: 5, y: 58, w: 34, h: 26 },
  Chinatown: { x: 62, y: 56, w: 33, h: 26 },
  'Industrial Zone': { x: 5, y: 20, w: 26, h: 30 },
  'Old Town': { x: 71, y: 18, w: 24, h: 30 }
};

const player = {
  name: 'Vincenzo "Vin" Russo',
  rank: 'Street Rat',
  money: 650,
  respect: 0,
  crewSize: 0,
  baseAttack: 8,
  baseDefense: 7,
  attack: 8,
  defense: 7,
  ownedStreets: 0,
  ownedProperties: 0,
  crew: {},
  properties: {},
  items: {}
};

const city = districtDefinitions.map((district, districtIndex) => ({
  name: district.name,
  securityBoost: 0,
  streets: district.streets.map((streetName, streetIndex) => {
    const owner = ownerPool[(streetIndex + districtIndex) % ownerPool.length];
    const baseIncome = 24 + districtIndex * 7 + streetIndex * 5;
    const defense = 12 + districtIndex * 4 + streetIndex * 2 + (owner === 'rival' ? 7 : 0);
    return {
      id: `${district.name}-${streetName}`.toLowerCase().replace(/\s+/g, '-'),
      districtName: district.name,
      name: streetName,
      owner,
      income: baseIncome,
      defense
    };
  })
}));

const ui = {
  moneyValue: document.getElementById('moneyValue'),
  rankValue: document.getElementById('rankValue'),
  respectValue: document.getElementById('respectValue'),
  cityMap: document.getElementById('cityMap'),
  regionMap: document.getElementById('regionMap'),
  crewList: document.getElementById('crewList'),
  propertyList: document.getElementById('propertyList'),
  itemList: document.getElementById('itemList'),
  profileCard: document.getElementById('profileCard'),
  navButtons: document.querySelectorAll('.nav-btn'),
  panels: document.querySelectorAll('.panel'),
  regionDrawer: document.getElementById('regionDrawer'),
  regionName: document.getElementById('regionName'),
  regionDetails: document.getElementById('regionDetails'),
  collectRegionBtn: document.getElementById('collectRegionBtn'),
  fortifyRegionBtn: document.getElementById('fortifyRegionBtn'),
  viewStreetsBtn: document.getElementById('viewStreetsBtn'),
  closeRegionDrawer: document.getElementById('closeRegionDrawer'),
  streetDrawer: document.getElementById('streetDrawer'),
  streetName: document.getElementById('streetName'),
  streetDetails: document.getElementById('streetDetails'),
  takeoverBtn: document.getElementById('takeoverBtn'),
  closeDrawer: document.getElementById('closeDrawer'),
  toast: document.getElementById('toast')
};

let selectedStreet = null;
let selectedDistrict = null;
let toastTimer = null;

function formatMoney(amount) {
  return `$${Math.floor(amount).toLocaleString()}`;
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
}

function getCount(collection, id) {
  return collection[id] || 0;
}

function getStreetIncome() {
  let total = 0;
  city.forEach((district) => {
    district.streets.forEach((street) => {
      if (street.owner === 'player') {
        total += street.income;
      }
    });
  });
  return total;
}

function getPropertyIncome() {
  return PROPERTY_TYPES.reduce((sum, property) => sum + getCount(player.properties, property.id) * property.income, 0);
}

function getTotalIncomePerTick() {
  return getStreetIncome() + getPropertyIncome();
}

function getDistrictControlData(district) {
  const total = district.streets.length;
  const owned = district.streets.filter((street) => street.owner === 'player').length;
  return { total, owned, controlPct: Math.round((owned / total) * 100) };
}

function getDistrictDefenseBonus(districtName) {
  const district = city.find((item) => item.name === districtName);
  return district?.securityBoost || 0;
}

function recalculateStats() {
  const crewAttack = CREW_TYPES.reduce((sum, crew) => sum + getCount(player.crew, crew.id) * crew.attack, 0);
  const crewDefense = CREW_TYPES.reduce((sum, crew) => sum + getCount(player.crew, crew.id) * crew.defense, 0);
  const itemAttack = ITEM_TYPES.reduce((sum, item) => sum + getCount(player.items, item.id) * item.attack, 0);
  const itemDefense = ITEM_TYPES.reduce((sum, item) => sum + getCount(player.items, item.id) * item.defense, 0);

  player.attack = player.baseAttack + crewAttack + itemAttack;
  player.defense = player.baseDefense + crewDefense + itemDefense;
  player.crewSize = CREW_TYPES.reduce((sum, crew) => sum + getCount(player.crew, crew.id), 0);
  player.ownedProperties = PROPERTY_TYPES.reduce((sum, property) => sum + getCount(player.properties, property.id), 0);
  player.ownedStreets = city.reduce(
    (sum, district) =>
      sum + district.streets.reduce((districtSum, street) => districtSum + (street.owner === 'player' ? 1 : 0), 0),
    0
  );
}

function updateRank() {
  let currentRank = RANKS[0].name;
  for (const rank of RANKS) {
    if (player.respect >= rank.respectRequired) {
      currentRank = rank.name;
    }
  }
  if (player.rank !== currentRank) {
    player.rank = currentRank;
    showToast(`Promotion earned: ${currentRank}`);
  }
}

function renderTopBar() {
  ui.moneyValue.textContent = formatMoney(player.money);
  ui.rankValue.textContent = player.rank;
  ui.respectValue.textContent = `${Math.floor(player.respect)}`;
}

function renderRegionMap() {
  ui.regionMap.innerHTML = '';
  city.forEach((district) => {
    const control = getDistrictControlData(district);
    const layout = districtMapLayout[district.name] || { x: 10, y: 10, w: 30, h: 22 };
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = 'region-zone';
    zone.dataset.district = district.name;
    zone.style.setProperty('--x', `${layout.x}%`);
    zone.style.setProperty('--y', `${layout.y}%`);
    zone.style.setProperty('--w', `${layout.w}%`);
    zone.style.setProperty('--h', `${layout.h}%`);
    zone.innerHTML = `
      <span class="region-title">${district.name}</span>
      <span class="region-meta">Control: ${control.owned}/${control.total} (${control.controlPct}%)</span>
    `;

    zone.addEventListener('mouseenter', () => zone.classList.add('active'));
    zone.addEventListener('mouseleave', () => zone.classList.remove('active'));
    zone.addEventListener('click', () => openRegionDrawer(district));
    ui.regionMap.appendChild(zone);
  });
}

function renderCityMap() {
  ui.cityMap.innerHTML = '';
  city.forEach((district) => {
    const districtCard = document.createElement('article');
    districtCard.className = 'district-card';
    districtCard.innerHTML = `<h3>${district.name}</h3>`;

    const streetGrid = document.createElement('div');
    streetGrid.className = 'street-grid';

    district.streets.forEach((street) => {
      const streetButton = document.createElement('button');
      streetButton.className = 'street-btn';
      streetButton.type = 'button';
      streetButton.dataset.owner = street.owner;
      streetButton.innerHTML = `
        <span class="street-title">${street.name}</span>
        <span class="street-meta">${OWNER_LABELS[street.owner]} · ${formatMoney(street.income)}/tick</span>
      `;
      streetButton.addEventListener('click', () => openStreetDrawer(street));
      streetGrid.appendChild(streetButton);
    });

    districtCard.appendChild(streetGrid);
    ui.cityMap.appendChild(districtCard);
  });
}

function renderCrew() {
  ui.crewList.innerHTML = '';
  CREW_TYPES.forEach((crew) => {
    const owned = getCount(player.crew, crew.id);
    const card = document.createElement('article');
    card.className = 'data-card';
    card.innerHTML = `
      <h3>${crew.name} (x${owned})</h3>
      <p>${crew.description}</p>
      <p>Attack +${crew.attack} · Defense +${crew.defense}</p>
      <p>Cost: ${formatMoney(crew.cost)}</p>
    `;

    const button = document.createElement('button');
    button.className = 'secondary-btn';
    button.type = 'button';
    button.textContent = `Recruit ${crew.name}`;
    button.addEventListener('click', () => purchaseCrew(crew));
    card.appendChild(button);
    ui.crewList.appendChild(card);
  });
}

function renderProperties() {
  ui.propertyList.innerHTML = '';
  PROPERTY_TYPES.forEach((property) => {
    const owned = getCount(player.properties, property.id);
    const card = document.createElement('article');
    card.className = 'data-card';
    card.innerHTML = `
      <h3>${property.name} (x${owned})</h3>
      <p>${property.description}</p>
      <p>Income: ${formatMoney(property.income)}/tick</p>
      <p>Cost: ${formatMoney(property.cost)}</p>
    `;
    const button = document.createElement('button');
    button.className = 'secondary-btn';
    button.type = 'button';
    button.textContent = `Buy ${property.name}`;
    button.addEventListener('click', () => purchaseProperty(property));
    card.appendChild(button);
    ui.propertyList.appendChild(card);
  });
}

function renderItems() {
  ui.itemList.innerHTML = '';
  ITEM_TYPES.forEach((item) => {
    const owned = getCount(player.items, item.id);
    const card = document.createElement('article');
    card.className = 'data-card';
    card.innerHTML = `
      <h3>${item.name} (x${owned})</h3>
      <p>${item.description}</p>
      <p>Attack +${item.attack} · Defense +${item.defense}</p>
      <p>Cost: ${formatMoney(item.cost)}</p>
    `;
    const button = document.createElement('button');
    button.className = 'secondary-btn';
    button.type = 'button';
    button.textContent = `Buy ${item.name}`;
    button.addEventListener('click', () => purchaseItem(item));
    card.appendChild(button);
    ui.itemList.appendChild(card);
  });
}

function renderProfile() {
  const nextRank = RANKS.find((rank) => rank.respectRequired > player.respect);
  const incomeTick = getTotalIncomePerTick();
  const nextRankInfo = nextRank
    ? `${nextRank.name} at ${nextRank.respectRequired} respect`
    : 'Maximum rank reached';

  ui.profileCard.innerHTML = `
    <strong>${player.name}</strong><br>
    Rank: ${player.rank}<br>
    Crew Size: ${player.crewSize}<br>
    Attack: ${player.attack}<br>
    Defense: ${player.defense}<br>
    Owned Streets: ${player.ownedStreets}<br>
    Owned Properties: ${player.ownedProperties}<br>
    Street Income: ${formatMoney(getStreetIncome())}/tick<br>
    Property Income: ${formatMoney(getPropertyIncome())}/tick<br>
    Total Income: ${formatMoney(incomeTick)}/tick<br>
    Next Rank: ${nextRankInfo}
  `;
}

function purchaseCrew(crew) {
  if (player.money < crew.cost) {
    showToast('Not enough cash to recruit.');
    return;
  }
  player.money -= crew.cost;
  player.crew[crew.id] = getCount(player.crew, crew.id) + 1;
  player.respect += 12;
  recalculateStats();
  updateRank();
  renderAll();
  showToast(`${crew.name} recruited.`);
}

function purchaseProperty(property) {
  if (player.money < property.cost) {
    showToast('Not enough money for this business.');
    return;
  }
  player.money -= property.cost;
  player.properties[property.id] = getCount(player.properties, property.id) + 1;
  player.respect += 15;
  recalculateStats();
  updateRank();
  renderAll();
  showToast(`${property.name} acquired.`);
}

function purchaseItem(item) {
  if (player.money < item.cost) {
    showToast('You cannot afford this upgrade yet.');
    return;
  }
  player.money -= item.cost;
  player.items[item.id] = getCount(player.items, item.id) + 1;
  player.respect += 10;
  recalculateStats();
  updateRank();
  renderAll();
  showToast(`${item.name} purchased.`);
}

function openRegionDrawer(district) {
  selectedDistrict = district;
  ui.regionName.textContent = district.name;
  refreshRegionDrawer();
  ui.regionDrawer.classList.add('open');
}

function refreshRegionDrawer() {
  if (!selectedDistrict) {
    return;
  }
  const control = getDistrictControlData(selectedDistrict);
  const controlIncome = selectedDistrict.streets
    .filter((street) => street.owner === 'player')
    .reduce((sum, street) => sum + street.income, 0);

  ui.regionDetails.innerHTML = `
    <p>Your Control: ${control.owned}/${control.total} streets (${control.controlPct}%)</p>
    <p>District Income: ${formatMoney(controlIncome)}/tick</p>
    <p>District Security Bonus: +${selectedDistrict.securityBoost} defense on takeovers here</p>
    <p>Available actions: Collect protection, fortify district, or inspect streets.</p>
  `;
}

function collectRegionProtection() {
  if (!selectedDistrict) {
    return;
  }

  const protectionIncome = selectedDistrict.streets
    .filter((street) => street.owner === 'player')
    .reduce((sum, street) => sum + Math.floor(street.income * 0.45), 0);

  if (protectionIncome === 0) {
    showToast('No controlled streets in this district yet.');
    return;
  }

  player.money += protectionIncome;
  player.respect += 6;
  updateRank();
  renderTopBar();
  renderProfile();
  refreshRegionDrawer();
  showToast(`Protection collected: ${formatMoney(protectionIncome)}.`);
}

function fortifyRegion() {
  if (!selectedDistrict) {
    return;
  }

  const cost = 220 + selectedDistrict.securityBoost * 120;
  if (player.money < cost) {
    showToast(`Need ${formatMoney(cost)} to fortify ${selectedDistrict.name}.`);
    return;
  }

  player.money -= cost;
  selectedDistrict.securityBoost += 1;
  player.respect += 10;
  updateRank();
  renderTopBar();
  renderProfile();
  refreshRegionDrawer();
  showToast(`${selectedDistrict.name} fortified (+1 district defense).`);
}

function viewDistrictStreets() {
  if (!selectedDistrict) {
    return;
  }
  ui.regionDrawer.classList.remove('open');
  showToast(`Viewing streets in ${selectedDistrict.name}.`);
  const districtCards = Array.from(document.querySelectorAll('.district-card'));
  const target = districtCards.find((card) => card.querySelector('h3')?.textContent === selectedDistrict.name);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openStreetDrawer(street) {
  selectedStreet = street;
  ui.streetName.textContent = `${street.name} · ${street.districtName}`;
  refreshStreetDrawer();
  ui.streetDrawer.classList.add('open');
}

function refreshStreetDrawer() {
  if (!selectedStreet) {
    return;
  }

  const districtDefenseBonus = getDistrictDefenseBonus(selectedStreet.districtName);
  ui.streetDetails.innerHTML = `
    <p>Owner: ${OWNER_LABELS[selectedStreet.owner]}</p>
    <p>Income: ${formatMoney(selectedStreet.income)}/tick</p>
    <p>Street Defense: ${selectedStreet.defense} (+${districtDefenseBonus} district bonus)</p>
    <p>Your Attack: ${player.attack}</p>
  `;

  if (selectedStreet.owner === 'player') {
    ui.takeoverBtn.disabled = true;
    ui.takeoverBtn.textContent = 'Already Under Your Control';
  } else {
    ui.takeoverBtn.disabled = false;
    ui.takeoverBtn.textContent = 'Attempt Takeover';
  }
}

function attemptTakeover() {
  if (!selectedStreet || selectedStreet.owner === 'player') {
    return;
  }

  const districtBonus = getDistrictDefenseBonus(selectedStreet.districtName);
  const attackRoll = player.attack + Math.floor(Math.random() * 10);
  const defenseRoll = selectedStreet.defense + districtBonus + Math.floor(Math.random() * 10);

  if (attackRoll > defenseRoll) {
    selectedStreet.owner = 'player';
    player.respect += 40;
    const payout = Math.floor(selectedStreet.income * 1.5);
    player.money += payout;
    showToast(`Takeover successful! Bonus ${formatMoney(payout)} earned.`);
  } else {
    player.respect += 9;
    showToast('Takeover failed. Build more power and retry.');
  }

  recalculateStats();
  updateRank();
  renderAll();
  refreshStreetDrawer();
  if (selectedDistrict) {
    refreshRegionDrawer();
  }
}

function collectIncomeTick() {
  const income = getTotalIncomePerTick();
  if (income > 0) {
    player.money += income;
    player.respect += 2 + player.ownedProperties;
    updateRank();
    renderTopBar();
    renderProfile();
  }
}

function switchPanel(target) {
  ui.panels.forEach((panel) => panel.classList.remove('active'));
  document.getElementById(`panel-${target}`).classList.add('active');

  ui.navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.target === target);
  });
}

function renderAll() {
  renderTopBar();
  renderRegionMap();
  renderCityMap();
  renderCrew();
  renderProperties();
  renderItems();
  renderProfile();
}

function init() {
  recalculateStats();
  renderAll();

  ui.navButtons.forEach((button) => {
    button.addEventListener('click', () => switchPanel(button.dataset.target));
  });

  ui.closeRegionDrawer.addEventListener('click', () => ui.regionDrawer.classList.remove('open'));
  ui.collectRegionBtn.addEventListener('click', collectRegionProtection);
  ui.fortifyRegionBtn.addEventListener('click', fortifyRegion);
  ui.viewStreetsBtn.addEventListener('click', viewDistrictStreets);

  ui.closeDrawer.addEventListener('click', () => {
    ui.streetDrawer.classList.remove('open');
  });

  ui.takeoverBtn.addEventListener('click', attemptTakeover);

  setInterval(collectIncomeTick, 4500);
  showToast('Welcome, Street Rat. Expand your empire.');
}

init();
