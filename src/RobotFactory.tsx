import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { agents } from './data'
import type { AgentId } from './types'

type GraphicsQuality = 'low' | 'balanced' | 'cinematic'
type CameraMode = 'overview' | 'follow'

interface Props { activeAgent: AgentId | null; progress: number; missionStatus?: string; guildLevel?: number; guildTokens?: number; onSelect: (id: AgentId) => void }

function initialQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return 'balanced'
  return window.matchMedia('(max-width: 760px)').matches ? 'low' : 'balanced'
}

export function RobotFactory({ activeAgent, progress, missionStatus = 'idle', guildLevel = 1, guildTokens = 0, onSelect }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const [quality, setQuality] = useState<GraphicsQuality>(initialQuality)
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview')
  const [paused, setPaused] = useState(false)
  const state = useRef({ activeAgent, progress, missionStatus, guildLevel, guildTokens, onSelect, cameraMode, paused })
  state.current = { activeAgent, progress, missionStatus, guildLevel, guildTokens, onSelect, cameraMode, paused }

  useEffect(() => {
    const host = mount.current
    if (!host) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#06110f')
    scene.fog = new THREE.Fog('#071b1a', 20, 54)
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120)
    camera.position.set(0, 8.5, 21)
    const renderer = new THREE.WebGLRenderer({ antialias: quality !== 'low', alpha: false, powerPreference: 'high-performance' })
    const pixelRatio = quality === 'low' ? 1 : quality === 'balanced' ? 1.35 : 1.75
    renderer.setPixelRatio(Math.min(devicePixelRatio, pixelRatio))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = quality === 'cinematic'
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Robot Guild Hall. Drag to orbit, use the wheel to zoom, or select a specialist below.')
    host.appendChild(renderer.domElement)

    scene.add(new THREE.HemisphereLight('#bfffea', '#102b24', 2.2))
    const key = new THREE.DirectionalLight('#9ee8ff', 4); key.position.set(4, 8, 5); scene.add(key)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 48), new THREE.MeshStandardMaterial({ color: '#173d2a', roughness: .96, metalness: 0 }))
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.35; scene.add(floor)
    const grid = new THREE.GridHelper(64, 32, '#2b7257', '#1f503e'); grid.position.y = -1.33; scene.add(grid)

    // Wide original sandbox-game district with roads, trees and a quest plaza.
    const roadMaterial = new THREE.MeshStandardMaterial({ color: '#31504a', roughness: .92 })
    const road = new THREE.Mesh(new THREE.PlaneGeometry(46, 4.4), roadMaterial); road.rotation.x = -Math.PI / 2; road.position.set(0, -1.29, -1.2); scene.add(road)
    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 31), roadMaterial); crossRoad.rotation.x = -Math.PI / 2; crossRoad.position.set(0, -1.285, -2); scene.add(crossRoad)
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, .13, 20), new THREE.MeshStandardMaterial({ color: '#284f46', roughness: .78, metalness: .12 })); plaza.position.set(0, -1.24, -2); scene.add(plaza)
    const treeMaterial = new THREE.MeshStandardMaterial({ color: '#23865f', roughness: .9 })
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#72523a', roughness: 1 })
    for (let index = 0; index < 24; index += 1) {
      const side = index % 2 ? 1 : -1
      const tree = new THREE.Group()
      tree.add(new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, 1.3, 7), trunkMaterial))
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(.72 + (index % 3) * .08, 0), treeMaterial); crown.position.y = 1.05; tree.add(crown)
      tree.position.set(side * (10.5 + (index % 6) * 2.7), -.68, -11 + Math.floor(index / 6) * 7.2); tree.rotation.y = index * .73; scene.add(tree)
    }

    // Original MMORPG-style guild district: each specialist owns a building.
    const buildings: THREE.Group[] = []
    agents.forEach((agent, index) => {
      const building = new THREE.Group()
      const color = new THREE.Color(agent.color)
      const stone = new THREE.MeshStandardMaterial({ color: '#173a32', roughness: .68, metalness: .22 })
      const trim = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .45, metalness: .55 })
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25 + index * .09, 1.35), stone); building.add(base)
      const roof = new THREE.Mesh(index === 4 ? new THREE.ConeGeometry(1.18, .75, 4) : new THREE.CylinderGeometry(.2, 1.08, .7, 4), trim); roof.position.y = 1; roof.rotation.y = Math.PI / 4; building.add(roof)
      const door = new THREE.Mesh(new THREE.BoxGeometry(.48, .72, .06), trim); door.position.set(0, -.24, .705); building.add(door)
      const beacon = new THREE.PointLight(color, 2.4, 4); beacon.position.set(0, 1.75, .2); building.add(beacon)
      const angle = (index / agents.length) * Math.PI * 1.45 + Math.PI * .78
      building.position.set(Math.cos(angle) * 10.5, -.72, Math.sin(angle) * 7.3 - 2)
      building.scale.setScalar(1.15)
      scene.add(building); buildings.push(building)
    })

    // The guild project physically grows as verified backend progress increases.
    const construction = new THREE.Group()
    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.65, .35, 8), new THREE.MeshStandardMaterial({ color: '#23483e', metalness: .4 })); construction.add(foundation)
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.65, 3.4, 1.65), new THREE.MeshStandardMaterial({ color: '#b5d6cc', metalness: .72, roughness: .24 })); tower.position.y = 1.85; construction.add(tower)
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(.42), new THREE.MeshStandardMaterial({ color: '#43edb5', emissive: '#20aa7d', emissiveIntensity: 2.5 })); core.position.y = 3.65; construction.add(core)
    construction.position.set(0, -1.15, -2); scene.add(construction)

    const crane = new THREE.Group()
    const craneMat = new THREE.MeshStandardMaterial({ color: '#e1a83e', metalness: .6, roughness: .28 })
    const mast = new THREE.Mesh(new THREE.BoxGeometry(.16, 4.2, .16), craneMat); mast.position.y = .85; crane.add(mast)
    const boom = new THREE.Mesh(new THREE.BoxGeometry(3.3, .14, .14), craneMat); boom.position.set(.9, 2.8, 0); crane.add(boom)
    crane.position.set(-3.2, -1.2, -2.2); scene.add(crane)

    const robots: { id: AgentId; group: THREE.Group; face: THREE.Mesh; ring: THREE.Mesh }[] = []
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
    agents.forEach((agent, index) => {
      const group = new THREE.Group()
      const homeAngle = (index / agents.length) * Math.PI * 1.45 + Math.PI * .78
      group.position.set(Math.cos(homeAngle) * 8.4, 0, Math.sin(homeAngle) * 5.8 - 2)
      const color = new THREE.Color(agent.color)
      const metal = new THREE.MeshStandardMaterial({ color: '#b8d8d0', metalness: .7, roughness: .25 })
      const dark = new THREE.MeshStandardMaterial({ color: '#102c27', metalness: .45, roughness: .35 })
      const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.7 })
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(.58, .72, 6, 12), metal); body.position.y = -.08; group.add(body)
      const chest = new THREE.Mesh(new THREE.SphereGeometry(.3, 18, 12), glow); chest.position.set(0, -.05, .53); chest.scale.y = .68; group.add(chest)
      const head = new THREE.Mesh(new THREE.SphereGeometry(.78, 20, 14), metal); head.position.y = 1.18; head.scale.z = .78; group.add(head)
      const face = new THREE.Mesh(new THREE.SphereGeometry(.59, 20, 12, -.82, 1.64, .65, 1.15), dark); face.position.set(0, 1.2, .17); face.rotation.x = -.18; group.add(face)
      const eye = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .32, 4, 8), glow); eye.position.set(0, 1.24, .6); eye.rotation.z = Math.PI / 2; group.add(eye)
      const helmetRing = new THREE.Mesh(new THREE.TorusGeometry(.79, .065, 10, 32), glow); helmetRing.position.y = 1.18; helmetRing.rotation.x = Math.PI / 2; helmetRing.scale.z = .78; group.add(helmetRing)
      const earMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .75, metalness: .72 })
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .12, 12), earMaterial); ear.position.set(side * .75, 1.2, 0); ear.rotation.z = Math.PI / 2; group.add(ear)
      }
      const backpack = new THREE.Mesh(new THREE.CapsuleGeometry(.33, .42, 4, 10), dark); backpack.position.set(0, -.05, -.52); backpack.rotation.x = Math.PI / 2; group.add(backpack)
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .45), metal); antenna.position.y = 1.78; group.add(antenna)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 8), glow); tip.position.y = 2.02; group.add(tip)
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .7, 4, 8), metal); arm.position.set(side * .77, -.02, 0); arm.rotation.z = side * -.22; group.add(arm)
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.18, .56, 4, 8), dark); leg.position.set(side * .35, -1, 0); group.add(leg)
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.85, .045, 8, 48), glow); ring.rotation.x = Math.PI / 2; ring.position.y = -1.28; group.add(ring)
      // Each original robot carries a readable profession tool instead of looking like a block avatar.
      if (agent.id === 'router') {
        const compass = new THREE.Mesh(new THREE.TorusGeometry(.27, .045, 8, 24), glow); compass.position.set(.82, .15, .38); compass.rotation.y = Math.PI / 2; group.add(compass)
      } else if (agent.id === 'planner') {
        const tablet = new THREE.Mesh(new THREE.BoxGeometry(.48, .62, .08), dark); tablet.position.set(.72, .02, .48); tablet.rotation.z = -.18; group.add(tablet)
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(.35, .48), glow); screen.position.set(.72, .02, .525); screen.rotation.z = -.18; group.add(screen)
      } else if (agent.id === 'builder') {
        const wrench = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .55, 4, 8), glow); wrench.position.set(.82, .05, .25); wrench.rotation.z = -.65; group.add(wrench)
      } else if (agent.id === 'tester') {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(.23, .055, 8, 24), glow); lens.position.set(.77, .17, .46); lens.rotation.y = .2; group.add(lens)
      } else {
        const shield = new THREE.Mesh(new THREE.CircleGeometry(.35, 6), glow); shield.position.set(.72, .05, .49); shield.scale.y = 1.18; group.add(shield)
      }
      group.userData.id = agent.id; scene.add(group); robots.push({ id: agent.id, group, face, ring })
    })

    const packet = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 1), new THREE.MeshStandardMaterial({ color: '#66b8ff', emissive: '#2e8fff', emissiveIntensity: 3 }))
    packet.position.set(-4.3, -.7, .7); scene.add(packet)
    const materials = Array.from({ length: 7 }, (_, index) => {
      const material = new THREE.Mesh(new THREE.BoxGeometry(.27, .27, .27), new THREE.MeshStandardMaterial({ color: index % 2 ? '#e0ae4f' : '#59d9b1', metalness: .55 }))
      material.position.set(-7 + index * .48, -1.02, -1.05); scene.add(material); return material
    })
    const tool = new THREE.Group()
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .55), new THREE.MeshStandardMaterial({ color: '#c98b45' })); handle.rotation.z = Math.PI / 4; tool.add(handle)
    const headTool = new THREE.Mesh(new THREE.BoxGeometry(.42, .16, .16), new THREE.MeshStandardMaterial({ color: '#b8d9d2', metalness: .8 })); headTool.position.set(-.18, .18, 0); headTool.rotation.z = Math.PI / 4; tool.add(headTool); scene.add(tool)

    // Ambient particles give the hall depth without requiring downloaded art assets.
    const particleCount = quality === 'low' ? 24 : quality === 'balanced' ? 64 : 120
    const particlePositions = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - .5) * 24
      particlePositions[index * 3 + 1] = Math.random() * 8 - 1
      particlePositions[index * 3 + 2] = (Math.random() - .5) * 18 - 1
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#63e9bd', size: quality === 'cinematic' ? .04 : .025, transparent: true, opacity: .6 }))
    scene.add(particles)

    // A reward crown appears only after the owner verifies the completed mission.
    const rewardCrown = new THREE.Group()
    const crownMaterial = new THREE.MeshStandardMaterial({ color: '#f4bd4d', emissive: '#c27a16', emissiveIntensity: 1.8, metalness: .75 })
    for (let index = 0; index < 6; index += 1) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(.12), crownMaterial)
      const angle = index / 6 * Math.PI * 2
      shard.position.set(Math.cos(angle) * .72, 4.35, Math.sin(angle) * .72 - 1.75)
      rewardCrown.add(shard)
    }
    rewardCrown.visible = false
    scene.add(rewardCrown)

    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix() }
    const observer = new ResizeObserver(resize); observer.observe(host); resize()
    let userYaw = 0
    let zoom = 12
    let dragging = false
    let moved = false
    let dragStart = { x: 0, y: 0, yaw: 0 }
    const pointerDown = (event: PointerEvent) => {
      dragging = true
      moved = false
      dragStart = { x: event.clientX, y: event.clientY, yaw: userYaw }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - dragStart.x
      const dy = event.clientY - dragStart.y
      moved = moved || Math.abs(dx) > 4 || Math.abs(dy) > 4
      userYaw = dragStart.yaw - dx * .006
    }
    const pointerUp = (event: PointerEvent) => {
      dragging = false
      if (moved) return
      const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(robots.map(r => r.group), true)[0]
      let object: THREE.Object3D | null = hit?.object ?? null; while (object && !object.userData.id) object = object.parent
      if (object?.userData.id) state.current.onSelect(object.userData.id)
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoom = THREE.MathUtils.clamp(zoom + event.deltaY * .009, 8.5, 17)
    }
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') userYaw -= .18
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') userYaw += .18
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') zoom = Math.max(8.5, zoom - .7)
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') zoom = Math.min(17, zoom + .7)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('wheel', wheel, { passive: false })
    renderer.domElement.addEventListener('keydown', keyDown)
    let frame = 0
    const clock = new THREE.Clock()
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      if (!state.current.paused) {
        const active = state.current.activeAgent
        const activeIndex = Math.max(0, agents.findIndex((agent) => agent.id === active))
        robots.forEach((robot, i) => {
          const selected = robot.id === active
          const homeAngle = (i / robots.length) * Math.PI * 1.45 + Math.PI * .78
          const homeX = Math.cos(homeAngle) * 8.4
          const homeZ = Math.sin(homeAngle) * 5.8 - 2
          // Active specialists walk from their workshop through the plaza to the quest forge.
          const travel = selected && state.current.progress > 0 ? (Math.sin(t * .72) + 1) / 2 : 0
          const easedTravel = travel * travel * (3 - 2 * travel)
          const workX = (i - 2) * .58
          robot.group.position.x = THREE.MathUtils.lerp(robot.group.position.x, THREE.MathUtils.lerp(homeX, workX, easedTravel), .07)
          robot.group.position.z = THREE.MathUtils.lerp(robot.group.position.z, THREE.MathUtils.lerp(homeZ, -1.1, easedTravel), .07)
          robot.group.position.y = Math.sin(t * 2 + i) * .035 + (selected ? Math.abs(Math.sin(t * 4)) * .09 : 0)
          robot.group.rotation.y = selected ? Math.sin(t * 3) * .18 : Math.sin(t * .65 + i) * .04
          robot.ring.visible = selected
          ;(robot.face.material as THREE.MeshStandardMaterial).emissiveIntensity = selected ? .8 : 0
          buildings[i].scale.y = 1 + (selected ? Math.sin(t * 3) * .025 : 0)
        })
        const route = Math.min(4, Math.floor(state.current.progress / 20))
        const next = Math.min(4, route + 1)
        const mix = (state.current.progress % 20) / 20
        const routeAngle = (route / robots.length) * Math.PI * 1.45 + Math.PI * .78
        const nextAngle = (next / robots.length) * Math.PI * 1.45 + Math.PI * .78
        packet.position.x = THREE.MathUtils.lerp(Math.cos(routeAngle) * 8.4, Math.cos(nextAngle) * 8.4, mix)
        packet.position.y = -.55 + Math.sin(t * 4) * .12
        packet.position.z = THREE.MathUtils.lerp(Math.sin(routeAngle) * 5.8 - 2, Math.sin(nextAngle) * 5.8 - 2, mix) + Math.sin(t * 2) * .08
        packet.rotation.x = t * 2
        packet.rotation.y = t * 2.4
        const buildScale = Math.max(.04, state.current.progress / 100)
        tower.scale.y = buildScale
        tower.position.y = .15 + 1.7 * buildScale
        core.visible = state.current.progress >= 80
        core.rotation.y = t
        core.position.y = .4 + 3.35 * buildScale
        const missionCompleted = state.current.missionStatus === 'completed'
        rewardCrown.visible = missionCompleted
        rewardCrown.rotation.y = t * .8
        rewardCrown.position.y = Math.sin(t * 2) * .08
        crownMaterial.emissiveIntensity = missionCompleted ? 1.5 + Math.sin(t * 3) * .45 : 0
        crane.rotation.y = Math.sin(t * .45) * .34
        materials.forEach((material, index) => {
          const materialTravel = (t * .55 + index * .13 + state.current.progress / 100) % 1
          material.position.x = THREE.MathUtils.lerp(-7, -.8, materialTravel)
          material.position.y = -1.02 + Math.sin(materialTravel * Math.PI) * .25
          material.visible = state.current.progress < 100
        })
        tool.position.set(packet.position.x + .3, packet.position.y + .35, packet.position.z)
        tool.rotation.z = Math.sin(t * 4) * .15
        particles.rotation.y = t * .012

        const followTarget = state.current.cameraMode === 'follow'
          ? robots[activeIndex].group.position.clone().add(new THREE.Vector3(0, .35, 0))
          : new THREE.Vector3(0, .4, -2)
        const distance = state.current.cameraMode === 'follow' ? Math.min(zoom, 9.4) : zoom * 1.55
        const desiredCamera = new THREE.Vector3(Math.sin(userYaw) * distance, state.current.cameraMode === 'follow' ? 3.1 : 9.2, Math.cos(userYaw) * distance).add(followTarget)
        camera.position.lerp(desiredCamera, .06)
        camera.lookAt(followTarget)
      }
      renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('wheel', wheel)
      renderer.domElement.removeEventListener('keydown', keyDown)
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points)) return
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      })
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [quality])
  return <div className="factory-experience">
    <div className="factory-canvas" ref={mount} />
    <div className="factory-scene-controls" aria-label="3D Guild Hall controls">
      <button className={cameraMode === 'overview' ? 'active' : ''} onClick={() => setCameraMode('overview')}>Overview</button>
      <button className={cameraMode === 'follow' ? 'active' : ''} onClick={() => setCameraMode('follow')}>Follow robot</button>
      <button onClick={() => setPaused((value) => !value)}>{paused ? 'Resume' : 'Pause'}</button>
      <label><span>Graphics</span><select value={quality} onChange={(event) => setQuality(event.target.value as GraphicsQuality)}><option value="low">LOW</option><option value="balanced">BALANCED</option><option value="cinematic">CINEMATIC</option></select></label>
    </div>
    <div className="factory-help"><span>DRAG TO EXPLORE</span><span>WHEEL / W-S TO ZOOM</span><span>SELECT A SPECIALIST</span><span>FOLLOW ACTIVE ROBOT</span></div>
    <div className={`guild-reward-signal ${missionStatus === 'completed' ? 'earned' : ''}`}><span>LEVEL {guildLevel}</span><span>◆ {guildTokens} GT</span><small>{missionStatus === 'completed' ? 'VERIFIED REWARD UNLOCKED' : 'REWARDS LOCKED UNTIL OWNER VERIFICATION'}</small></div>
  </div>
}
