export type PlatformApiType = 'albion' | 'riot' | 'steam' | 'manual';

export interface PresetGame {
  name: string;
  slug?: string;
  icon: string;
  description: string;
  apiType?: PlatformApiType;
}

export interface PlatformPreset {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  badge: string;
  description: string;
  apiType: PlatformApiType;
  apiLabel?: string;
  games: PresetGame[];
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'albion',
    name: 'Albion Online',
    slug: 'albion',
    icon: '⚔️',
    color: '#a855f7',
    badge: 'Sandbox MMORPG',
    apiType: 'albion',
    apiLabel: 'Albion Canlı Killboard / Gameinfo API (API Key gerekmez)',
    description: 'Albion Online karakterleri, canlı fame, PvP kill ve resmi portre entegrasyonu.',
    games: [
      { name: 'Albion Online', slug: 'albion', icon: '⚔️', apiType: 'albion', description: 'Albion karakterleri, fame, lonca ve ada yönetimi.' },
    ],
  },
  {
    id: 'riot',
    name: 'Riot Games',
    slug: 'riot',
    icon: '🔴',
    color: '#ef4444',
    badge: 'Riot Games',
    apiType: 'riot',
    apiLabel: 'Riot Games Resmi API (LoL, Valorant, TFT lig ve maç takibi)',
    description: 'League of Legends, Valorant ve TFT istemcisi ve canlı hesap verileri.',
    games: [
      { name: 'League of Legends', slug: 'lol', icon: '⚔️', apiType: 'riot', description: 'Solo/Duo & Esnek ligleri, canlı LP ve son maç takibi.' },
      { name: 'Valorant', slug: 'valorant', icon: '🎯', apiType: 'riot', description: 'Riot ID, sunucu bölgeleri ve istemci giriş notları.' },
      { name: 'Teamfight Tactics', slug: 'tft', icon: '♟️', apiType: 'riot', description: 'Taktik Savaşları ligleri, stratejiler ve hesap takibi.' },
    ],
  },
  {
    id: 'steam',
    name: 'Steam',
    slug: 'steam',
    icon: '💨',
    color: '#38bdf8',
    badge: 'Valve',
    apiType: 'steam',
    apiLabel: 'Steam Topluluk / Profil API',
    description: 'Valve Steam oyun kütüphanesi ve pazar hesapları.',
    games: [
      { name: 'Counter-Strike 2', slug: 'cs2', icon: '🔫', apiType: 'steam', description: 'CS2 hesapları, Premier rating ve Steam girişleri.' },
      { name: 'Dota 2', slug: 'dota2', icon: '🛡️', apiType: 'steam', description: 'Dota 2 MMR ve smurf hesap takibi.' },
      { name: 'PUBG: BATTLEGROUNDS', slug: 'pubg', icon: '🪂', apiType: 'steam', description: 'PUBG hesapları ve rütbeler.' },
    ],
  },
  {
    id: 'battlenet',
    name: 'Battle.net',
    slug: 'battlenet',
    icon: '🛡️',
    color: '#00aeff',
    badge: 'Blizzard',
    apiType: 'manual',
    description: 'Blizzard Battle.net istemcisi; WoW, Overwatch 2 ve Diablo serisi.',
    games: [
      { name: 'World of Warcraft', slug: 'wow', icon: '⚔️', description: 'MMORPG hesapları ve sunucular.' },
      { name: 'Overwatch 2', slug: 'ow2', icon: '🎯', description: 'Rekabetçi FPS dereceleri.' },
      { name: 'Diablo IV', slug: 'diablo4', icon: '🔥', description: 'Sezonluk karakterler ve buildler.' },
      { name: 'Hearthstone', slug: 'hearthstone', icon: '🃏', description: 'Kart koleksiyonları ve deste yönetimi.' },
    ],
  },
  {
    id: 'ea',
    name: 'EA App',
    slug: 'ea',
    icon: '⚡',
    color: '#ff4747',
    badge: 'EA Play',
    apiType: 'manual',
    description: 'Electronic Arts oyun ekosistemi ve EA Sports hesapları.',
    games: [
      { name: 'EA SPORTS FC', slug: 'eafc', icon: '⚽', description: 'Ultimate Team ve kulüp hesapları.' },
      { name: 'Apex Legends', slug: 'apex', icon: '🎯', description: 'Battle Royale dereceleri ve smurf hesaplar.' },
      { name: 'Battlefield', slug: 'battlefield', icon: '🔫', description: 'Battlefield serisi hesapları.' },
      { name: 'The Sims 4', slug: 'sims4', icon: '💎', description: 'Genişleme paketleri ve kütüphane.' },
    ],
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    slug: 'ubisoft',
    icon: '🌀',
    color: '#0070ff',
    badge: 'Ubisoft',
    apiType: 'manual',
    description: 'Ubisoft istemcisi; Rainbow Six Siege ve açık dünya yapımları.',
    games: [
      { name: "Tom Clancy's Rainbow Six Siege", slug: 'r6', icon: '🔫', description: 'Dereceli R6 hesapları ve operatörler.' },
      { name: "Assassin's Creed", slug: 'ac', icon: '🗡️', description: 'AC serisi hesapları.' },
      { name: 'Far Cry', slug: 'farcry', icon: '💥', description: 'Far Cry serisi ilerlemeleri.' },
    ],
  },
  {
    id: 'rockstar',
    name: 'Rockstar Games',
    slug: 'rockstar',
    icon: '⭐',
    color: '#fdb813',
    badge: 'Rockstar',
    apiType: 'manual',
    description: 'Rockstar Games Launcher; Grand Theft Auto ve Red Dead serisi.',
    games: [
      { name: 'Grand Theft Auto V', slug: 'gta5', icon: '🏎️', description: 'GTA Online para, RP ve karakterler.' },
      { name: 'Red Dead Redemption 2', slug: 'rdr2', icon: '🤠', description: 'Red Dead Online hesapları.' },
    ],
  },
  {
    id: 'epic',
    name: 'Epic Games',
    slug: 'epic',
    icon: '⚡',
    color: '#f59e0b',
    badge: 'Epic',
    apiType: 'manual',
    description: 'Epic Games Store hesapları ve kütüphane.',
    games: [
      { name: 'Fortnite', slug: 'fortnite', icon: '⛏️', description: 'Fortnite hesapları ve Battle Pass takibi.' },
      { name: 'Rocket League', slug: 'rocketleague', icon: '🏎️', description: 'Rocket League rekabetçi ligleri.' },
    ],
  },
  {
    id: 'xbox',
    name: 'Xbox / PC Game Pass',
    slug: 'xbox',
    icon: '🎮',
    color: '#107c10',
    badge: 'Microsoft',
    apiType: 'manual',
    description: 'Xbox PC & Game Pass oyun kütüphanesi hesapları.',
    games: [
      { name: 'Minecraft', slug: 'minecraft', icon: '⛏️', description: 'Java & Bedrock Microsoft hesapları.' },
      { name: 'Forza Horizon', slug: 'forza', icon: '🏎️', description: 'Forza Horizon garaj ve yarış hesapları.' },
      { name: 'Sea of Thieves', slug: 'sot', icon: '🏴‍☠️', description: 'Korsan seviyeleri ve altınlar.' },
    ],
  },
  {
    id: 'playstation',
    name: 'PlayStation PC',
    slug: 'playstation',
    icon: '🕹️',
    color: '#003791',
    badge: 'Sony PSN',
    apiType: 'manual',
    description: 'PlayStation Studios PC oyunları ve PSN hesapları.',
    games: [
      { name: 'Helldivers 2', slug: 'helldivers2', icon: '🚀', description: 'Demokrasi savaşçıları ve rütbeler.' },
      { name: 'Ghost of Tsushima', slug: 'got', icon: '⚔️', description: 'Samuray ve Legends eşli oyun hesapları.' },
      { name: "Marvel's Spider-Man", slug: 'spiderman', icon: '🕷️', description: 'Örümcek Adam serisi kayıtları.' },
    ],
  },
  {
    id: 'gog',
    name: 'GOG Galaxy',
    slug: 'gog',
    icon: '👾',
    color: '#86328a',
    badge: 'CD Projekt',
    apiType: 'manual',
    description: 'DRM-free CD Projekt Red ve klasik PC oyunları.',
    games: [
      { name: 'Cyberpunk 2077', slug: 'cyberpunk', icon: '🤖', description: 'Night City karakter kayıtları.' },
      { name: 'The Witcher 3', slug: 'witcher3', icon: '⚔️', description: 'Rivialı Geralt kayıtları.' },
    ],
  },
  {
    id: 'supercell',
    name: 'Supercell ID',
    slug: 'supercell',
    icon: '👑',
    color: '#fbbf24',
    badge: 'Mobil',
    apiType: 'manual',
    description: 'Brawl Stars, Clash of Clans ve Clash Royale hesapları.',
    games: [
      { name: 'Brawl Stars', slug: 'brawlstars', icon: '⭐', description: 'Kupa, savaşçılar ve elmas hesapları.' },
      { name: 'Clash of Clans', slug: 'coc', icon: '🏰', description: 'Köy binası ve klan savaşları.' },
      { name: 'Clash Royale', slug: 'clashroyale', icon: '👑', description: 'Kupa ligleri ve kart seviyeleri.' },
    ],
  },
  {
    id: 'roblox',
    name: 'Roblox',
    slug: 'roblox',
    icon: '🧱',
    color: '#e2231a',
    badge: 'Roblox Corp',
    apiType: 'manual',
    description: 'Roblox hesapları, Robux ve favori deneyimler.',
    games: [
      { name: 'Roblox Experiences', slug: 'roblox', icon: '🧱', description: 'Blox Fruits, Adopt Me, Da Hood vb.' },
    ],
  },
];
