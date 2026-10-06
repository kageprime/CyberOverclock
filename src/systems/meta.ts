export interface MetaUpgrades {
  hullPlating: number; // +Max HP
  synapseSpeed: number; // +Movement speed
  overclockCap: number; // +Overclock duration
  bladeEdge: number; // +Base melee damage
  naniteVault: number; // +Starting currency
}

const META_STORAGE_KEY = 'cyberpulse_meta_save_v1';

export class MetaProgression {
  public metaCores: number = 0;
  public totalRuns: number = 0;
  public totalKills: number = 0;
  public highestSector: number = 1;
  public upgrades: MetaUpgrades = {
    hullPlating: 0,
    synapseSpeed: 0,
    overclockCap: 0,
    bladeEdge: 0,
    naniteVault: 0
  };

  constructor() {
    this.load();
  }

  public load() {
    try {
      const data = localStorage.getItem(META_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.metaCores = parsed.metaCores || 0;
        this.totalRuns = parsed.totalRuns || 0;
        this.totalKills = parsed.totalKills || 0;
        this.highestSector = parsed.highestSector || 1;
        this.upgrades = { ...this.upgrades, ...parsed.upgrades };
      }
    } catch (e) {
      console.warn('Failed to load meta save', e);
    }
  }

  public save() {
    try {
      const state = {
        metaCores: this.metaCores,
        totalRuns: this.totalRuns,
        totalKills: this.totalKills,
        highestSector: this.highestSector,
        upgrades: this.upgrades
      };
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save meta state', e);
    }
  }

  public getUpgradeCost(key: keyof MetaUpgrades): number {
    const level = this.upgrades[key];
    return (level + 1) * 20;
  }

  public canBuy(key: keyof MetaUpgrades): boolean {
    return this.metaCores >= this.getUpgradeCost(key) && this.upgrades[key] < 5;
  }

  public purchaseUpgrade(key: keyof MetaUpgrades): boolean {
    const cost = this.getUpgradeCost(key);
    if (this.metaCores >= cost && this.upgrades[key] < 5) {
      this.metaCores -= cost;
      this.upgrades[key]++;
      this.save();
      return true;
    }
    return false;
  }
}

export const meta = new MetaProgression();
