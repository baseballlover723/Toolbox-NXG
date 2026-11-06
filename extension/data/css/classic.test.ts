/** Keeps the classic theme's generated dark palette in sync with the light palette in base.css. */
import {readFileSync, writeFileSync,} from 'node:fs'
import {join,} from 'node:path'
import {describe, expect, it,} from 'vitest'

// Paths rather than file URLs: happy-dom replaces the global URL, which node:fs then rejects.
const baseCssPath = join(import.meta.dirname, 'base.css',)
const classicCssPath = join(import.meta.dirname, 'classic.css',)
const beginMarker = '/* BEGIN generated classic dark palette */'
const endMarker = '/* END generated classic dark palette */'

/** One color token parsed from a stylesheet. */
interface ColorToken {
	name: string
	rgb: [number, number, number,]
	/** Alpha exactly as written (e.g. ` / 40%`), or an empty string when opaque. */
	alpha: string
}

/**
 * Extracts the body of the first rule block whose selector starts with `selectorStart`.
 * @param css The stylesheet text.
 * @param selectorStart Text the block's selector list begins with.
 * @returns The text between the block's braces.
 */
function blockBody (css: string, selectorStart: string,): string {
	const start = css.indexOf(selectorStart,)
	if (start === -1) { throw new Error(`No block starting with ${selectorStart}`,) }
	const open = css.indexOf('{', start,)
	const close = css.indexOf('\n}', open,)
	return css.slice(open + 1, close,)
}

/**
 * Parses every `--toolbox-*: rgb(...)` declaration in a block body.
 * @param body Declarations to scan.
 * @returns The color tokens in declaration order.
 */
function parseColorTokens (body: string,): ColorToken[] {
	const tokens: ColorToken[] = []
	for (const match of body.matchAll(/^\s*--(toolbox-[a-z0-9-]+):\s*rgb\((\d+) (\d+) (\d+)( \/ [\d.]+%?)?\);/gm,)) {
		const [, name, r, g, b, alpha,] = match
		if (name === undefined || r === undefined || g === undefined || b === undefined) { continue }
		tokens.push({name, rgb: [Number(r,), Number(g,), Number(b,),], alpha: alpha ?? '',},)
	}
	return tokens
}

/** hue-rotate(180deg) matrix from the Filter Effects spec (feColorMatrix type="hueRotate", cos = -1, sin = 0). */
const hueRotate180 = [
	[-0.574, 1.43, 0.144,],
	[0.426, 0.43, 0.144,],
	[0.426, 1.43, -0.856,],
] as const

/**
 * Applies 6.x's dark-mode filter, `invert(90%) hue-rotate(180deg)`, to one sRGB color.
 * @param rgb Channels 0-255.
 * @returns The filtered channels, clamped and rounded to 0-255.
 */
function classicDarken (rgb: readonly [number, number, number,],): [number, number, number,] {
	// invert(p) maps each channel c (0..1) to p + c * (1 - 2p); for p = 0.9 that is 0.9 - 0.8c
	const inverted = rgb.map((channel,) => 0.9 - 0.8 * (channel / 255)) as [number, number, number,]
	const rotate = (row: readonly [number, number, number,],) => {
		const value = row[0] * inverted[0] + row[1] * inverted[1] + row[2] * inverted[2]
		return Math.round(Math.min(1, Math.max(0, value,),) * 255,)
	}
	return [rotate(hueRotate180[0],), rotate(hueRotate180[1],), rotate(hueRotate180[2],),]
}

/**
 * Renders the generated dark palette declarations for the light tokens.
 * @param lightTokens Color tokens from the light :root block.
 * @returns The declaration lines, tab-indented, one per token.
 */
function renderDarkPalette (lightTokens: readonly ColorToken[],): string {
	return lightTokens
		.map(({name, rgb, alpha,},) => {
			const [r, g, b,] = classicDarken(rgb,)
			return `\t--${name}: rgb(${r} ${g} ${b}${alpha});`
		},)
		.join('\n',)
}

describe('classic theme dark palette', () => {
	const baseCss = readFileSync(baseCssPath, 'utf8',)
	const lightTokens = parseColorTokens(blockBody(baseCss, ':root {',),)
	const defaultDarkTokens = parseColorTokens(blockBody(baseCss, '.res-nightmode .toolbox-scope,',),)

	it('transforms colors the way the 6.x filter does', () => {
		// invert(90%) takes white to 10% grey and black to 90% grey; ranges rather than exact values
		// because 25.5 / 229.5 sit on a rounding boundary that floating point lands either side of
		for (const channel of classicDarken([255, 255, 255,],)) {
			expect(channel,).toBeGreaterThanOrEqual(25,)
			expect(channel,).toBeLessThanOrEqual(26,)
		}
		for (const channel of classicDarken([0, 0, 0,],)) {
			expect(channel,).toBeGreaterThanOrEqual(229,)
			expect(channel,).toBeLessThanOrEqual(230,)
		}
		// a 180deg hue rotation leaves greys neutral and returns hues to roughly where they started:
		// the light header blue must come back blue (blue channel highest), not orange
		const [r, g, b,] = classicDarken([128, 128, 128,],)
		expect(r,).toBe(g,)
		expect(g,).toBe(b,)
		const header = classicDarken([206, 227, 248,],)
		expect(header[2],).toBeGreaterThan(header[0],)
	})

	it('covers every color the default dark palette sets, so none of its values leak through', () => {
		const lightNames = new Set(lightTokens.map((token,) => token.name),)
		const missing = defaultDarkTokens.map((token,) => token.name).filter((name,) => !lightNames.has(name,))
		expect(missing,).toEqual([],)
	})

	it('is up to date with the light palette in base.css', () => {
		const classicCss = readFileSync(classicCssPath, 'utf8',)
		const begin = classicCss.indexOf(beginMarker,)
		const end = classicCss.indexOf(endMarker,)
		expect(begin, 'classic.css is missing its generated-region markers',).toBeGreaterThan(-1,)
		expect(end,).toBeGreaterThan(begin,)

		const lineStart = classicCss.lastIndexOf('\n', end,) + 1
		const current = classicCss.slice(begin + beginMarker.length, lineStart,).trim()
		const expected = renderDarkPalette(lightTokens,)

		if (process.env['UPDATE_CLASSIC_DARK']) {
			const updated = `${classicCss.slice(0, begin + beginMarker.length,)}\n${expected}\n${
				classicCss.slice(lineStart,)
			}`
			writeFileSync(classicCssPath, updated,)
			return
		}
		expect(
			current,
			'Regenerate with: UPDATE_CLASSIC_DARK=1 npx vitest run extension/data/css/classic.test.ts',
		).toBe(expected.trim(),)
	})
})
