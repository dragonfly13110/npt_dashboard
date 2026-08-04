export function getKnowledgeBotKind(pathname = '') {
  if (pathname.startsWith('/public/knowledge-hub')) return 'hub';
  if (pathname.startsWith('/public/pesticides')) return 'pesticide';
  if (pathname.startsWith('/public/fertilizers')) return 'fertilizer';
  if (pathname.startsWith('/public/orchids')) return 'orchid';
  if (pathname.startsWith('/public/farmer-manual')) return 'farmer';
  if (pathname.startsWith('/public/rice')) return 'rice';
  if (pathname.startsWith('/public/machinery')) return 'machinery';
  return 'general';
}
