/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.env.NEXT_TRACING_ROOT || process.cwd(),
};

export default nextConfig;
