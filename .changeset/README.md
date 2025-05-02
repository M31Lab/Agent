# Changesets

This directory contains changeset files used for version management and changelog generation. Do not edit these files directly.

## Usage

1. To create a new changeset (when making changes that should be released):

```bash
npm run changeset
```

2. Follow the prompts:

   - Select packages that were modified in this change
   - Choose the type of change (patch, minor, major)
   - Write a description of the changes

3. Commit the generated `.md` file with your PR

## How Changesets Work

When changes are merged to the main branch, the changeset GitHub Action will create a PR that:

1. Updates package versions based on the changesets
2. Updates the changelog with the descriptions from each changeset
3. Removes the changeset files that were consumed

Once the "Version Packages" PR is merged, a new release is automatically published.

## Learn More

- [Changeset Documentation](https://github.com/changesets/changesets)
- [Managing Versioning in Our Project](../CONTRIBUTING.md)
