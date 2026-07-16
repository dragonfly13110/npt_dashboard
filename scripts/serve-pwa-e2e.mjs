import { build, preview } from 'vite';

await build();
await preview({ preview: { port: 5174, strictPort: true } });
