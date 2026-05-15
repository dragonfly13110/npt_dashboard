const BASE_PRIVATE_PATTERNS = [
    /citizen|id_card|national_id/i,
    /phone|mobile|tel/i,
    /address|address_no|moo|road|soi|house/i,
    /first_name|last_name|full_name|owner_name|farmer_name|contact_person/i,
];

const PUBLIC_NAME_ALLOW_PATTERNS = [
    /chairman|president|leader/i,
];

const TABLE_PRIVATE_COLUMNS = {
    smart_farmer_sf: ['citizen_id', 'title', 'first_name', 'last_name', 'full_name', 'phone', 'annual_agri_income'],
    young_smart_farmer_ysf: ['title', 'first_name', 'last_name', 'full_name', 'address_no', 'moo', 'subdistrict', 'phone', 'line_id', 'email', 'facebook', 'annual_agri_income'],
    agricultural_career_groups: ['address_no', 'moo', 'mobile'],
    young_farmer_groups_detailed: ['address_no', 'moo', 'phone', 'mobile'],
    smart_farmers: ['full_name', 'phone', 'address'],
    coconut_aromatic_surveys: ['farmer_name', 'phone', 'address'],
    farmer_registry: ['contact_person', 'phone', 'address'],
    certifications: ['owner_name', 'phone', 'address'],
    large_plots: ['contact_person', 'phone', 'address'],
    agri_tourism: ['contact_person', 'phone', 'address'],
    personnel: ['phone', 'email', 'address'],
};

export function isPrivateColumn(tableName, column = {}) {
    const dataIndex = String(column.dataIndex || '');
    const title = String(column.title || '');
    if (!dataIndex) return false;
    if (column.public === true) return false;
    if (column.private === true || column.hideForGuest === true) return true;

    const tablePrivate = TABLE_PRIVATE_COLUMNS[tableName] || [];
    if (tablePrivate.includes(dataIndex)) return true;
    if (PUBLIC_NAME_ALLOW_PATTERNS.some((pattern) => pattern.test(dataIndex) || pattern.test(title))) return false;
    return BASE_PRIVATE_PATTERNS.some((pattern) => pattern.test(dataIndex));
}

export function getPublicColumns(tableName, columns, role) {
    if (role !== 'guest') return columns;
    return columns.filter((column) => !isPrivateColumn(tableName, column));
}
