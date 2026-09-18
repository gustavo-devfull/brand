import type { NextConfig } from 'next';
const config: NextConfig = { serverExternalPackages: ['@resvg/resvg-js', 'opentype.js'], outputFileTracingIncludes: { '/*': ['./public/demo/**/*'] }, async headers() { return [{ source: '/:path*', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}] }]; } };
export default config;
