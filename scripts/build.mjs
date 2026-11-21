#!/usr/bin/env node
// Interactive EAS build for eSkrb: pick platform, profile and where to build,
// then optionally submit an iOS production build to TestFlight.
// Usage: pnpm build            (interactive)
//        pnpm build --dry-run  (print the commands, run nothing)

import { cancel, confirm, intro, isCancel, log, note, outro, select } from '@clack/prompts';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const appConfig = readJson('app.json');
const buildProfiles = Object.keys(readJson('eas.json').build);
const DRY_RUN = process.argv.includes('--dry-run');

// Use a global `eas` if there is one, otherwise run eas-cli through pnpm.
const EAS = spawnSync('eas', ['--version'], { stdio: 'ignore', shell: true }).status === 0 ? 'eas' : 'pnpm dlx eas-cli';

function ensure(value) {
  if (isCancel(value)) {
    cancel('Build cancelled.');
    process.exit(0);
  }
  return value;
}

function run(command) {
  if (DRY_RUN) {
    log.info(`[dry run] ${command}`);
    return Promise.resolve();
  }
  const child = spawn(command, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    // CocoaPods (run by `eas build --local`) crashes on a non-UTF-8 locale with Homebrew Ruby.
    env: { ...process.env, DISABLE_V8_COMPILE_CACHE: '1', LANG: process.env.LANG || 'en_US.UTF-8', LC_ALL: process.env.LC_ALL || 'en_US.UTF-8' },
  });
  return new Promise((resolve, reject) => {
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code}`))));
    child.on('error', reject);
  });
}

function outputName({ platform, profile }) {
  let extension = platform === 'ios' ? 'ipa' : 'apk';
  if (platform === 'ios' && profile === 'ios-simulator') extension = 'tar.gz';
  if (platform === 'android' && profile === 'production') extension = 'aab';
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  return `${appConfig.expo.slug}-${profile}-${appConfig.expo.version}-${stamp}.${extension}`;
}

async function main() {
  intro(`EAS build: ${appConfig.expo.name} ${appConfig.expo.version}${DRY_RUN ? ' (dry run)' : ''}`);

  const platform = ensure(
    await select({
      message: 'Platform',
      options: [
        { value: 'ios', label: 'iOS' },
        { value: 'android', label: 'Android' },
      ],
      initialValue: 'ios',
    })
  );

  const profiles = buildProfiles.filter((p) => platform === 'ios' || p !== 'ios-simulator');
  const profile = ensure(
    await select({
      message: 'Build profile',
      options: profiles.map((p) => ({
        value: p,
        label: p,
        hint: { development: 'dev client, device', 'ios-simulator': 'dev client, simulator', preview: 'internal testers', production: 'TestFlight / store' }[p],
      })),
      initialValue: platform === 'ios' ? 'production' : 'preview',
    })
  );

  const service = ensure(
    await select({
      message: 'Build where',
      options: [
        { value: 'local', label: 'Local', hint: 'this Mac, output in builds/' },
        { value: 'eas', label: 'EAS cloud' },
      ],
      initialValue: 'local',
    })
  );

  if (platform === 'ios' && profile === 'production' && !appConfig.expo.ios?.bundleIdentifier) {
    log.warn('app.json has no ios.bundleIdentifier yet. EAS will ask for one; set it in app.json first to keep it stable.');
  }

  const canSubmit = platform === 'ios' && profile === 'production';
  const submit = canSubmit
    ? ensure(await confirm({ message: 'Submit to TestFlight after the build?', initialValue: true }))
    : false;

  const file = outputName({ platform, profile });
  const buildPath = path.join('builds', file);

  const buildCommand = [
    `${EAS} build`,
    `--platform ${platform}`,
    `--profile ${profile}`,
    service === 'local' ? '--local' : null,
    service === 'local' ? `--output ${buildPath}` : null,
    service === 'eas' && submit ? '--auto-submit' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const submitCommand =
    submit && service === 'local' ? `${EAS} submit --platform ios --profile production --path ${buildPath}` : null;

  note([buildCommand, submitCommand].filter(Boolean).join('\n'), 'Commands');

  const go = ensure(await confirm({ message: 'Run it?', initialValue: true }));
  if (!go) {
    cancel('Build cancelled.');
    return;
  }

  if (service === 'local' && !DRY_RUN) fs.mkdirSync(path.join(root, 'builds'), { recursive: true });

  await run(buildCommand);
  if (submitCommand) {
    log.step('Submitting to App Store Connect (TestFlight)...');
    await run(submitCommand);
  }

  if (service === 'local' && !DRY_RUN) log.info(`Build: ${buildPath}`);
  if (submit) log.info('After processing (10 to 30 minutes), add the build to the external TestFlight group in App Store Connect.');
  outro('Done');
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
