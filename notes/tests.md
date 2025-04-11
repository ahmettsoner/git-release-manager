# Test Cases for Git Release Manager

## Version Command Tests


```bash
git checkout --orphan new-main
git add .
git commit -m "Initial commit"
git branch -D main
git branch -m main
git branch | grep -v "main" | xargs git branch -D
git tag -d $(git tag)
git reflog expire --all --expire=now
git gc --prune=now
git gc --aggressive --prune=now
git branch -b dev

```

### Detect & Update Tests
```bash
# Test Case 1: Detect current version
grm version --detect
Expected: Shows current version from package.json

# Test Case 2: Detect version from specific file
grm version --detect ./package.json
Expected: Shows version from specified file

# Test Case 3: Update version in current directory
grm version --detect --update 3.0.0
Expected: Updates version to 3.0.0 in detected project file

# Test Case 4: Update specific file version
grm version --detect ./package.json --update 3.0.0
Expected: Updates version to 3.0.0 in specified file
```

### Version Increment Tests
```bash
# Test Case 5: Major version increment
grm version -m
Expected: Increments major version (e.g., 2.0.0 -> 3.0.0)

# Test Case 6: Minor version increment
grm version -i
Expected: Increments minor version (e.g., 2.0.0 -> 2.1.0)

# Test Case 7: Patch version increment
grm version -p
Expected: Increments patch version (e.g., 2.0.0 -> 2.0.1)
```

### Channel & Prerelease Tests
```bash
# Test Case 8: Create beta channel version
grm version -c beta
Expected: Creates version with beta channel (e.g., 2.0.0-beta.1)

# Test Case 9: Create version without channel number
grm version -c beta --no-channel-number
Expected: Creates version without number (e.g., 2.0.0-beta)

# Test Case 10: Custom prerelease identifier
grm version --prerelease rc2
Expected: Creates version with custom prerelease (e.g., 2.0.0-rc2)
```

### Git Integration Tests
```bash
# Test Case 11: Create version with tag
grm version -p --tag
Expected: Increments patch and creates git tag

# Test Case 12: Push version changes
grm version -p --tag --push
Expected: Increments patch, creates tag, and pushes to remote

# Test Case 13: Create draft release
grm version -p --draft
Expected: Creates draft release on Git platform
```

## Changelog Command Tests

### Basic Range Tests
```bash
# Test Case 14: Generate from specific range
grm changelog --from v1.0.0 --to v2.0.0
Expected: Generates changelog between versions

# Test Case 15: Generate for single point
grm changelog --point v2.0.0
Expected: Generates changelog for specific version

# Test Case 16: Generate with custom range
grm changelog --range "last week"
Expected: Generates changelog for last week
```

### Output Format Tests
```bash
# Test Case 17: Custom output file
grm changelog --from v1.0.0 --to v2.0.0 --output custom-changelog.md
Expected: Saves changelog to specified file

# Test Case 18: Custom template
grm changelog --from v1.0.0 --to v2.0.0 --template ./custom-template.ejs
Expected: Generates changelog using custom template

# Test Case 19: Merge all changes
grm changelog --from v1.0.0 --to v2.0.0 --mergeAll
Expected: Combines all changes into single output
```

## Branch Command Tests

### Basic Branch Operations
```bash
# Test Case 20: Create new branch
grm branch -c feature-test
Expected: Creates new branch 'feature-test'

# Test Case 21: List branches
grm branch -l
Expected: Shows list of all branches

# Test Case 22: Switch branch
grm branch -s feature-test
Expected: Switches to 'feature-test' branch
```

### Git Flow Branch Tests
```bash
# Test Case 23: Create feature branch
grm branch --feature new-feature
Expected: Creates 'feature/new-feature' branch

# Test Case 24: Create release branch
grm branch --release 2.1.0
Expected: Creates 'release/v2.1.0' branch

# Test Case 25: Create hotfix branch
grm branch --hotfix 2.0.1
Expected: Creates 'hotfix/v2.0.1' branch
```

