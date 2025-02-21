# Git Release Manager (GRM)

A powerful CLI tool to generate release notes from git commit history and manage version releases effectively.

![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-2.0.0-orange)

## Features

- 📝 Conventional commit-based changelog generation
- 🏷️ Advanced version management with multiple channels (alpha, beta, preview, stable)
- 🌿 Git branch management with flow support
- 🔄 Project version synchronization across different file types
- 🚀 Automated release process
- ⚙️ Highly configurable with custom templates

## Installation

```bash
npm install -g git-release-manager
```

## Usage

### Global Options

GRM supports global configuration options that can be applied to many commands:

- `--config [path]`: Specify a custom configuration file.
- `--environment [env]`: Set a specific environment to be used during the operations.

### Version Management

```bash
# Detect current version
grm version --detect

# Update version in project
grm version --update

# Initialize the versioning
grm version --init 1.0.0

# Increment version
grm version -m   # major
grm version -i   # minor
grm version -p   # patch

# Manage channels and tags
grm version --channel beta --tag
grm version --build build-meta
grm version --compare 1.2.0
grm version --validate 2.0.0
grm version --sync
grm version --list --latest
grm version --revert 1.0.0
```

### Changelog Generation

```bash
# Generate a changelog between specific points
grm changelog --from v1.0.0 --to v2.0.0

# Generate a changelog for a specific reference
grm changelog --point v1.0.0

# Use custom output and templates
grm changelog --output CHANGELOG.md --template path/to/custom-template.ejs
```

### Branch Management

```bash
# Create branches
grm branch --feature my-feature
grm branch --release 2.1.0 
grm branch --hotfix 2.0.1

# Manage branches
grm branch --list
grm branch --delete my-feature
grm branch --switch develop
grm branch --merge feature/my-feature
grm branch --finish release/2.1.0
grm branch --protect develop
grm branch --unprotect develop

# Branch operations with remote
grm branch --rebase main
grm branch --sync
grm branch --push
```

## Supported Project Types

- Node.js (package.json)
- .NET (.csproj)
- Python (pyproject.toml)
- Java (build.gradle)
- Go (go.mod)

## Configuration

GRM is highly configurable through `config.json`. Key configuration areas include:

### Release Channels

- **dev**: Development channel for testing
- **alpha**: Early testing phase
- **beta**: Beta testing phase
- **preview**: Release candidate phase
- **stable**: Production release channel

### Commit Types

- ✨ Features (`feat`)
- 🐞 Bug Fixes (`fix`)
- 📚 Documentation (`docs`)
- 🎨 Styling (`style`)
- ♻️ Refactoring (`refactor`)
- 🚀 Performance (`perf`)
- 🧪 Testing (`test`)
- 🔄 CI/CD (`ci`)
- 🔧 Chores (`chore`)

### Note Types

- ⚠️ Breaking Changes
- 📉 Deprecations
- 🆕 New Features
- 🔄 Changes
- 🌟 Highlights
- 🔬 Experimental Features
- 🐛 Known Issues

## Custom Templates

You can customize the changelog output by providing your own EJS templates:

```bash
grm changelog --template path/to/custom-template.ejs
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Ahmet Soner

## Repository

[GitHub Repository](https://github.com/ahmettsoner/git-release-manager.git)
