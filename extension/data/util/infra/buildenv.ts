/** Build-time variables defined via `@rollup/plugin-replace` in rollup.config.js. */

/** Indicates whether this is a stable, beta prerelease, or dev build. */
// @ts-expect-error injected at build time by @rollup/plugin-replace
export const buildType = BUILD_TYPE as 'stable' | 'beta' | 'dev'

/**
 * The commit hash this release was built from, if this is a stable or
 * prerelease build; typically `null` in dev builds.
 */
// @ts-expect-error injected at build time by @rollup/plugin-replace
export const buildSha = BUILD_SHA as string | null

/**
 * Git commit count at build time; used as the build number for dev builds
 * since the manifest version's 4th component is always 0 in dev.
 */
// @ts-expect-error BUILD_COUNT defined by @rollup/plugin-replace
export const buildCount = BUILD_COUNT as number

/**
 * `true` in the Firefox bundle. Guard Firefox-exclusive code (containers, `content.fetch`)
 * on this so Rollup drops it from the Chrome bundle entirely instead of shipping it dormant.
 * For that to work the guard must be an `if` outside any `try` block: Rollup keeps everything
 * referenced inside a `try`.
 */
// @ts-expect-error BUILD_PLATFORM defined by @rollup/plugin-replace
export const isFirefoxBuild: boolean = BUILD_PLATFORM === 'firefox'
