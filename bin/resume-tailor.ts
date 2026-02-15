#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ResumeTailorStack } from '../lib/resume-tailor-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

new ResumeTailorStack(app, 'ResumeTailorStack', {
  env,
  description: 'AI-Powered Resume Tailor Platform using Claude 4.5 and Step Functions',
  tags: {
    Project: 'ResumeTailor',
    Environment: app.node.tryGetContext('environment') || 'dev',
    ManagedBy: 'CDK',
  },
});

// Feature stack for testing (separate from production)
const stackName = app.node.tryGetContext('stackName');
if (stackName === 'ResumeTailorFeatureStack') {
  new ResumeTailorStack(app, 'ResumeTailorFeatureStack', {
    env,
    description: 'AI-Powered Resume Tailor Platform - Feature Testing Stack',
    tags: {
      Project: 'ResumeTailor',
      Environment: 'feature',
      ManagedBy: 'CDK',
      Purpose: 'Testing',
    },
  });
}

app.synth();
