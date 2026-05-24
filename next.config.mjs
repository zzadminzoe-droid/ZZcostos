/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // @react-pdf/renderer usa canvas internamente; en Node/SSR no existe
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },
}

export default nextConfig
