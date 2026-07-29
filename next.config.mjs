/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // bcryptjs is pure JS; nothing native to externalise. Keep config minimal.
};

export default nextConfig;
