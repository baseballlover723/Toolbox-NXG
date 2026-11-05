/**
 * Reddit auth probe: compares cookie, bearer, and cookie+bearer auth against the endpoints Toolbox uses.
 *
 * Not part of the build. Paste into the extension's service worker console (chrome://extensions ->
 * Inspect views: service worker) while logged in as a moderator. Only GETs, plus one harmless POST
 * (unsave of a nonexistent id). Set `sub` below to a subreddit you moderate.
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
				status: response.status,
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

	// 2. The endpoints [N]/[M] hit, under each auth mode on oauth.reddit.com.
	const paths = [
		'/api/v1/me',
		'/subreddits/mine/moderator.json?limit=1',
		`/r/${sub}/about/banned/.json?limit=1`,
		`/r/${sub}/wiki/usernotes.json`,
		'/api/info.json?id=t3_1',
		'/api/mod/conversations/unread/count',
		`/api/mod/notes/recent?subreddits=${sub}&users=spez`,
	]
	for (const path of paths) {
		const url = `https://oauth.reddit.com${path}`
		await probe(`cookie only   ${path}`, url,)
		if (bearer) {
			await probe(`bearer only   ${path}`, url, bearerOnly(bearer,),)
			await probe(`cookie+bearer ${path}`, url, cookieAndBearer(bearer,),)
		}
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
}

main()
