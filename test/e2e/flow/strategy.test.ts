import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createEmptyTestWorkspace } from '../projectSetup'

describe('E2E: Flow Strategy', () => {
    const E2E_DIR = join(__dirname, '../../../../temp/test/e2e/flow/strategy')
    const PROJECT_DIR = join(E2E_DIR, `full-sample`)
    let git: SimpleGit

    const setupTest = async (project_dir: string) => {
        await createEmptyTestWorkspace(project_dir, {
            withGit: true,
            withNpm: true,
            withGitHub: true,
        })
        git = simpleGit(project_dir)
        await git.checkoutLocalBranch('main')
    }

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Full sample', async () => {
        await setupTest(PROJECT_DIR)


        execSync('git checkout -b dev', cmdOptions).trim()


        // Iteration 1
        developFeature("add-new-api", "v1.0.0-dev.1")
        developFeature("add-new-api2")
        developFeature("add-new-api22", "v1.0.0-dev.2")


        //iteration 2 
        shiftDevelopmentToQAPhase("alpha", "v1.0.0", "v1.0.0-alpha.1")

        developFeature("add-new-api4", "v1.1.0-dev.1")
        fixBugQAPhase("api-doc-1", "v1.0.0", "alpha", "v1.0.0-alpha.2")


        //iteration 3 
        shiftQAToStagePhase("alpha", "beta", "v1.0.0", "v1.0.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.1.0", "v1.1.0-alpha.1")

        developFeature("add-new-api5", "v1.2.0-dev.1")
        fixBugQAPhase("api-doc-2", "v1.1.0", "alpha", "v1.1.0-alpha.2")
        fixBugStagePhase("api-doc-3", "v1.0.0", "beta", "v1.0.0-beta.2")


        //iteration 4
        shiftStageToProdPhase("beta", "v1.0.0")
        shiftQAToStagePhase("alpha", "beta", "v1.1.0", "v1.1.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.2.0", "v1.2.0-alpha.1")

        developFeature("add-new-api6", "v1.3.0-dev.1")
        fixBugQAPhase("api-doc-4", "v1.2.0", "alpha", "v1.2.0-alpha.2")
        fixBugStagePhase("api-doc-5", "v1.1.0", "beta", "v1.1.0-beta.2")
        fixBugStageProd("api-doc-w19", "v1.0.0", "v1.0.1")

        // Iteration 5
        shiftProdToDistPhase("v1.0.1")
        shiftStageToProdPhase("beta", "v1.1.0")
        shiftQAToStagePhase("alpha", "beta", "v1.2.0", "v1.2.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.3.0", "v1.3.0-alpha.1")

        fixBugStageProd("api-doc-w9", "v1.1.0", "v1.1.1")
        developFeature("add-new-api7", "v1.4.0-dev.1")
        fixBugQAPhase("api-doc-6", "v1.3.0", "alpha", "v1.3.0-alpha.2")
        fixBugStagePhase("api-doc-7", "v1.1.0", "beta", "v1.2.0-beta.2")

        // Iteration 6
        shiftProdToDistPhase("v1.1.1")
        shiftStageToProdPhase("beta", "v1.2.0")
        shiftQAToStagePhase("alpha", "beta", "v1.3.0", "v1.3.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.4.0", "v1.4.0-alpha.1")

        developFeature("add-new-api8", "v1.5.0-dev.1")
        fixBugQAPhase("api-doc-8", "v1.4.0", "alpha", "v1.4.0-alpha.2")
        fixBugStageProd("api-doc-9", "v1.2.0", "v1.2.1")
        fixBugStagePhase("api-doc-10", "v1.3.0", "beta", "v1.3.0-beta.2")
        fixBugPostProd("api-doc-9", "v1.1.2")
        fixBugPostProd("api-doc-110", "v1.1.3")

        // Iteration 7
        shiftProdToDistPhase("v1.2.1")
        shiftStageToProdPhase("beta", "v1.3.0")
        shiftQAToStagePhase("alpha", "beta", "v1.4.0", "v1.4.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.5.0", "v1.5.0-alpha.1")

        developFeature("add-new-api81", "v1.6.0-dev.1")
        fixBugQAPhase("api-doc-81", "v1.5.0", "alpha", "v1.5.0-alpha.2")
        fixBugStagePhase("api-doc-101", "v1.4.0", "beta", "v1.4.0-beta.2")

        // Iteration 8
        shiftProdToDistPhase("v1.3.0")
        shiftStageToProdPhase("beta", "v1.4.0")
        shiftQAToStagePhase("alpha", "beta", "v1.5.0", "v1.5.0-beta.1")
        shiftDevelopmentToQAPhase("alpha", "v1.6.0", "v1.6.0-alpha.1")

        developFeature("add-new-api9121", "v1.7.0-dev.1")
        fixBugQAPhase("api-doc-88", "v1.6.0", "alpha", "v1.6.0-alpha.2")
        fixBugStageProd("api-doc-98", "v1.4.0", "v1.4.1")
        fixBugStagePhase("api-doc-108", "v1.5.0", "beta", "v1.5.0-beta.2")
        fixBugPostProd("api-doc-98", "v1.3.1")
        fixBugPostProd("api-doc-11082", "v1.3.2")
    })

    const cmdOptions:ExecSyncOptionsWithStringEncoding =  {
        cwd: PROJECT_DIR,
        encoding: 'utf8',
    }

    const developFeature = (featureName: string, expectedVersion: string | null = null) => {
        execSync(`git checkout -b feature/${featureName}`, cmdOptions).trim()
        fs.writeFileSync(join(PROJECT_DIR, `${featureName}-readme.md`), `${featureName} implementation`)
        execSync('git add .', cmdOptions).trim()
        execSync(`git commit -m "feat: ${featureName}"`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge feature/${featureName} --no-ff`, cmdOptions).trim()
        execSync(`git branch -d feature/${featureName}`, cmdOptions).trim()

        if(expectedVersion){
            const firstDevReleaseVersionOutput = execSync('grm flow phase dev --next', cmdOptions).trim()
            expect(firstDevReleaseVersionOutput).toEqual(expectedVersion)
            execSync(`git tag -a ${firstDevReleaseVersionOutput} -m "Dev release ${firstDevReleaseVersionOutput}"`, cmdOptions).trim()
        }
    }
    const fixBugQAPhase = (fixname: string, baseVersion: string, channel: string | null = null, expectedVersion: string | null = null) => {
        let channelBaseVersion = baseVersion;
        if(channel){
            channelBaseVersion += `-${channel}`
        }
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git checkout -b hot-fix/${fixname}`, cmdOptions).trim()
        fs.writeFileSync(join(PROJECT_DIR, `readme-${fixname}.md`), `${fixname} added`)
        execSync('git add .', cmdOptions).trim()
        execSync(`git commit -m "doc: ${fixname}"`, cmdOptions).trim()
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git branch -d hot-fix/${fixname}`, cmdOptions).trim()

        if(expectedVersion){
            const newBuildVersion = execSync(`grm flow phase qa ${channel} --next`, cmdOptions).trim()
            expect(newBuildVersion).toEqual(expectedVersion)
            execSync(`git tag -a ${newBuildVersion} -m "${channel} release ${newBuildVersion}"`, cmdOptions).trim()
            execSync('git checkout dev', cmdOptions).trim()
        }
    }
    const fixBugStagePhase = (fixname: string, baseVersion: string, channel: string | null = null, expectedVersion: string | null = null) => {
        let channelBaseVersion = baseVersion;
        if(channel){
            channelBaseVersion += `-${channel}`
        }
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git checkout -b hot-fix/${fixname}`, cmdOptions).trim()
        fs.writeFileSync(join(PROJECT_DIR, `readme-${fixname}.md`), `${fixname} added`)
        execSync('git add .', cmdOptions).trim()
        execSync(`git commit -m "doc: ${fixname}"`, cmdOptions).trim()
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync(`git checkout release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git branch -d hot-fix/${fixname}`, cmdOptions).trim()

        if(expectedVersion){
            const newBuildVersion = execSync(`grm flow phase stage ${channel} --next`, cmdOptions).trim()
            expect(newBuildVersion).toEqual(expectedVersion)
            execSync(`git tag -a ${newBuildVersion} -m "${channel} release ${newBuildVersion}"`, cmdOptions).trim()
            execSync('git checkout dev', cmdOptions).trim()
        }
    }
    const fixBugStageProd = (fixname: string, baseVersion: string, expectedVersion: string | null = null) => {
        let channelBaseVersion = baseVersion;

        const newBuildVersion = execSync(`grm flow phase prod --next-fix`, cmdOptions).trim()
        execSync(`git checkout -b release/${newBuildVersion} release/${channelBaseVersion}`, cmdOptions).trim()
        execSync(`git checkout -b hot-fix/${fixname}`, cmdOptions).trim()
        fs.writeFileSync(join(PROJECT_DIR, `readme-${fixname}.md`), `${fixname} added`)
        execSync('git add .', cmdOptions).trim()
        execSync(`git commit -m "doc: ${fixname}"`, cmdOptions).trim()
        execSync(`git checkout release/${newBuildVersion}`, cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync(`git checkout release/${newBuildVersion}`, cmdOptions).trim()
        execSync(`git branch -d hot-fix/${fixname}`, cmdOptions).trim()

        if(expectedVersion){
            expect(newBuildVersion).toEqual(expectedVersion)
            execSync(`git tag -a ${newBuildVersion} -m "stabil release ${newBuildVersion}"`, cmdOptions).trim()
            execSync('git checkout dev', cmdOptions).trim()
        }
    }
    const fixBugPostProd = (fixname: string, expectedVersion: string | null = null) => {

        let newBuildVersion = execSync(`grm flow phase prod --previous`, cmdOptions).trim()
        execSync(`git checkout main`, cmdOptions).trim()
        execSync(`git checkout -b hot-fix/${fixname}`, cmdOptions).trim()
        fs.writeFileSync(join(PROJECT_DIR, `readme-${fixname}.md`), `${fixname} added`)
        execSync('git add .', cmdOptions).trim()
        execSync(`git commit -m "doc: ${fixname}"`, cmdOptions).trim()
        execSync(`git checkout main`, cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge hot-fix/${fixname} --no-ff`, cmdOptions).trim()
        execSync(`git checkout main`, cmdOptions).trim()
        execSync(`git branch -d hot-fix/${fixname}`, cmdOptions).trim()

        if(expectedVersion){
            newBuildVersion = execSync(`grm flow phase prod --previous-fix`, cmdOptions).trim()
            expect(newBuildVersion).toEqual(expectedVersion)
            execSync(`git tag -a ${newBuildVersion} -m "stabil release ${newBuildVersion}"`, cmdOptions).trim()
            execSync('git checkout dev', cmdOptions).trim()
        }
    }

    const shiftDevelopmentToQAPhase = (channel :string, expectedBaseVersion: string, expectedVersion: string) => {
        const newBaseVersion = execSync(`grm flow phase qa ${channel} --next-release --print=base`, cmdOptions).trim()
        expect(newBaseVersion).toEqual(expectedBaseVersion)
        execSync(`git checkout -b release/${newBaseVersion}-${channel} dev`, cmdOptions).trim()

        const newBuildVersion = execSync(`grm flow phase qa ${channel} --next`, cmdOptions).trim()
        expect(newBuildVersion).toEqual(expectedVersion)
        execSync(`git tag -a ${newBuildVersion} -m "${channel} release ${newBuildVersion}"`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
    }

    const shiftQAToStagePhase = (qaChannel :string, channel: string, expectedBaseVersion: string, expectedVersion: string) => {
        const newBaseVersion = execSync(`grm flow phase stage ${channel} --next-release --print=base`, cmdOptions).trim()
        expect(newBaseVersion).toEqual(expectedBaseVersion)
        execSync(`git checkout -b release/${newBaseVersion}-${channel} release/${newBaseVersion}-${qaChannel}`, cmdOptions).trim()

        const newBuildVersion = execSync(`grm flow phase stage ${channel} --next`, cmdOptions).trim()
        expect(newBuildVersion).toEqual(expectedVersion)
        execSync(`git tag -a ${newBuildVersion} -m "${channel} release ${newBuildVersion}"`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
    }

    const shiftStageToProdPhase = (stageChannel :string, expectedVersion: string) => {
        const newBaseVersion = execSync(`grm flow phase prod --next-release --print=base`, cmdOptions).trim()
        expect(newBaseVersion).toEqual(expectedVersion)
        execSync(`git checkout -b release/${newBaseVersion} release/${newBaseVersion}-${stageChannel}`, cmdOptions).trim()

        const newBuildVersion = execSync(`grm flow phase prod --next`, cmdOptions).trim()
        expect(newBuildVersion).toEqual(expectedVersion)
        execSync(`git tag -a ${newBuildVersion} -m "stabil release ${newBuildVersion}"`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
    }

    const shiftProdToDistPhase = (expectedVersion: string) => {
        const newBuildVersion = execSync(`grm flow phase prod --next`, cmdOptions).trim()
        expect(newBuildVersion).toEqual(expectedVersion)
        execSync('git checkout main', cmdOptions).trim()
        execSync(`git merge release/${newBuildVersion} --no-ff`, cmdOptions).trim()
        execSync('git checkout dev', cmdOptions).trim()
        execSync(`git merge main --no-ff`, cmdOptions).trim()
    }
})
