/** Tests for ModNotesPager's entry filtering. */

import {act, type ReactElement,} from 'react'
import {createRoot, type Root,} from 'react-dom/client'
import {afterEach, describe, expect, it, vi,} from 'vitest'

import type {ModNote,} from './schema'

const pagerProps = vi.hoisted(() => ({current: null as {pages: AsyncIterable<ReactElement>} | null,}))
const notes = vi.hoisted(() => ({current: [] as unknown[],}))

vi.mock('../../../api/resources/modnotes', () => ({
	deleteModNote: vi.fn(),
	async *getAllModNotes () {
		for (const note of notes.current) { yield note }
	},
}),)
vi.mock('../../../shared/window/Pager', () => ({
	Pager: (props: {pages: AsyncIterable<ReactElement>},) => {
		pagerProps.current = props
		return null
	},
}),)
vi.mock('../../../store/feedback', () => ({negativeTextFeedback: vi.fn(), positiveTextFeedback: vi.fn(),}),)
vi.mock('../../../util/infra/logging', () => ({default: () => ({error: vi.fn(),}),}),)
vi.mock('./NoteTableRow', () => ({NoteTableRow: () => null,}),)
;(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true

import {ModNotesPager,} from './ModNotesPager'

function makeNote (id: string, label: string | null,): ModNote {
	return {
		id,
		created_at: 1,
		type: 'NOTE',
		operator: 'mod',
		subreddit: 'testsub',
		user: 'alice',
		label: null,
		description: null,
		details: null,
		user_note_data: {note: id, label, reddit_id: null,},
		mod_action_data: null,
	}
}

const roots: Root[] = []

/** Renders the pager and returns the note ids on its first page. */
async function firstPageIds (hideAiSummaries: boolean,): Promise<string[]> {
	const root = createRoot(document.createElement('div',),)
	roots.push(root,)
	act(() => {
		root.render(<ModNotesPager user="alice" subreddit="testsub" filter="NOTE" hideAiSummaries={hideAiSummaries} />,)
	},)
	for await (const pageElement of pagerProps.current!.pages) {
		const rows = (pageElement.props as {children: ReactElement[]}).children
		return rows.map((row,) => (row.props as {note: ModNote}).note.id)
	}
	return []
}

afterEach(() => {
	for (const root of roots.splice(0,)) {
		act(() => root.unmount())
	}
	pagerProps.current = null
},)

describe('ModNotesPager', () => {
	notes.current = [makeNote('first', null,), makeNote('summary', 'USER_SUMMARY',), makeNote('last', 'BAN',),]

	it('shows AI summaries by default', async () => {
		expect(await firstPageIds(false,),).toEqual(['first', 'summary', 'last',],)
	})

	it('leaves AI summaries out when asked to', async () => {
		expect(await firstPageIds(true,),).toEqual(['first', 'last',],)
	})
})
