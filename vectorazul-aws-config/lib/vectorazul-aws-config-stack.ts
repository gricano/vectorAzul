import { AssetStaging, Aws, CfnOutput, CfnParameter, Duration, Fn, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { CfnAuthorizer, ContentHandling, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi, TokenAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { CfnSubnet, CfnVPC, SecurityGroup, Subnet } from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal, User } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, Tracing, HttpMethod, Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';

export class VectorazulAwsConfigStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    //#region Parametros
    const ProjectName = Fn.importValue('projectAzul');
    const EnvName = Fn.importValue('environmentAzul');

    const BucketNameConfiguracion = new CfnParameter(this, "BucketNameConfiguracion", {
      type: "String",
      description: "Nombre del bucket para el catalogo de emisoras",
      allowedValues: ['^.*[^0-9]$'],
      constraintDescription: "Debe de ser caracteres no numericos",
      default:'BucketConfiguracion'
    });
    //#endregion


    //#region  VPC and Subnets

    const VPC =new CfnVPC(this,'VPC', {
      cidrBlock: '10.10.0.0/10',
      enableDnsSupport:true,
      enableDnsHostnames:true,
      instanceTenancy:'default',
      tags: [{
        key: 'Name',
        value: `${ProjectName}-VPC` 
      },{
        key: 'Proyecto',
        value:  `${ProjectName}`, 
      }], 
    });  

    const Subnet1 = new CfnSubnet(this, 'Subnet1', {
      vpcId: VPC.logicalId, 
      availabilityZone: 'AWS::Region', 
      cidrBlock: '20.20.1.0/24', 
      tags: [{
        key: 'Name',
        value: `${ProjectName}-${EnvName}-Subnet-1`, 
      },{
        key: 'Proyecto',
        value: `${ProjectName}`, 
      }],
    });
   
    const Subnet2 = new CfnSubnet(this, 'Subnet2', {
      vpcId: VPC.logicalId, 
      availabilityZone: 'AWS::Region', 
      cidrBlock: '20.20.2.0/24', 
      tags: [{
        key: 'Name',
        value:`${ProjectName}-Subnet-2`, 
      },{
        key: 'Proyecto',
        value: `${ProjectName}`, 
      }],
    });

    //#endregion
    
    //#region Buckets  
     const BucketConfiguracion = new Bucket(this, `${BucketNameConfiguracion}`, { 
      versioned:true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    //#endregion

    //#region Roles
    const LambdaRoleConfiguracion = new Role(this,'configuracion-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'), 
      roleName: `${ProjectName}-${EnvName}-configuracion-role`,
      inlinePolicies: {
        'root': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'lambda:InvokeFunction',
                'lambda:InvokeAsync',
              ],
              effect: Effect.ALLOW,
              resources: ['*']
            })
          ]
        })
      },
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
        ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
        ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaExecute")
      ],
      path: '/service-role/',
    }); 
    //#endregion
    
    //#region Lamnda Functions
    const LambdaFunctionConfiguracion = new Function(this,'fnconfiguracion-lambda' , {
      architecture: Architecture.X86_64,
      functionName: `${ProjectName}-${EnvName}-configuracion-lambda`,
      description: 'Funcion lambda test configuracion',
      runtime: Runtime.PYTHON_3_7,
      
      handler: 'configuracion.lambda_handler',
      memorySize: 128,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(3),
      environment: {
        ApplicationID: 'VectorAzulComMx',
        Password: 'xxxH9xxU6xxexj9B',
        Tabla: 'VA-configuracion', 
        environ:'vectorAzul'
      },
      code: Code.fromAsset(path.join(__dirname, '../Funciones')),
      /*code: Code.fromAsset('Funciones', {
        bundling: {
          command: [
            'bash', '-c',
            `python -m pip install -r requirements.txt -t ${AssetStaging.BUNDLING_OUTPUT_DIR} &&` +
            `cp -rT ${AssetStaging.BUNDLING_INPUT_DIR}/${AssetStaging.BUNDLING_OUTPUT_DIR}`
          ],
          image: Runtime.PYTHON_3_7.bundlingImage,
        },
        exclude: ['*.pyc'], 
      }),*/
      role: LambdaRoleConfiguracion,
    });
    Tags.of(LambdaFunctionConfiguracion).add('Name', 'vectorAzul');
    Tags.of(LambdaFunctionConfiguracion).add('Ambiente', 'Dev');
    Tags.of(LambdaFunctionConfiguracion).add('Runtime', 'Python 3.7');
    Tags.of(LambdaFunctionConfiguracion).add('API', 'Configuracion');
    Tags.of(LambdaFunctionConfiguracion).add('Tipo', 'API');
 
    //#endregion
  
    //#region RestApi

    const APIConfiguracion = new RestApi(this, 'vectorAzul-ApisVectorConfiguracion', {
      description: 'API Gateway para el APIs Vector Azul Configuracion', 
      deployOptions: {
        stageName: 'Dev',
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'canal',
          'cuentasesion',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'token',
          'id',
        ],
        allowMethods: [HttpMethod.DELETE,
        HttpMethod.GET,
        HttpMethod.HEAD,
        HttpMethod.POST,
        HttpMethod.PUT,
        HttpMethod.PATCH,
        ],
        allowCredentials: true,
        allowOrigins: ['*'],
      },
    });

    const apiAuthorizer = new CfnAuthorizer(this, 'authorizer-APIConfiguracion', {
      identitySource: 'method.request.header.Authorization',
      identityValidationExpression: 'Bearer (.*)',
      name: 'authKMSConfig',
      restApiId: APIConfiguracion.restApiId,
      type: 'TOKEN',
      authorizerUri: Fn.importValue('KmsVerifyARN'),
    });

    APIConfiguracion.addRequestValidator('valalidateapiConfig', {
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    APIConfiguracion.root.addResource('configuracion').addMethod(HttpMethod.GET, new LambdaIntegration(LambdaFunctionConfiguracion, {
      integrationResponses: [{
        statusCode: '200',
      }],
      passthroughBehavior: PassthroughBehavior.WHEN_NO_MATCH,
      contentHandling: ContentHandling.CONVERT_TO_TEXT, 
    }), {
      methodResponses: [{ statusCode: '200' }],
      requestParameters: {
        "method.request.querystring.nombre": true, 
      },
      authorizer:{
        authorizerId:'',
      },
    });
     

    //#endregion
  }
}