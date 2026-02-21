import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { getModelConfig } from './model-config';

export class ResumeTailorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get deployment mode from context (default: TESTING)
    const deploymentMode = this.node.tryGetContext('deploymentMode') || 'TESTING';
    const modelConfig = getModelConfig(deploymentMode);
    
    // Determine if this is the feature stack
    const isFeatureStack = id === 'ResumeTailorFeatureStack';
    const suffix = isFeatureStack ? '-feature' : '';
    
    console.log(`🚀 Deploying ${id} with ${deploymentMode} mode`);
    console.log('Model configuration:', modelConfig);

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `ResumeTailorUsers${suffix}`,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      selfSignUpEnabled: false,
    });

    // User Pool Client
    const userPoolClient = userPool.addClient('WebClient', {
      userPoolClientName: `ResumeTailorWebClient${suffix}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
    });

    // Identity Pool for AWS credentials
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `ResumeTailorIdentityPool${suffix}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // S3 Bucket for hosting frontend
    const hostingBucket = new s3.Bucket(this, 'HostingBucket', {
      bucketName: `resume-tailor-hosting${suffix}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for Resume Tailor frontend',
    });

    hostingBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(hostingBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // S3 Bucket for resume storage
    const resumeBucket = new s3.Bucket(this, 'ResumeBucket', {
      bucketName: `resume-tailor${suffix}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [
            'http://localhost:3000',
            'http://localhost:5173',
            `https://${distribution.distributionDomainName}`,
          ],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
        {
          id: 'DeleteOldUploads',
          prefix: 'uploads/',
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // DynamoDB Table for job analysis results
    const resultsTable = new dynamodb.Table(this, 'ResultsTable', {
      tableName: `ResumeTailorResults${suffix}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for user queries
    resultsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // Lambda execution role with Bedrock access
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant Bedrock access — scoped to specific model families
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-opus-4-5-*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-*`,
          `arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/us.anthropic.claude-opus-4-5-*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/us.anthropic.claude-sonnet-4-5-*`,
          `arn:aws:bedrock:*:${this.account}:inference-profile/us.anthropic.claude-haiku-4-5-*`,
        ],
      })
    );

    // Grant AWS Marketplace permissions for Bedrock models — scoped to view only
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'aws-marketplace:ViewSubscriptions',
        ],
        resources: ['*'],
      })
    );

    // Grant S3 and DynamoDB access
    resumeBucket.grantReadWrite(lambdaRole);
    resultsTable.grantReadWriteData(lambdaRole);

    // Common Lambda environment variables
    const lambdaEnvironment = {
      BUCKET_NAME: resumeBucket.bucketName,
      TABLE_NAME: resultsTable.tableName,
      BEDROCK_REGION: this.region,
    };

    // Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/layers/shared'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_14],
      description: 'Shared utilities and dependencies',
    });

    // Lambda Functions for Step Functions workflow
    
    // 1. Parse Job Description
    const parseJobFn = new lambda.Function(this, 'ParseJobFunction', {
      functionName: `ResumeTailor${suffix}-ParseJob`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'parse_job.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.parseJob,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 512,
      layers: [sharedLayer],
    });

    // 2. Analyze Resume Fit
    const analyzeResumeFn = new lambda.Function(this, 'AnalyzeResumeFunction', {
      functionName: `ResumeTailor${suffix}-AnalyzeResume`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'analyze_resume.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.analyzeResume,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 1024,
      layers: [sharedLayer],
    });

    // 3. Generate Tailored Resume
    const generateResumeFn = new lambda.Function(this, 'GenerateResumeFunction', {
      functionName: `ResumeTailor${suffix}-GenerateResume`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'generate_resume.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.generateResume,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 2048,
      layers: [sharedLayer],
    });

    // 4. ATS Optimization
    const atsOptimizeFn = new lambda.Function(this, 'ATSOptimizeFunction', {
      functionName: `ResumeTailor${suffix}-ATSOptimize`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'ats_optimize.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.atsOptimize,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 1024,
      layers: [sharedLayer],
    });

    // 5. Generate Cover Letter
    const coverLetterFn = new lambda.Function(this, 'CoverLetterFunction', {
      functionName: `ResumeTailor${suffix}-CoverLetter`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'cover_letter.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.coverLetter,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 1024,
      layers: [sharedLayer],
    });

    // 6. Critical Review
    const criticalReviewFn = new lambda.Function(this, 'CriticalReviewFunction', {
      functionName: `ResumeTailor${suffix}-CriticalReview`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'critical_review.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.criticalReview,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 1024,
      layers: [sharedLayer],
    });

    // 7. Save Results
    const saveResultsFn = new lambda.Function(this, 'SaveResultsFunction', {
      functionName: `ResumeTailor${suffix}-SaveResults`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'save_results.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.minutes(13),
      memorySize: 512,
      layers: [sharedLayer],
    });

    // 8. Refine Resume (based on critical feedback)
    const refineResumeFn = new lambda.Function(this, 'RefineResumeFunction', {
      functionName: `ResumeTailor${suffix}-RefineResume`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'refine_resume.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: {
        ...lambdaEnvironment,
        MODEL_ID: modelConfig.generateResume,
      },
      timeout: cdk.Duration.minutes(13),
      memorySize: 2048,
      layers: [sharedLayer],
    });

    // 9. Send Notification (optional)
    const notifyFn = new lambda.Function(this, 'NotifyFunction', {
      functionName: `ResumeTailor${suffix}-Notify`,
      runtime: lambda.Runtime.PYTHON_3_14,
      handler: 'notify.handler',
      code: lambda.Code.fromAsset('lambda/functions'),
      role: lambdaRole,
      environment: lambdaEnvironment,
      timeout: cdk.Duration.minutes(13),
      memorySize: 256,
      layers: [sharedLayer],
    });

    // Grant SES permissions for notifications
    notifyFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    // Retry configuration for transient Bedrock failures
    const bedrockRetryProps = {
      errors: ['States.TaskFailed', 'States.Timeout'],
      interval: cdk.Duration.seconds(5),
      maxAttempts: 2,
      backoffRate: 2.0,
    };

    // Step Functions State Machine
    const parseJobTask = new tasks.LambdaInvoke(this, 'ParseJobDescription', {
      lambdaFunction: parseJobFn,
      resultPath: '$.parsedJob',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    parseJobTask.addRetry(bedrockRetryProps);

    const analyzeResumeTask = new tasks.LambdaInvoke(this, 'AnalyzeResumeFit', {
      lambdaFunction: analyzeResumeFn,
      payload: sfn.TaskInput.fromObject({
        'jobId.$': '$.jobId',
        'userId.$': '$.userId',
        'resumeS3Keys.$': '$.resumeS3Keys',
        'parsedJob.$': '$.parsedJob.Payload',
        'userEmail.$': '$.userEmail',
      }),
      resultPath: '$.analysis',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    analyzeResumeTask.addRetry(bedrockRetryProps);

    const generateResumeTask = new tasks.LambdaInvoke(this, 'GenerateTailoredResume', {
      lambdaFunction: generateResumeFn,
      payload: sfn.TaskInput.fromObject({
        'jobId.$': '$.jobId',
        'userId.$': '$.userId',
        'resumeS3Keys.$': '$.resumeS3Keys',
        'parsedJob.$': '$.parsedJob.Payload',
        'analysis.$': '$.analysis.Payload',
      }),
      resultPath: '$.tailoredResume',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    generateResumeTask.addRetry(bedrockRetryProps);

    const atsOptimizeTask = new tasks.LambdaInvoke(this, 'ATSOptimization', {
      lambdaFunction: atsOptimizeFn,
      payload: sfn.TaskInput.fromObject({
        'tailoredResumeMarkdown.$': '$.tailoredResume.Payload.tailoredResumeMarkdown',
        'parsedJob.$': '$.parsedJob.Payload',
      }),
      outputPath: '$.Payload',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    atsOptimizeTask.addRetry(bedrockRetryProps);

    const coverLetterTask = new tasks.LambdaInvoke(this, 'GenerateCoverLetter', {
      lambdaFunction: coverLetterFn,
      payload: sfn.TaskInput.fromObject({
        'jobId.$': '$.jobId',
        'jobDescription.$': '$.jobDescription',
        'tailoredResumeMarkdown.$': '$.tailoredResume.Payload.tailoredResumeMarkdown',
        'parsedJob.$': '$.parsedJob.Payload',
        'analysis.$': '$.analysis.Payload',
      }),
      outputPath: '$.Payload',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    coverLetterTask.addRetry(bedrockRetryProps);

    const criticalReviewTask = new tasks.LambdaInvoke(this, 'CriticalReview', {
      lambdaFunction: criticalReviewFn,
      payload: sfn.TaskInput.fromObject({
        'tailoredResumeMarkdown.$': '$.tailoredResume.Payload.tailoredResumeMarkdown',
      }),
      outputPath: '$.Payload',
      taskTimeout: sfn.Timeout.duration(cdk.Duration.minutes(13)),
    });
    criticalReviewTask.addRetry(bedrockRetryProps);

    const saveResultsTask = new tasks.LambdaInvoke(this, 'SaveResults', {
      lambdaFunction: saveResultsFn,
      payload: sfn.TaskInput.fromObject({
        'jobId.$': '$.jobId',
        'userId.$': '$.userId',
        'jobDescription.$': '$.jobDescription',
        'parsedJob.$': '$.parsedJob.Payload',
        'analysis.$': '$.analysis.Payload',
        'tailoredResume.$': '$.tailoredResume.Payload',
        'parallelResults.$': '$.parallelResults',
      }),
      outputPath: '$.Payload',
    });
    saveResultsTask.addRetry({
      errors: ['States.TaskFailed'],
      interval: cdk.Duration.seconds(2),
      maxAttempts: 2,
      backoffRate: 2.0,
    });

    const notifyTask = new tasks.LambdaInvoke(this, 'SendNotification', {
      lambdaFunction: notifyFn,
      outputPath: '$.Payload',
    });

    // Parallel processing for optimization tasks
    const parallelOptimization = new sfn.Parallel(this, 'ParallelOptimization', {
      resultPath: '$.parallelResults',
    })
      .branch(atsOptimizeTask)
      .branch(coverLetterTask)
      .branch(criticalReviewTask);

    // Define workflow
    const definition = parseJobTask
      .next(analyzeResumeTask)
      .next(generateResumeTask)
      .next(parallelOptimization)
      .next(saveResultsTask)
      .next(notifyTask);

    // Create State Machine
    const stateMachine = new sfn.StateMachine(this, 'ResumeTailorWorkflow', {
      stateMachineName: `ResumeTailorWorkflow`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      logs: {
        destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
          logGroupName: `/aws/stepfunctions/ResumeTailorWorkflow${suffix}`,
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
      timeout: cdk.Duration.minutes(15),
    });

    // Application Role for frontend to assume
    const appRole = new iam.Role(this, 'ResumeTailorAppRole', {
      roleName: 'ResumeTailorAppRole',
      assumedBy: new iam.CompositePrincipal(
        new iam.AccountPrincipal(this.account),
        new iam.ServicePrincipal('lambda.amazonaws.com')
      ),
      description: 'Central role for Resume Tailor application',
    });

    // Grant app role permissions
    resumeBucket.grantReadWrite(appRole);
    resultsTable.grantReadWriteData(appRole);
    stateMachine.grantStartExecution(appRole);
    stateMachine.grantRead(appRole);

    // Grant Bedrock access to app role
    appRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-5-*`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-opus-4-5-*`,
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-haiku-4-5-*`,
        ],
      })
    );

    // Cognito Authenticated Role
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant authenticated users permissions
    resumeBucket.grantReadWrite(authenticatedRole);
    resultsTable.grantReadWriteData(authenticatedRole);
    stateMachine.grantStartExecution(authenticatedRole);
    stateMachine.grantRead(authenticatedRole);
    
    // Grant authenticated users permission to invoke refine resume function
    refineResumeFn.grantInvoke(authenticatedRole);

    // Attach role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `ResumeTailorUserPoolId${suffix}`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `ResumeTailorUserPoolClientId${suffix}`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
      exportName: `ResumeTailorIdentityPoolId${suffix}`,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: resumeBucket.bucketName,
      description: 'S3 bucket for resume storage',
      exportName: `ResumeTailorBucketName${suffix}`,
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: resultsTable.tableName,
      description: 'DynamoDB table for results',
      exportName: `ResumeTailorTableName${suffix}`,
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN',
      exportName: `ResumeTailorStateMachineArn${suffix}`,
    });

    new cdk.CfnOutput(this, 'AppRoleArn', {
      value: appRole.roleArn,
      description: 'Application role ARN for frontend',
      exportName: `ResumeTailorAppRoleArn${suffix}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `ResumeTailorDistributionDomain${suffix}`,
    });

    new cdk.CfnOutput(this, 'HostingBucketName', {
      value: hostingBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
      exportName: `ResumeTailorHostingBucket${suffix}`,
    });

    new cdk.CfnOutput(this, 'RefineResumeFunctionName', {
      value: refineResumeFn.functionName,
      description: 'Lambda function for refining resumes',
      exportName: `ResumeTailorRefineResumeFunction${suffix}`,
    });
  }
}