### Branch Protection Tests
```bash
# Test Case 26: Protect branch
grm branch --protect main
Expected: Adds protection to main branch

# Test Case 27: Remove protection
grm branch --unprotect main
Expected: Removes protection from main branch
```

### Branch Integration Tests
```bash
# Test Case 28: Merge branch
grm branch -m feature-test
Expected: Merges 'feature-test' into current branch

# Test Case 29: Rebase branch
grm branch --rebase main
Expected: Rebases current branch with main

# Test Case 30: Sync and push
grm branch --sync --push
Expected: Syncs current branch with remote and pushes changes
```

## Error Handling Tests
```bash
# Test Case 31: Invalid version format
grm version --validate invalid-version
Expected: Shows error for invalid version format

# Test Case 32: Non-existent branch
grm branch -s non-existent
Expected: Shows error for non-existent branch

# Test Case 33: Invalid date range
grm changelog --from "invalid date"
Expected: Shows error for invalid date format
```

## Helper Functions Tests
```bash
# Test Case 34: Show help
grm --help
Expected: Shows general help information

# Test Case 35: Show version help
grm version --help
Expected: Shows version command help

# Test Case 36: Show changelog help
grm changelog --help
Expected: Shows changelog command help
```



## Complex Version Management Tests

### Multi-Step Version Updates
```bash
# Test Case 37: Multiple increments in one command
grm version -m -i -p
Expected: Combines multiple increments correctly (e.g., 2.0.0 -> 3.1.1)

# Test Case 38: Channel with version increment
grm version -p -c beta --tag
Expected: Creates versioned beta release with tag (e.g., 2.0.1-beta.1)

# Test Case 39: Version with build metadata
grm version -p --build "20240215" --tag
Expected: Creates version with build metadata (e.g., 2.0.1+20240215)
```

### Version Synchronization Tests
```bash
# Test Case 40: Sync across multiple files
# Create test environment with multiple project files
grm version --detect ./package.json --update 3.0.0
grm version --detect ./src/version.py --update 3.0.0
Expected: Updates version in all project files

# Test Case 41: Version rollback
grm version --revert 2.0.0 --sync
Expected: Reverts to previous version and syncs all files

# Test Case 42: Version initialization
grm version --init 1.0.0 --tag
Expected: Initializes version control system with first version
```

## Advanced Changelog Generation

### Complex Date Ranges
```bash
# Test Case 43: Multiple date formats
grm changelog --from "2024-01-01" --to "last week"
Expected: Handles mixed date format specifications

# Test Case 44: Relative date ranges
grm changelog --range "last month to yesterday"
Expected: Processes relative date ranges correctly

# Test Case 45: Multiple points changelog
grm changelog --point v1.0.0 --point v2.0.0 --mergeAll
Expected: Generates combined changelog for specific versions
```

### Filtering and Grouping
```bash
# Test Case 46: Filter by commit type
grm changelog --from v1.0.0 --to v2.0.0 --type feat,fix
Expected: Shows only feature and fix commits

# Test Case 47: Group by custom categories
grm changelog --from v1.0.0 --group-by author
Expected: Groups changes by commit authors

# Test Case 48: Exclude certain types
grm changelog --from v1.0.0 --exclude chore,test
Expected: Excludes specified commit types
```

## Git Branch Strategy Tests

### Complex Branch Operations
```bash
# Test Case 49: Feature branch with version
grm branch --feature auth --version 2.1.0
Expected: Creates feature branch with version tracking

# Test Case 50: Hotfix from multiple branches
grm branch --hotfix 2.0.1 --from main --to develop
Expected: Creates and applies hotfix to multiple branches

# Test Case 51: Release branch with changelog
grm branch --release 2.1.0 --changelog
Expected: Creates release branch with auto-generated changelog
```

### Branch Policy Tests
```bash
# Test Case 52: Branch naming policy
grm branch -c invalid/name
Expected: Enforces branch naming conventions

# Test Case 53: Protected branch operations
grm branch --merge feature/test --to main --force
Expected: Handles protected branch policies

# Test Case 54: Branch cleanup
grm branch --cleanup --older-than "2 weeks"
Expected: Removes old branches based on age
```

