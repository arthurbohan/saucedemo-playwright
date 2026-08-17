/**
 * testSelection module — main exports
 */

export { findSpecFiles } from './discover'
export { buildDependencyGraph } from './graph'
export { selectImpactedSpecs } from './select'
export type { SelectionResult } from './select'
