export default class EventBus {
	events: Map<string, any[]> = new Map<string, any[]>()

	on(event: string, callback: (...args: any[]) => void) {
		this.events.set(event, [...(this.events.get(event) || []), callback])
	}

	off(event: string, callback: (...args: any[]) => void) {
		this.events.set(event, this.events.get(event)?.filter((cb) => cb !== callback) || [])
	}

	once(event: string, callback: (...args: any[]) => void) {
		const onceCallback = (...args: any[]) => {
			callback(...args)
			this.off(event, onceCallback)
		}
		this.on(event, onceCallback)
	}

	trigger(event: string, ...args: any[]) {
		this.events.get(event)?.forEach((callback) => callback(...args))
	}
}
