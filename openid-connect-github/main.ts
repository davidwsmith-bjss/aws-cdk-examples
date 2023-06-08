import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface GitHubStackProps extends cdk.StackProps {

  readonly deployRole: string;
  readonly repositoryConfig: { owner: string; repo: string; filter?: string }[];
}
export class GitHubStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GitHubStackProps) {
    super(scope, id, props);

    const githubDomain = 'token.actions.githubusercontent.com';

    const ghProvider = new iam.OpenIdConnectProvider(this, 'githubProvider', {
      url: `https://${githubDomain}`,
      clientIds: ['sts.amazonaws.com'],
    });

    const iamRepoDeployAccess = props.repositoryConfig.map(r =>
        `repo:${r.owner}/${r.repo}:${r.filter ?? '*'}`);

    // grant only requests coming from a specific GitHub repository.
    const conditions: iam.Conditions = {
      StringLike: {
        [`${githubDomain}:sub`]: iamRepoDeployAccess,
      },
    };

    new iam.Role(this, 'cloudNationGitHubDeployRole', {
      assumedBy: new iam.WebIdentityPrincipal(ghProvider.openIdConnectProviderArn, conditions),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
      roleName: props.deployRole,
      description: 'This role is used via GitHub Actions to deploy with AWS CDK or Terraform on the target AWS account',
      maxSessionDuration: cdk.Duration.hours(1),
    });
  }
}

const app = new cdk.App();
new GitHubStack(app, 'GitHubOpenIDConnect', {
  deployRole: 'exampleGitHubDeployRole',
  repositoryConfig: [
    { owner: 'dannysteenman', repo: 'aws-cdk-examples' },
    { owner: 'dannysteenman', repo: 'aws-toolbox', filter: 'main' },
  ],
});
app.synth();
}