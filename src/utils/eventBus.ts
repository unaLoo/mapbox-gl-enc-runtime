type EventCallback = (...args: any[]) => void

class EventBus {
    events: Map<string, EventCallback[]> = new Map<string, EventCallback[]>()

    on(event: string, callback: EventCallback) {
        this.events.set(event, [...(this.events.get(event) || []), callback])
    }

    off(event: string, callback: EventCallback) {
        this.events.set(event, this.events.get(event)?.filter((cb) => cb !== callback) || [])
    }

    once(event: string, callback: EventCallback) {
        const onceCallback = (...args: any[]) => {
            callback(...args)
            this.off(event, onceCallback)
        }
        this.on(event, onceCallback)
    }

    trigger(event: string, ...args: any[]) {
        this.events.get(event)?.forEach((callback) => callback(...args))
    }

    destroy() {
        this.events.clear()
    }
}

let eventBus: EventBus | null = null
export function initEventBus() {
    if (eventBus !== null) {
        throw new Error('EventBus already initialized')
    }
    eventBus = new EventBus()
}

export function getEventBus(): EventBus | null {
    if (eventBus) return eventBus
    else {
        throw new Error('EventBus already initialized')
    }
}

export function destroyEventBus() {
    eventBus?.destroy()
    eventBus = null
}
