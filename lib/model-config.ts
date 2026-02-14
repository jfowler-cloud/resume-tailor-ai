/**
 * Model Configuration for Resume Tailor
 * 
 * Defines which Claude models to use for each Lambda function.
 * Two deployment modes:
 * - PREMIUM: Uses Claude Opus 4.5 for all functions (best quality, higher cost)
 * - OPTIMIZED: Uses cheaper models for simpler tasks (lower cost, good quality)
 */

export enum DeploymentMode {
  PREMIUM = 'PREMIUM',
  OPTIMIZED = 'OPTIMIZED'
}

export interface ModelConfig {
  parseJob: string;
  analyzeResume: string;
  generateResume: string;
  atsOptimize: string;
  coverLetter: string;
  criticalReview: string;
}

/**
 * Model configurations for different deployment modes
 */
export const MODEL_CONFIGS: Record<DeploymentMode, ModelConfig> = {
  // Premium: Claude Opus 4.5 for everything (maximum reasoning)
  [DeploymentMode.PREMIUM]: {
    parseJob: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    analyzeResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    generateResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    atsOptimize: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    coverLetter: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    criticalReview: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  },
  
  // Optimized: Mix of models based on task complexity
  [DeploymentMode.OPTIMIZED]: {
    // Simple parsing - use Haiku (cheapest)
    parseJob: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    
    // Critical analysis - use Opus 4.5 (best reasoning)
    analyzeResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    
    // Resume generation - use Opus 4.5 (most important output)
    generateResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    
    // ATS optimization - use Sonnet (good balance)
    atsOptimize: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    
    // Cover letter - use Sonnet (good writing quality)
    coverLetter: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    
    // Critical review - use Sonnet (good analysis)
    criticalReview: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  }
};

/**
 * Cost comparison (approximate per 1M tokens)
 * 
 * Claude Opus 4.5:
 *   Input: $15.00 | Output: $75.00
 * 
 * Claude 3.5 Sonnet v2:
 *   Input: $3.00 | Output: $15.00
 * 
 * Claude 3.5 Haiku:
 *   Input: $1.00 | Output: $5.00
 * 
 * Estimated savings with OPTIMIZED mode: ~60-70%
 */

/**
 * Get model configuration for deployment
 */
export function getModelConfig(mode?: string): ModelConfig {
  const deploymentMode = (mode?.toUpperCase() as DeploymentMode) || DeploymentMode.PREMIUM;
  
  if (!MODEL_CONFIGS[deploymentMode]) {
    console.warn(`Unknown deployment mode: ${mode}, defaulting to PREMIUM`);
    return MODEL_CONFIGS[DeploymentMode.PREMIUM];
  }
  
  return MODEL_CONFIGS[deploymentMode];
}
