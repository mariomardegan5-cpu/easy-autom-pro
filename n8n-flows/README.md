# n8n Workflow Files

This directory contains n8n workflow JSON files that can be imported into your n8n instance.

## How to Import n8n Workflows

### Method 1: Using the n8n UI (Recommended)

1. **Log into your n8n instance** at `http://localhost:5678` (or your n8n server URL)

2. **Click on the Workflows menu** in the left sidebar

3. **Click the "+ New Workflow"** button to create a new workflow

4. **Click on the three dots menu (•••)** in the top right corner of the workflow editor

5. **Select "Import from file"** option

6. **Choose the JSON file** you want to import from this directory

7. **Review the workflow** and click **"Save"** to import it into your n8n instance

### Method 2: Using Copy/Paste

1. **Open the desired JSON file** in a text editor

2. **Copy all the contents** of the JSON file

3. **Log into your n8n instance**

4. **Create a new workflow** or open an existing one

5. **Click the three dots menu (•••)** and select **"Import from clipboard"**

6. **Paste the JSON contents** and click **"Import"**

### Method 3: Using the n8n CLI

If you have n8n installed locally with CLI access:

```bash
# Import a workflow from a JSON file
n8n import:workflow --input=path/to/workflow.json
```

For more CLI options:
```bash
n8n import:workflow --help
```

## Workflow Files

Below is a list of available workflows in this directory:

| Workflow Name | Description |
|---|---|
| | |

*(Add your workflow files and descriptions here)*

## Prerequisites

- **n8n instance running** (self-hosted or cloud)
- **Active internet connection**
- **Appropriate permissions** to import workflows
- **Required credentials/credentials** configured in n8n (if the workflows use external services)

## Setting Up Credentials

Many workflows require external service credentials. To set up credentials:

1. **Go to Settings** (gear icon in the left sidebar)
2. **Click on "Credentials"**
3. **Click "+ New"** to create a new credential
4. **Select the type** of credential needed (API key, OAuth, Database connection, etc.)
5. **Enter your credentials** according to the service documentation
6. **Click "Save"** to store the credentials

When you import a workflow, you may need to reconnect nodes to these credentials if they were set up in a different environment.

## Testing Your Imported Workflows

After importing:

1. **Review the workflow structure** to ensure all nodes are properly connected
2. **Check that all required credentials** are configured
3. **Test with sample data** by clicking the **"Execute Workflow"** button
4. **Check the execution logs** for any errors
5. **Make any necessary adjustments** before activating the workflow

## Troubleshooting

### Workflow Won't Import
- Ensure the JSON file is valid and properly formatted
- Check that you have the required n8n version (some workflows may require specific versions)
- Look for any error messages in the browser console

### Missing Credentials
- Workflows won't execute if required credentials aren't configured
- Add the necessary credentials in the n8n settings
- Re-import the workflow and reconnect the credential fields

### Node Errors After Import
- Check that all external services are accessible
- Verify API keys and credentials are correct
- Review the workflow execution logs for specific error messages

## Documentation

For more information about n8n workflows and imports, visit:
- [n8n Official Documentation](https://docs.n8n.io/)
- [n8n Community Forum](https://community.n8n.io/)
- [n8n GitHub Repository](https://github.com/n8n-io/n8n)

## Contributing

To add new workflows to this directory:

1. Export your workflow as JSON from n8n
2. Add the file to this directory
3. Update the workflows table in this README with a description
4. Create a pull request with your changes

---

**Last Updated:** 2025-12-10
