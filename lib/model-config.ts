/**
 * Model Configuration for Resume Tailor
 * 
 * Defines which Claude models to use for each Lambda function.
 * Three deployment modes:
 * - TESTING: Uses Haiku 3.0 for all functions (fastest, cheapest, for development)
 * - OPTIMIZED: Uses cheaper models for simpler tasks (lower cost, good quality)
 * - PREMIUM: Uses Claude Opus 4.5 for all functions (best quality, higher cost)
 */

export enum DeploymentMode {
  TESTING = 'TESTING',
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
  // Testing: Haiku 3.0 for everything (fast and cheap for development)
  [DeploymentMode.TESTING]: {
    parseJob: 'anthropic.claude-3-haiku-20240307-v1:0',
    analyzeResume: 'anthropic.claude-3-haiku-20240307-v1:0',
    generateResume: 'anthropic.claude-3-haiku-20240307-v1:0',
    atsOptimize: 'anthropic.claude-3-haiku-20240307-v1:0',
    coverLetter: 'anthropic.claude-3-haiku-20240307-v1:0',
    criticalReview: 'anthropic.claude-3-haiku-20240307-v1:0',
  },
  
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
    // Simple parsing - use Haiku 4.5 (fast and cost-effective)
    parseJob: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    
    // Critical analysis - use Opus 4.5 (best reasoning)
    analyzeResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    
    // Resume generation - use Opus 4.5 (most important output)
    generateResume: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
    
    // ATS optimization - use Sonnet 4.5 (excellent balance)
    atsOptimize: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    
    // Cover letter - use Sonnet 4.5 (excellent writing quality)
    coverLetter: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    
    // Critical review - use Sonnet 4.5 (strong analysis)
    criticalReview: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
  }
};

/**
 * Cost comparison (approximate per 1M tokens)
 * 
 * Claude Opus 4.5:
 *   Input: $15.00 | Output: $75.00
 * 
 * Claude Sonnet 4.5:
 *   Input: $3.00 | Output: $15.00
 * 
 * Claude Haiku 4.5:
 *   Input: $1.00 | Output: $5.00
 * 
 * Claude Haiku 3.0:
 *   Input: $0.25 | Output: $1.25
 * 
 * Estimated savings:
 * - TESTING vs PREMIUM: ~95% cost reduction
 * - OPTIMIZED vs PREMIUM: ~50-60% cost reduction
 */

/**
 * Get model configuration for deployment
 */
export function getModelConfig(mode?: string): ModelConfig {
  const deploymentMode = (mode?.toUpperCase() as DeploymentMode) || DeploymentMode.TESTING;
  
  if (!MODEL_CONFIGS[deploymentMode]) {
    console.warn(`Unknown deployment mode: ${mode}, defaulting to TESTING`);
    return MODEL_CONFIGS[DeploymentMode.TESTING];
  }
  
  return MODEL_CONFIGS[deploymentMode];
}
