/**
 * Phase 1: Platform Registry Engine
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Manages all registered business platforms in the Digital Ecosystem.
 * Allows Root Super Admin to add new platforms without changing code.
 */

export interface PlatformMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  themeColor: 'blue' | 'emerald' | 'slate' | 'purple' | 'amber';
  version: string;
  activeStatus: boolean;
  createdBy: string;
  createdAt: string;
  modulesCount: number;
}

export const REGISTERED_PLATFORMS: PlatformMetadata[] = [
  {
    id: 'plat-abf',
    name: 'Abhinav Bharat Foundation Enterprise',
    slug: 'abf',
    description: 'Internal Organizational Governance, HRMS, Recruitment, CRM & Office Management',
    logo: '🏛️',
    themeColor: 'blue',
    version: 'v1.0.0',
    activeStatus: true,
    createdBy: 'ROOT_SUPER_ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
    modulesCount: 7,
  },
  {
    id: 'plat-maha-agri',
    name: 'MAHA-AGRI Government Platform',
    slug: 'maha-agri',
    description: 'Statewide Agriculture Digital Operations, Farmer 360, Soil Testing & EDP Entrepreneurship',
    logo: '🌾',
    themeColor: 'emerald',
    version: 'v1.2.0',
    activeStatus: true,
    createdBy: 'ROOT_SUPER_ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
    modulesCount: 8,
  },
  {
    id: 'plat-education',
    name: 'Education & Academics Platform',
    slug: 'education',
    description: 'State Rural Education, Digital Schools & Skill Training Hub',
    logo: '🎓',
    themeColor: 'purple',
    version: 'v0.9.0 (Beta)',
    activeStatus: true,
    createdBy: 'ROOT_SUPER_ADMIN',
    createdAt: '2026-03-15T00:00:00.000Z',
    modulesCount: 3,
  },
];

export class PlatformRegistryService {
  private platforms = [...REGISTERED_PLATFORMS];

  public getActivePlatforms(): PlatformMetadata[] {
    return this.platforms.filter((p) => p.activeStatus);
  }

  public getPlatformBySlug(slug: string): PlatformMetadata | undefined {
    return this.platforms.find((p) => p.slug === slug);
  }

  public registerPlatform(newPlatform: Omit<PlatformMetadata, 'id' | 'createdAt'>): PlatformMetadata {
    const entry: PlatformMetadata = {
      ...newPlatform,
      id: `plat-${newPlatform.slug}`,
      createdAt: new Date().toISOString(),
    };
    this.platforms.push(entry);
    return entry;
  }
}

export const PlatformRegistry = new PlatformRegistryService();
