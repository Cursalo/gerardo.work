import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Enhanced BillboardManager for perfect horizontal-only billboard effect
 * Uses a flat approach with direct matrix manipulation to eliminate all tilting
 */
export default function BillboardManager() {
  const { camera, scene } = useThree()
  
  // Use a ref to track if pointer is locked
  const pointerLockedRef = useRef(false)
  
  // Create reusable objects to avoid garbage collection
  const camPos = useRef(new THREE.Vector3())
  const objPos = useRef(new THREE.Vector3())
  const tempMatrix = useRef(new THREE.Matrix4())
  const tempQuaternion = useRef(new THREE.Quaternion())
  const yAxis = useRef(new THREE.Vector3(0, 1, 0))
  
  // Minimum distance to prevent erratic behavior when too close
  const MIN_LOOKAT_DISTANCE = 0.5
  
  // Target types that should billboard
  const targetTypes = [
    'project', 'image', 'video', 'pdf', 'link', 'button'
  ]
  
  // Update on each frame
  useFrame(() => {
    // Only apply billboarding when pointer is locked (gameplay mode)
    pointerLockedRef.current = !!document.pointerLockElement
    
    if (!pointerLockedRef.current) return
    
    // Get camera world position once per frame
    camera.getWorldPosition(camPos.current)

    // Traverse the scene once to find all card/media objects
    scene.traverse((obj) => {
      // Skip non-visible objects or those with disabled billboarding
      if (!obj.visible || obj.userData?.disableBillboard) return
      
      // Check if this object should be billboarded
      if (obj.userData && (
          targetTypes.includes(obj.userData.objectType) || 
          (obj.name && (
            obj.name.toLowerCase().includes('card') || 
            obj.name.toLowerCase().includes('media')
          ))
        )) {
        // Get object's world position
        obj.getWorldPosition(objPos.current)
        
        // Calculate distance to camera
        const distanceToCamera = objPos.current.distanceTo(camPos.current)
        
        // Only billboard if camera is far enough away
        if (distanceToCamera > MIN_LOOKAT_DISTANCE) {
          // Calculate horizontal direction to camera (zero out Y component)
          const dx = camPos.current.x - objPos.current.x
          const dz = camPos.current.z - objPos.current.z
          
          // Calculate rotation around Y axis only (yaw)
          const yRotation = Math.atan2(dx, dz)
          
          // Create rotation around Y axis only
          tempQuaternion.current.setFromAxisAngle(yAxis.current, yRotation)
          
          // Apply Y-axis rotation directly, preserving object's local scale
          const objScale = new THREE.Vector3()
          obj.getWorldScale(objScale)
          
          // Build a matrix with position, Y-rotation only, and original scale
          tempMatrix.current.compose(
            objPos.current, 
            tempQuaternion.current,
            objScale
          )
          
          // Apply the matrix directly to the object's world transform
          obj.matrixAutoUpdate = false
          obj.matrix.copy(tempMatrix.current)
          obj.matrixWorldNeedsUpdate = true
        }
      }
    })
  })

  // This component doesn't render anything
  return null
} 