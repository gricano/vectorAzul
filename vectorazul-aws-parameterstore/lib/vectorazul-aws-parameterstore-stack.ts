import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { ParameterTier, ParameterType, StringListParameter, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class VectorazulAwsParameterstoreStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const projectParam = new StringParameter(this, 'project-param', {
      parameterName: '/vectorAzul/ProjectName',
      stringValue: 'vectorAzul',
      description: 'the name of project',
      type: ParameterType.STRING,
      tier: ParameterTier.STANDARD,
      allowedPattern: '.*',
    });  
    const environments  = new StringParameter(this,'environments-param',{
        parameterName: '/vectorAzul/environments',
        stringValue : 'dev',
        tier: ParameterTier.ADVANCED,
      },
    );

    new CfnOutput(this, 'vectorProjectRef', {
      value: projectParam.parameterName,
      description: 'The name of project',
      exportName: 'projectAzul',
    });

    new CfnOutput(this, 'vectorEnvironmentsRef', {
      value: environments.parameterName,
      description: 'The environments name of project',
      exportName: 'environmentAzul',
    });
  
  }
} 

const app = new App();

new VectorazulAwsParameterstoreStack(app, 'parameterstore-stack', {
  stackName: 'vetorazul-parameterstore-stack',
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});
