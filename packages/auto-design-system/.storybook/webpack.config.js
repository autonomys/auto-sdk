import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    include: path.resolve(__dirname, '../src/styles.css'),
  })

  return config
}
