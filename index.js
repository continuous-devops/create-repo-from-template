const { Octokit } = require("@octokit/rest");
const { createAppAuth } = require("@octokit/auth-app");
const core = require("@actions/core");
const github = require("@actions/github");

const context = github.context;
// Get the user, organization, repo, and template from the issue event payload
const user = context.payload?.issue?.user?.login || process.env.USER;
const organization = context.payload?.organization?.login || process.env.ORGANIZATION;
const issuesRepoName = context.payload?.repository?.name || process.env.ISSUES_REPO_NAME;
const issuesNumber = context.payload?.issue?.number || process.env.ISSUES_NUMBER;

// Get the repository name to create and template from the workflow file
const createRepoName = core.getInput('repo_name') || process.env.REPO_NAME;
const repoTemplate = core.getInput('repo_template') || process.env.REPO_TEMPLATE;

// Get the authorization inputs from the workflow file
const githubAppId = core.getInput('app_id') || process.env.APP_ID;
const githubAppPrivateKey = core.getInput('app_private_key') || process.env.APP_PRIVATE_KEY;
const githubAppInstallationId = core.getInput('app_installation_id') || process.env.APP_INSTALLATION_ID;
const githubApiUrl = core.getInput('api_url') || process.env.API_URL;
const githubPAT = core.getInput('pat') || process.env.PAT;
const isDebug = core.getInput('is_debug') || process.env.DEBUG;

core.info(`isDebug? ${isDebug}`);

// Create Octokit instances for source and target
const octokit = createOctokitInstance(
  githubPAT,
  githubAppId,
  githubAppPrivateKey,
  githubAppInstallationId,
  githubApiUrl
);

// Function to create Octokit instance
function createOctokitInstance(PAT, appId, appPrivateKey, appInstallationId, apiUrl) {
  // Prefer PAT over GitHub App for authentication
  if (PAT) {
    return new Octokit({
      auth: PAT,
      baseUrl: apiUrl,
      log: core.isDebug() ? console : null,
    });
  } else {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: appId,
        privateKey: appPrivateKey,
        installationId: appInstallationId,
      },
      baseUrl: apiUrl,
      log: core.isDebug() ? console : null,
    });
  }
}

// Create a new repository from the template, using the Octokit instance,
// and log the response to the console and the issue comment thread on success or failure
// add user as an admin to teh repository that was created
// close the issue

async function createRepoFromTemplate() {
  try {
    // Check if the repository already exists
    try {
      await octokit.repos.get({
        owner: organization,
        repo: createRepoName,
      });
      core.info(`Repository ${repo} already exists`);

      // Comment back to the issue that repository already exists
      await octokit.issues.createComment({
        owner: organization,
        repo: IssuesRepoName,
        issue_number: context.payload.issue.number,
        body: `Repository ${repo} already exists.`
      });
      return;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      // Repository does not exist, continue with creation
    }

    const response = await  octokit.request('POST /repos/{template_owner}/{template_repo}/generate',{
      template_owner: organization,
      template_repo: repoTemplate,
      owner: organization,
      name: createRepoName,
      include_all_branches: true,
      'private': true,
    });
    core.info(`Repository created: ${response.data.full_name}`);

    await octokit.repos.addCollaborator({
      owner: organization,
      repo: createRepoName,
      username: user,
      permission: 'admin',
    });
    core.info(`User ${user} added as an admin to ${repo}`);

    // Comment back to the issue on success
    await octokit.issues.createComment({
      owner: organization,
      repo: IssuesRepoName,
      issue_number: issuesNumber,
      body: `Repository created successfully: ${response.data.html_url}\nUser ${user} added as an admin to ${createRepoName}`
    });

    // Close the issue on success
    await octokit.issues.update({
      owner: organization,
      repo: IssuesRepoName,
      issue_number: issuesNumber,
      state: 'closed'
    });
  } catch (error) {
    core.setFailed(error.message);

    // Comment back to the issue on failure
    await octokit.issues.createComment({
      owner: organization,
      repo: issuesRepoName,
      issue_number: issuesNumber,
      body: `Failed to create repository ${createRepoName}: ${error.message}`
    });
  }
}

// Call the function to create the repository
createRepoFromTemplate();
