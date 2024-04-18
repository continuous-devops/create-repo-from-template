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
const createRepoName = core.getInput("repo_name") || process.env.REPO_NAME;
const repoTemplate = core.getInput("repo_template") || process.env.REPO_TEMPLATE;

// Get the authorization inputs from the workflow file
const githubApiUrl = core.getInput("api_url") || process.env.API_URL;
const githubPAT = core.getInput("pat") || process.env.PAT;
const isDebug = core.getInput("is_debug") || process.env.DEBUG;

core.info(`isDebug? ${isDebug}`);

// Create Octokit instances for source and target
const octokit = createOctokitInstance(githubPAT, githubApiUrl);

// Function to create Octokit instance
function createOctokitInstance(PAT, apiUrl) {
  // Prefer PAT over GitHub App for authentication
  return new Octokit({
    auth: PAT,
    baseUrl: apiUrl,
    log: core.isDebug() ? console : null,
  });
}

async function createComment(body) {
  return await octokit.issues.createComment({
    owner: organization,
    repo: issuesRepoName,
    issue_number: issuesNumber,
    body: body,
  });
}

async function createRepo() {
  return await octokit.request("POST /repos/{template_owner}/{template_repo}/generate", {
    template_owner: organization,
    template_repo: repoTemplate,
    owner: organization,
    name: createRepoName,
    include_all_branches: true,
    private: true,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}
async function addCollaborator(username) {
  await octokit.request("PUT /repos/{owner}/{repo}/collaborators/{username}", {
    owner: organization,
    repo: createRepoName,
    username: username,
    permission: "admin",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function closeIssue() {
  return await octokit.issues.update({
    owner: organization,
    repo: issuesRepoName,
    issue_number: issuesNumber,
    state: "closed",
  });
}

// Create a new repository from the template, using the Octokit instance,
// and log the response to the console and the issue comment thread on success or failure
// add user as an admin to teh repository that was created
// close the issue

async function createRepoFromTemplate() {
  core.debug(`
  vars:
    user: ${user}
    organization: ${organization}
    issuesRepoName: ${issuesRepoName}
    issueNumber: ${issuesNumber}
    createRepoName: ${createRepoName}
    repoTemplate: ${repoTemplate}
    githubApiUrl: ${githubApiUrl}
    githubPAT: ${githubPAT}
  `);
  try {
    await octokit.repos.get({
      owner: organization,
      repo: createRepoName,
    });
  } catch (error) {
    if (error.status !== 404) {
      core.info(`Repository ${createRepoName} already exists`);
      // Comment back to the issue that repository already exists
      await createComment(`Repository ${createRepoName} already exists.`);
      throw error;
    }
  }

  try {
    // Check if the repository already exists
    const response = await createRepo();
    core.info(`Repository created: ${response.data.full_name}`);

    await addCollaborator(user);
    core.info(`User @${user} added as an admin to ${createRepoName}`);

    // Comment back to the issue on success
    await createComment(
      `Repository created successfully: ${response.data.html_url}\nUser @${user} added as an admin to \`${createRepoName}\``
    );

    // Close the issue on success
    await closeIssue();
  } catch (error) {
    core.setFailed(error.message);

    await createComment(`Failed to create repository ${createRepoName}: ${error.message}`);
  }
}

// Call the function to create the repository
createRepoFromTemplate();
