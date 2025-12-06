/**
 * Rule Evaluator
 * Evaluates S-52 rules against features and context
 */

import type { Rule, Condition, RuleResult, EvaluationContext, LogicalRule } from './types'

export class RuleEvaluator {
	private rules: Rule[] = []

	/**
	 * Register a rule
	 */
	addRule(rule: Rule): void {
		this.rules.push(rule)
		// Sort by priority (higher priority first)
		this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0))
	}

	/**
	 * Register multiple rules
	 */
	addRules(rules: Rule[]): void {
		rules.forEach((rule) => this.addRule(rule))
	}

	/**
	 * Evaluate rules for a feature
	 * Returns the first matching rule result, or null if no rules match
	 */
	evaluate(feature: any, context: any): RuleResult | null {
		const evalContext: EvaluationContext = {
			feature,
			context,
		}

		for (const rule of this.rules) {
			if (this.evaluateCondition(rule.condition, evalContext)) {
				return rule.result
			}
		}

		return null
	}

	/**
	 * Evaluate a condition
	 */
	private evaluateCondition(
		condition: Condition | Condition[] | LogicalRule,
		evalContext: EvaluationContext,
	): boolean {
		if (Array.isArray(condition)) {
			// Array of conditions - all must be true (AND)
			return condition.every((c) => this.evaluateSingleCondition(c, evalContext))
		}

		if ('operator' in condition && 'conditions' in condition) {
			// Logical rule
			return this.evaluateLogicalRule(condition, evalContext)
		}

		// Single condition
		return this.evaluateSingleCondition(condition as Condition, evalContext)
	}

	/**
	 * Evaluate a logical rule
	 */
	private evaluateLogicalRule(rule: LogicalRule, evalContext: EvaluationContext): boolean {
		const { operator, conditions } = rule

		switch (operator) {
			case 'and':
				return conditions.every((c) => this.evaluateCondition(c, evalContext))
			case 'or':
				return conditions.some((c) => this.evaluateCondition(c, evalContext))
			case 'not':
				return !this.evaluateCondition(conditions[0], evalContext)
			default:
				return false
		}
	}

	/**
	 * Evaluate a single condition
	 */
	private evaluateSingleCondition(condition: Condition, evalContext: EvaluationContext): boolean {
		// 获取实际值：从 feature 或 context 中根据 property 路径获取
		const value = this.getPropertyValue(condition.property, evalContext)
		const { operator, value: conditionValue } = condition

		// 解析期望值：
		// - 如果 condition.value 是路径字符串（如 'context.safetyDepth.depth'），
		//   需要从 evalContext 中解析获取实际值
		// - 否则，condition.value 就是字面值（如 10, 'string', [1,2,3]），直接使用
		const expectedValue =
			conditionValue !== undefined &&
			typeof conditionValue === 'string' &&
			(conditionValue.startsWith('context.') || conditionValue.startsWith('feature.'))
				? this.getPropertyValue(conditionValue, evalContext)
				: conditionValue

		switch (operator) {
			case 'eq':
				return value === expectedValue
			case 'ne':
				return value !== expectedValue
			case 'gt':
				return Number(value) > Number(expectedValue)
			case 'gte':
				return Number(value) >= Number(expectedValue)
			case 'lt':
				return Number(value) < Number(expectedValue)
			case 'lte':
				return Number(value) <= Number(expectedValue)
			case 'in':
				return Array.isArray(expectedValue) && expectedValue.includes(value)
			case 'notIn':
				return Array.isArray(expectedValue) && !expectedValue.includes(value)
			case 'exists':
				return value !== undefined && value !== null
			case 'notExists':
				return value === undefined || value === null
			default:
				return false
		}
	}

	/**
	 * Get property value from evaluation context
	 * Supports dot notation (e.g., 'feature.properties.DRVAL1', 'context.safetyDepth.depth')
	 */
	private getPropertyValue(path: string, evalContext: EvaluationContext): any {
		const parts = path.split('.')
		let value: any = evalContext

		for (const part of parts) {
			if (value === null || value === undefined) {
				return undefined
			}
			value = value[part]
		}

		return value
	}

	/**
	 * Clear all rules
	 */
	clear(): void {
		this.rules = []
	}

	/**
	 * Get all registered rules
	 */
	getRules(): Rule[] {
		return [...this.rules]
	}
}