## Integration Tests

### Git Provider Integration
```bash
# Test Case 55: GitHub PR creation
grm branch --feature test --create-pr
Expected: Creates GitHub pull request automatically

# Test Case 56: GitLab MR creation
grm branch --feature test --create-mr
Expected: Creates GitLab merge request automatically

# Test Case 57: Release creation with assets
grm version -p --tag --release --assets "./dist/*"
Expected: Creates release with attached assets
```

### CI/CD Integration
```bash
# Test Case 58: CI environment detection
CI=true grm version --detect
Expected: Adapts behavior for CI environment

# Test Case 59: Automated release process
grm version --ci-release
Expected: Executes full release workflow

# Test Case 60: Version bump in CI
grm version --bump ci
Expected: Handles CI-specific version increments
```

## Configuration Tests

### Config File Handling
```bash
# Test Case 61: Custom config location
grm --config ./custom-config.json changelog
Expected: Uses custom configuration file

# Test Case 62: Environment-specific config
grm --environment production version -p
Expected: Applies environment-specific settings

# Test Case 63: Config validation
grm --validate-config
Expected: Validates configuration file format
```

### Template Customization
```bash
# Test Case 64: Custom changelog format
grm changelog --template ./custom.hbs --from v1.0.0
Expected: Uses custom Handlebars template

# Test Case 65: Multiple template support
grm changelog --template-dir ./templates --from v1.0.0
Expected: Handles multiple template files

# Test Case 66: Dynamic template selection
grm changelog --template-format markdown --from v1.0.0
Expected: Selects template based on output format
```

## Error Recovery Tests

### Conflict Resolution
```bash
# Test Case 67: Version conflict resolution
grm version -p --resolve-conflicts
Expected: Handles version conflicts automatically

# Test Case 68: Branch merge conflicts
grm branch --merge feature/test --resolve-strategy theirs
Expected: Resolves merge conflicts using specified strategy

# Test Case 69: Concurrent update handling
grm version --update 2.0.0 --lock
Expected: Handles concurrent version updates
```

### Recovery Operations
```bash
# Test Case 70: Failed operation recovery
grm --recover-last-operation
Expected: Recovers from failed operation state

# Test Case 71: Backup and restore
grm --backup --before version -p
Expected: Creates backup before version change

# Test Case 72: Emergency rollback
grm --rollback --to-last-stable
Expected: Rolls back to last stable state
```

## Performance Tests

### Large Repository Handling
```bash
# Test Case 73: Large changelog generation
grm changelog --from v1.0.0 --parallel
Expected: Handles large repositories efficiently

# Test Case 74: Bulk version updates
grm version --bulk-update "./projects/**/package.json"
Expected: Efficiently updates multiple projects

# Test Case 75: Cache management
grm changelog --from v1.0.0 --cache
Expected: Uses cache for better performance
```



Her test senaryosu için:
1. Test öncesi ortamı hazırlayın
2. Komutu çalıştırın
3. Beklenen sonucu kontrol edin
4. Test sonrası temizlik yapın


Bu test senaryoları, komutların:



Her test için detaylı sonuç kaydı:
```markdown
## Extended Test Results
- Test Case ID: 
- Test Category:
- Prerequisites:
- Command:
- Expected Result:
- Actual Result:
- Performance Metrics (if applicable):
- Status: ✅ Pass / ❌ Fail / ⚠️ Partial
- Issues Found:
- Follow-up Actions:
```

Bu test senaryoları:
1. Temel işlevselliğini
2. Hata durumlarını
3. Entegrasyon senaryolarını
4. Kenar durumlarını
5. Daha karmaşık kullanım senaryolarını
6. Sistem entegrasyonlarını
7. Performans kriterlerini
8. Hata kurtarma mekanizmalarını
9. Configurasyon yönetimini
kapsamaktadır.

Bu testleri otomatize etmek için bir test suite'i de oluşturulabilir.