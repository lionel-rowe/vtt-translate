import { type Node } from 'webvtt'
import { load } from 'cheerio'
import type { AnyNode, CheerioAPI } from 'cheerio'
import { unreachable } from 'std/assert/mod.ts'

export function vttNodesToXmlFragment(nodes: Node[]): string {
	const $ = load('<xml />', { xml: true })
	const $xml = $('xml').eq(0)

	for (const node of nodes) {
		$xml.html($xml.html() + nodeToXmlFragment(node, $))
	}

	return $xml.html()!
}

export function xmlFragmentToVttNodes(xml: string): Node[] {
	const $ = load('<xml />', { xml: true })
	const $xml = $('xml').eq(0)
	$xml.html(xml)
	return [...$xml.contents()].map((x) => cheerioNodeToVttNode(x, $))
}

function nodeToXmlFragment(node: Node, $: CheerioAPI): string {
	switch (node.type) {
		case 'object': {
			const $n = $(`<${node.name}>`)

			for (const c of node.classes) $n.addClass(c)

			if (node.name === 'lang' || node.name === 'v') {
				$n.attr('value', node.value)
			}

			for (const x of node.children.map((node) => nodeToXmlFragment(node, $))) {
				$n.html($n.html()! + x)
			}

			return $n.prop('outerHTML')!
		}
		case 'text': {
			return node.value
		}
	}
}

function cheerioNodeToVttNode(n: AnyNode, $: CheerioAPI): Node {
	if (n.type === 'text') {
		return {
			type: 'text',
			value: n.data,
		}
	}

	const $n = $(n)

	const name = $n.prop('tagName')?.toLowerCase()
	switch (name) {
		case 'v':
		case 'lang': {
			return {
				type: 'object',
				name,
				value: $n.attr('value')!,
				classes: $n.attr('class')?.split(/\s+/) ?? [],
				children: [...$n.contents()].map((x) => cheerioNodeToVttNode(x, $)),
			}
		}
		case 'c':
		case 'i':
		case 'b':
		case 'u':
		case 'ruby':
		case 'rt': {
			return {
				type: 'object',
				name,
				classes: $n.attr('class')?.split(/\s+/) ?? [],
				children: [...$n.contents()].map((x) => cheerioNodeToVttNode(x, $)),
			}
		}
		default: {
			return unreachable()
		}
	}
}
