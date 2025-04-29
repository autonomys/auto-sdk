// Re-export the main factory function
export { createExperienceManager } from './experienceManager'

// Re-export relevant types for consumers of this package
export type {
  AgentExperience, // Type for retrieved data
  CidManager, // If consumers need direct access to the CidManager instance
  EvmOptions, // If consumers need to configure wallet options
  ExperienceHeader, // Type for retrieved data
  ExperienceManager,
  ExperienceManagerOptions,
  ExperienceUploadOptions,
} from './types.js'
