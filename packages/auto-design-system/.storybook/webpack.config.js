import path from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default ({ config }) => {
  // Typescript support
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
        },
      },
    ],
  })

  // Add TypeScript extensions
  config.resolve.extensions.push('.ts', '.tsx')

  // Add Node.js polyfills for browser environment
  config.resolve.fallback = {
    ...config.resolve.fallback,
    stream: 'stream-browserify',
    buffer: 'buffer',
    util: 'util',
    events: 'events',
    assert: 'assert',
  }

  // Add PostCSS loader for Tailwind CSS
  config.module.rules.push({
    test: /\.css$/,
    use: [
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: ['tailwindcss', 'autoprefixer'],
          },
        },
      },
    ],
    include: path.resolve(dirname, '../src/styles.css'),
  })

  // Provide Buffer and process globals
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  )

  // Add alias to mock problematic modules
  config.resolve.alias = {
    ...config.resolve.alias,
    'stream-fork': path.resolve(dirname, './mocks/stream-fork.js'),
  }

  return config
}
