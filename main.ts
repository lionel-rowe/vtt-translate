import 'std/dotenv/load.ts'
import { WebVttParser, WebVttSerializer } from 'webvtt'
import { vttNodesToXmlFragment, xmlFragmentToVttNodes } from './vtt.ts'

const [inFilePath, outFilePath] = Deno.args
if (!inFilePath) throw new Error('Missing inFilePath')
if (!outFilePath) throw new Error('Missing outFilePath')

// https://developers.deepl.com/docs/api-reference/translate
const endpoint = new URL('/v2/translate', 'https://api-free.deepl.com')

const parser = new WebVttParser()
const serializer = new WebVttSerializer()
const originalCues = parser.parse(await Deno.readTextFile(inFilePath), 'metadata').cues.slice(0, 10)

const xmlFragments = originalCues.map((cue) => {
	return vttNodesToXmlFragment(cue.tree.children)
})

const body = JSON.stringify({
	text: xmlFragments,
	source_lang: 'en',
	target_lang: 'zh',
	tag_handling: 'xml',
	// split_sentences: 'nonewlines',
})

const headers = {
	Authorization: `DeepL-Auth-Key ${Deno.env.get('DEEPL_API_KEY')}`,
	'Content-Type': 'application/json',
}

const res = await fetch(endpoint, {
	method: 'POST',
	headers,
	body,
})

const result: { translations: { detected_source_language: string; text: string }[] } = await res.json()
const translations = result.translations.map((x) => x.text)

const outCues = originalCues.map((cue, idx) => {
	const xml = xmlFragments[idx]
	const translation = translations[idx]

	const outXml = `${xml}\n${translation}`

	return {
		...cue,
		tree: { children: xmlFragmentToVttNodes(outXml) },
	}
})

await Deno.writeTextFile(outFilePath, serializer.serialize(outCues).replaceAll(/\n{3,}/g, '\n\n').trim() + '\n')
