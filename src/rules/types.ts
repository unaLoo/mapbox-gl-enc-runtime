/**
 * Rule engine types
 */

/**
 * Condition operator
 */
export type ConditionOperator =
	| 'eq' // equals
	| 'ne' // not equals
	| 'gt' // greater than
	| 'gte' // greater than or equal
	| 'lt' // less than
	| 'lte' // less than or equal
	| 'in' // in array
	| 'notIn' // not in array
	| 'exists' // property exists
	| 'notExists' // property does not exist

/**
 * Condition
 * Evaluates a property against a value using an operator
 */
export interface Condition {
	/**
	 * Property path to evaluate (e.g., 'properties.DRVAL1' or 'context.safetyDepth.depth')
	 */
	property: string
	/**
	 * Operator to use
	 */
	operator: ConditionOperator
	/**
	 * Value to compare against
	 */
	value?: any
}

/**
 * Logical operator for combining conditions
 */
export type LogicalOperator = 'and' | 'or' | 'not'

/**
 * Rule
 * Defines a condition and its resulting rendering behavior
 */
export interface Rule {
	/**
	 * Rule identifier
	 */
	id: string
	/**
	 * Rule name/description
	 */
	name?: string
	/**
	 * Conditions to evaluate
	 * Can be a single condition, array of conditions, or nested logical structure
	 */
	condition: Condition | Condition[] | LogicalRule
	/**
	 * Result when condition is true
	 */
	result: RuleResult
	/**
	 * Priority (higher priority rules are evaluated first)
	 */
	priority?: number
}

/**
 * Logical rule structure
 */
export interface LogicalRule {
	operator: LogicalOperator
	conditions: (Condition | LogicalRule)[]
}

/**
 * Rule result
 * Defines how a feature should be rendered when the rule matches
 */
export interface RuleResult {
	/**
	 * Color to use (RGB array or hex string)
	 */
	color?: [number, number, number] | string
	/**
	 * Symbol identifier
	 */
	symbol?: string
	/**
	 * Pattern identifier
	 */
	pattern?: string
	/**
	 * Line width
	 */
	lineWidth?: number
	/**
	 * Line style
	 */
	lineStyle?: 'solid' | 'dashed' | 'dotted'
	/**
	 * Opacity (0-1)
	 */
	opacity?: number
	/**
	 * Visibility
	 */
	visible?: boolean
	/**
	 * Additional rendering properties
	 */
	[key: string]: any
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
	/**
	 * Feature being evaluated
	 */
	feature: any
	/**
	 * Rendering context
	 */
	context: any
	/**
	 * Additional data
	 */
	[key: string]: any
}
