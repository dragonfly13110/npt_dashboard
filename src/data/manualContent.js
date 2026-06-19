const modules = import.meta.glob('../../docs/manual/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export const manualContentByFile = Object.fromEntries(
  Object.entries(modules).map(([path, content]) => [
    path.split('/').pop(),
    content,
  ])
);
