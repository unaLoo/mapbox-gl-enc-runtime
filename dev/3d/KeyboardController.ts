import * as THREE from 'three'

export class KeyboardController {
	target: THREE.Object3D
	moveSpeed: number // 移动速度 (单位/秒)
	turnSpeed: number // 转向速度 (弧度/秒)
	keys: Set<string> = new Set()

	private keydownHandler = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase())
	private keyupHandler = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())

	constructor(target: THREE.Object3D, moveSpeed: number = 50, turnSpeed: number = Math.PI) {
		this.target = target
		this.moveSpeed = moveSpeed
		this.turnSpeed = turnSpeed

		window.addEventListener('keydown', this.keydownHandler)
		window.addEventListener('keyup', this.keyupHandler)
	}

	tick(delta: number) {
		// A/D 控制转向 (绕 Y 轴旋转)
		if (this.keys.has('a')) this.target.rotation.y += this.turnSpeed * delta
		if (this.keys.has('d')) this.target.rotation.y -= this.turnSpeed * delta

		// W/S 沿当前朝向前进/后退
		if (this.keys.has('w') || this.keys.has('s')) {
			const direction = new THREE.Vector3(0, 0, 1) // 默认朝向 Z
			direction.applyQuaternion(this.target.quaternion) // 应用当前旋转

			const distance = this.moveSpeed * delta
			if (this.keys.has('w')) this.target.position.addScaledVector(direction, distance)
			if (this.keys.has('s')) this.target.position.addScaledVector(direction, -distance)
		}
	}

	dispose() {
		window.removeEventListener('keydown', this.keydownHandler)
		window.removeEventListener('keyup', this.keyupHandler)
	}
}
