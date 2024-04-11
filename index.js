const { Octokit } = require("@octokit/rest");
const { createAppAuth } = require("@octokit/auth-app");
const core = require("@actions/core");
const github = require("@actions/github");

const context = github.context;
// Get the user, organization, repo, and template from the issue event payload
const user = context.payload.issue.user.login;
const organization = context.payload.organization.login;
const repo = context.payload.repository.name;
const template = context.payload.issue.title;

// Get the authorization inputs from the workflow file
const githubAppId = core.getInput('github_app_id') || process.env.GITHUB_APP_ID;
const githubAppPrivateKey = core.getInput('github_app_private_key') || process.env.GITHUB_APP_PRIVATE_KEY;
const githubAppInstallationId = core.getInput('github_app_installation_id') || process.env.GITHUB_APP_INSTALLATION_ID;
const githubApiUrl = core.getInput('github_api_url') || process.env.GITHUB_API_URL;
const githubPAT = core.getInput('github_pat') || process.env.GITHUB_PAT;

core.info(`isDebug? ${core.isDebug()}`);

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
  // Prefer app auth to PAT if both are available
  if (appId && appPrivateKey && appInstallationId) {
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
  } else {
    return new Octokit({
      auth: PAT,
      baseUrl: apiUrl,
      log: core.isDebug() ? console : null,
    });
  }
}

// Create a new repository from the template, using the Octokit instance,
// and log the response to the console and the issue comment thread on success or failure
// add user as an admin to teh repository that was created

async function createRepoFromTemplate() {
  try {
    const response = await octokit.repos.createUsingTemplate({
      template_owner: organization,
      template_repo: template,
      owner: organization,
      name: repo,
    });
    core.info(`Repository created: ${response.data.full_name}`);

    await octokit.repos.addCollaborator({
      owner: organization,
      repo: repo,
      username: user,
      permission: 'admin',
    });
    core.info(`User ${user} added as an admin to ${repo}`);

    // Comment back to the issue on success
    await octokit.issues.createComment({
      owner: organization,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Repository created successfully: ${response.data.html_url}\nUser ${user} added as an admin to ${repo}`
    });
  } catch (error) {
    core.setFailed(error.message);

    // Comment back to the issue on failure
    await octokit.issues.createComment({
      owner: organization,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `Failed to create repository: ${error.message}`
    });
  }
}

// Call the function to create the repository
createRepoFromTemplate();
