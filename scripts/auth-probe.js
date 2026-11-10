/**
 * Reddit auth probe: compares cookie, bearer, and cookie+bearer auth against the endpoints Toolbox uses.
 *
 * Not part of the build. Paste into the extension's service worker console (chrome://extensions ->
 * Inspect views: service worker) while logged in as a moderator. Only GETs, plus two harmless POSTs
 * (the read-only flairselector, and unsave of a nonexistent id). Set `sub` below to a subreddit you
 * moderate. The second table printed is the verdict: any BROKEN row is an endpoint Toolbox cannot read.
 */
/* global chrome, console, fetch, FormData */
async function main () {
	const sub = 'toolbox_nxg'
	const out = []

	const probe = async (label, url, init = {},) => {
		try {
			const response = await fetch(url, {
				credentials: 'include',
				cache: 'no-store',
				redirect: 'manual',
				...init,
			},)
			const text = await response.text()
			out.push({
				label,
				// redirect: 'manual' turns a redirect into an opaque response with status 0.
				status: response.type === 'opaqueredirect' ? 'redirect' : response.status,
				ratelimit: response.headers.get('x-ratelimit-remaining',),
				body: text.slice(0, 120,),
			},)
			return text
		} catch (error) {
			out.push({label, status: 'ERR', body: String(error,),},)
			return undefined
		}
	}

	const parseJSON = (text,) => {
		try {
			return JSON.parse(text,)
		} catch {
			return undefined
		}
	}

	const bearerOnly = (bearer,) => ({credentials: 'omit', headers: {Authorization: `Bearer ${bearer}`,},})
	const cookieAndBearer = (bearer,) => ({headers: {Authorization: `Bearer ${bearer}`,},})

	// 1. Is the current token exchange what broke?
	const csrf = await chrome.cookies.get({url: 'https://sh.reddit.com', name: 'csrf_token',},)
	const tokenText = await probe('token exchange', 'https://www.reddit.com/svc/shreddit/token', {
		method: 'POST',
		headers: {'Content-Type': 'application/json',},
		body: JSON.stringify({csrf_token: csrf?.value,},),
	},)
	const bearer = parseJSON(tokenText,)?.token

	// Real ids to read, so a 404 means the endpoint refused the request rather than "no such page".
	const user = 'spez'
	const newest = parseJSON(await probe('setup: newest post', `https://old.reddit.com/r/${sub}/new.json?limit=1`,),)
	const postId = newest?.data?.children?.[0]?.data?.id
	const wikiPages = parseJSON(await probe('setup: wiki pages', `https://old.reddit.com/r/${sub}/wiki/pages.json`,),)
	const wikiPage = wikiPages?.data?.find((page,) => !page.startsWith('config/',)) ?? 'index'

	// 2. Every GET Toolbox sends to oauth.reddit.com (api/resources/*), under each auth mode.
	const paths = [
		'/api/v1/me',
		'/subreddits/mine/moderator.json?limit=1',
		'/api/info.json?id=t3_1',
		`/r/${sub}/api/info.json?id=t3_1`,
		`/r/${sub}/about.json`,
		`/r/${sub}/about/rules.json`,
		`/r/${sub}/about/log.json?limit=1`,
		`/r/${sub}/about/modqueue.json?limit=1`,
		`/r/${sub}/about/unmoderated.json?limit=1`,
		`/r/${sub}/about/reports.json?limit=1`,
		`/r/${sub}/about/spam.json?limit=1`,
		`/r/${sub}/about/edited.json?limit=1`,
		`/r/${sub}/hot.json?limit=2`,
		`/r/${sub}/about/moderators.json?limit=1`,
		`/r/${sub}/about/banned/.json?limit=1`,
		`/r/${sub}/about/muted.json?limit=1`,
		`/r/${sub}/about/contributors.json?limit=1`,
		`/r/${sub}/wiki/pages.json`,
		`/r/${sub}/wiki/${wikiPage}.json`,
		`/r/${sub}/wiki/revisions/${wikiPage}.json?limit=1`,
		`/r/${sub}/api/user_flair_v2`,
		`/r/${sub}/api/link_flair_v2`,
		`/user/${user}/about.json`,
		`/user/${user}/overview.json?limit=1`,
		`/user/${user}/submitted.json?limit=1`,
		`/user/${user}/comments.json?limit=1`,
		`/user/${user}.json?limit=1`,
		...(postId ? [`/r/${sub}/comments/${postId}.json?limit=1`,] : []),
		'/api/mod/conversations/unread/count',
		`/api/mod/notes?subreddit=${sub}&user=${user}&limit=1`,
		`/api/mod/notes/recent?subreddits=${sub}&users=${user}`,
		`/api/v1/${sub}/removal_reasons`,
	]

	// Mirrors initialOAuthMode in background/handlers/webrequest.ts; keep the two in step.
	const bearerOnlyPrefixes = ['/api/mod/', '/api/v1/',]
	const bearerOnlySuffixes = ['/api/user_flair_v2', '/api/link_flair_v2',]
	const firstMode = (path,) => {
		const pathname = path.split('?',)[0]
		const bearerFirst = bearerOnlyPrefixes.some((prefix,) => pathname.startsWith(prefix,))
			|| bearerOnlySuffixes.some((suffix,) => pathname.endsWith(suffix,))
		return bearerFirst ? 'bearer' : 'cookie'
	}
	const isOk = (status,) => typeof status === 'number' && status >= 200 && status < 300
	const verdicts = []

	for (const path of paths) {
		const url = `https://oauth.reddit.com${path}`
		await probe(`cookie only   ${path}`, url,)
		const cookieStatus = out.at(-1,).status
		let bearerStatus
		if (bearer) {
			await probe(`bearer only   ${path}`, url, bearerOnly(bearer,),)
			bearerStatus = out.at(-1,).status
			await probe(`cookie+bearer ${path}`, url, cookieAndBearer(bearer,),)
		}

		// What Toolbox would actually get: the first mode, plus the other mode only after a 403.
		const mode = firstMode(path,)
		const [first, second,] = mode === 'cookie' ? [cookieStatus, bearerStatus,] : [bearerStatus, cookieStatus,]
		const works = isOk(first,) || (first === 403 && isOk(second,))
		const verdict = works
			? 'ok'
			: first === 'redirect'
			? 'BROKEN: redirects, which the transport refuses to follow -- use another endpoint'
			: isOk(second,)
			? `BROKEN: ${mode} gets ${first}, other mode works -- fix initialOAuthMode`
			: `BROKEN: ${first} / ${second} under both modes`
		verdicts.push({path, firstMode: mode, cookie: cookieStatus, bearer: bearerStatus, verdict,},)
	}

	// 2b. The Mod Button's User Flair tab. flairselector is a POST but only reads, so it is safe to probe.
	const flairUser = 'spez'
	const flairselectorBody = () => {
		const form = new FormData()
		form.append('name', flairUser,)
		return form
	}
	const flairselectorUrl = `https://oauth.reddit.com/r/${sub}/api/flairselector`
	await probe('cookie only   POST flairselector', flairselectorUrl, {method: 'POST', body: flairselectorBody(),},)
	if (bearer) {
		await probe('bearer only   POST flairselector', flairselectorUrl, {
			method: 'POST',
			body: flairselectorBody(),
			...bearerOnly(bearer,),
		},)
		await probe('cookie+bearer POST flairselector', flairselectorUrl, {
			method: 'POST',
			body: flairselectorBody(),
			...cookieAndBearer(bearer,),
		},)
	}

	// 3. Modhash availability and the CSRF requirement for mutations
	const meText = await probe('old /api/me.json', 'https://old.reddit.com/api/me.json',)
	const modhash = parseJSON(meText,)?.data?.modhash
	out.push({label: 'modhash present', status: Boolean(modhash,),},)

	const unsaveBody = () => {
		const form = new FormData()
		form.append('id', 't3_0',)
		return form
	}
	if (bearer) {
		await probe('oauth POST unsave, bearer only', 'https://oauth.reddit.com/api/unsave', {
			method: 'POST',
			body: unsaveBody(),
			...bearerOnly(bearer,),
		},)
	}
	for (const host of ['oauth', 'old',]) {
		const url = `https://${host}.reddit.com/api/unsave`
		await probe(`${host} POST unsave, cookie, no modhash`, url, {method: 'POST', body: unsaveBody(),},)
		if (modhash) {
			await probe(`${host} POST unsave, cookie + X-Modhash`, url, {
				method: 'POST',
				body: unsaveBody(),
				headers: {'X-Modhash': modhash,},
			},)
		}
	}

	console.table(out,)
	// The summary that matters: any BROKEN row is an endpoint Toolbox cannot read today.
	console.table(verdicts,)
}

main()
