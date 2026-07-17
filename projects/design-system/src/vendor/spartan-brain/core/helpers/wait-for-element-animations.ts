const MAX_ANIMATION_WAIT_MS = 5_000;
const ANIMATION_WAIT_BUFFER_MS = 50;

export function getActiveElementAnimations(elements: readonly (HTMLElement | null | undefined)[]): Animation[] {
	// PIVOT-vendored: flatMap → map+reduce(concat) for ng-packagr lib compat (behaviour identical).
	return elements
		.filter((element): element is HTMLElement => !!element)
		.map((element: HTMLElement) =>
			typeof element.getAnimations === 'function'
				? element.getAnimations({ subtree: true }).filter((animation: Animation) => animation.playState !== 'finished')
				: ([] as Animation[]),
		)
		.reduce((acc: Animation[], list: Animation[]) => acc.concat(list), []);
}

export async function waitForAnimations(animations: readonly Animation[]): Promise<void> {
	if (!animations.length) return;

	let timeout: ReturnType<typeof setTimeout> | undefined;
	const fallbackMs = getFallbackTimeout(animations);

	try {
		await Promise.race([
			// PIVOT-vendored: allSettled → all + per-promise catch for ng-packagr lib compat.
			Promise.all(animations.map((animation) => Promise.resolve(animation.finished).catch(() => undefined))),
			new Promise<void>((resolve) => {
				timeout = setTimeout(resolve, fallbackMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

/**
 * Waits for active animations, including subtree animations, within the given element to finish.
 */
export async function waitForElementAnimations(element: HTMLElement): Promise<void> {
	await waitForAnimations(getActiveElementAnimations([element]));
}

function getFallbackTimeout(animations: readonly Animation[]): number {
	const longestAnimation = animations.reduce((longest, animation) => {
		const endTime = animation.effect?.getComputedTiming().endTime;
		return typeof endTime === 'number' && Number.isFinite(endTime) ? Math.max(longest, endTime) : longest;
	}, 0);

	if (!longestAnimation) return MAX_ANIMATION_WAIT_MS;
	return Math.min(longestAnimation + ANIMATION_WAIT_BUFFER_MS, MAX_ANIMATION_WAIT_MS);
}
