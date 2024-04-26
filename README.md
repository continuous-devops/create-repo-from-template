# Create Repository from a Repository Template `node.js` GitHub Action

This GitHub Action automates the creation of new repositories from a template in a GitHub organization.

## Features

- Creates a new repository from a specified template repository.
- Allows the use of a Personal Access Token for authentication.
- Supports debugging mode for detailed logging.

## Inputs

This action requires the following inputs:

- `organization`: The name of the GitHub organization. This input is required.
- `repo_name`: The name of the new repository to be created. This input is required.
- `repo_template`: The name of the template repository to use. This input is required.
- `pat`: A Personal Access Token for authentication. This input is optional.
- `api_url`: The URL of the GitHub API. This input is optional and defaults to "https://api.github.com".
- `is_debug`: Whether to enable debug mode. This input is optional and defaults to "true".

## Usage

To use this action, include it in your workflow file with the required inputs:
Here is an example:

  ```yaml
  steps:
  - uses: actions/checkout@v2
  - uses: your-github-username/create-repo-from-template@v1
    with:
      organization: 'your-org'
      repo_name: 'new-repo-name'
      repo_template: 'template-repo-name'
      pat: ${{ secrets.GITHUB_TOKEN }}
  ```

In this example, replace `'your-org'`, `'new-repo-name'`, and `'template-repo-name'` with the names of the new repository and the template repository, respectively. Replace your-github-username with your actual GitHub username and create-repo-from-template with the actual name of your action.

## Local Development

For local development, you can use nodemon to automatically restart the application whenever file changes are detected. You can start the application with npm start.

## Testing

Tests are written using Jest. You can run the tests with npm test.

## Building

This project uses [ncc](https://github.com/vercel/ncc) to compile the Node.js source code into a single file that can be run as a GitHub Action.

Before building, make sure to install the project dependencies:

```bash
npm install
```

Then, you can build the project with the following command:

```bash
npm run build
```

This will create a `dist/index.js` file, which is the compiled version of the action. This file should be committed to the repository, as it is what GitHub will use to run the action.

Please note that any changes to the source code will require a new build.

## Publishing

This section assumes that you have a build script in your package.json file that runs ncc build index.js -o dist. If your build command is different, please adjust the instructions accordingly.

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details.
