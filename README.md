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

### Version Management

```bash
# Show current version
grm version --detect

# Update version in project file
grm version --detect --update

# Increment version
grm version --major    # or -m
grm version --minor    # or -i
grm version --patch    # or -p

# Create release with specific channel
grm version --channel beta

# Create version with tag
grm version --major --tag

# Push changes and tags
grm version --major --tag --push
```

### Changelog Generation

```bash
# Generate changelog for specific range
grm changelog --from v1.0.0 --to v2.0.0

# Generate for single point
grm changelog --point v1.0.0

# Custom output
grm changelog --output CHANGELOG.md

# With custom template
grm changelog --template path/to/template.ejs
```

### Branch Management

```bash
# Create feature branch
grm branch --feature my-feature

# Create release branch
grm branch --release 2.1.0

# Create hotfix branch
grm branch --hotfix 2.0.1

# List branches
grm branch --list

# Merge branches
grm branch --merge feature/my-feature
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