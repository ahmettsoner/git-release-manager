# Git Release Notes Generator

A tool to generate release notes from git commit history.

## Features

- Parse git commit history
- Generate structured release notes
- Customizable commit types and formats
- Support for mentions and links
- Flexible output formats

## Installation

```bash
npm i -g git-release-manager
```

## Usage

```bash
node src/main.js [options]

Options:
  --from <tag>        Starting tag
  --to <tag>         Ending tag
  --tag <tag>        Single tag
  --output <path>    Output file path
  --config-file <path> Custom config file path
```

## Configuration

Create a custom config file to override default settings:

```javascript
module.exports = {
  commitTypes: [
    { type: "feat", terms: ["feat", "feature"], title: "Features" }
  ],
  linkTypes: [
    { type: "issue", terms: ["fixes", "resolves"], title: "Issues" }
  ],
  mentionTypes: [
    { type: "reviewer", terms: ["reviewed-by"], title: "Reviewers" }
  ]
};
```