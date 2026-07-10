import {
  AuditOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import catalog from '../domain/datasetCatalog.json';

const ICONS = {
  audit: AuditOutlined,
  database: DatabaseOutlined,
  deploy: DeploymentUnitOutlined,
  read: ReadOutlined,
  safety: SafetyCertificateOutlined,
  setting: SettingOutlined,
  team: TeamOutlined,
  tool: ToolOutlined,
};

const ICON_KEYS = {
  'system-overview': 'read',
  overview: 'read',
  'data-collection': 'database',
  'data-preparation': 'tool',
  'csv-import': 'database',
  'supabase-design': 'setting',
  'project-setup': 'deploy',
  'dashboard-search-ai': 'audit',
  'ai-prompting': 'tool',
  'security-deploy': 'safety',
  'operations-training': 'team',
  'admin-sop': 'team',
};

export const manualRegistry = catalog.MANUALS.map((manual) => ({
  ...manual,
  Icon: ICONS[ICON_KEYS[manual.slug] || 'read'],
}));
