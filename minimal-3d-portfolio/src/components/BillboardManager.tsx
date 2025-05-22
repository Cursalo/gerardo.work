import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Global manager for billboarding all cards and media objects in the scene
 * This approach traverses the scene once per frame and handles all billboarding in one place
 */
export default function BillboardManager() {
  const { camera, scene } = useThree()
  
  // Use a ref to track if pointer is locked
  const pointerLockedRef = useRef(false)
  
  // Create reusable vectors and quaternion to avoid garbage collection
  const camPos = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const objPos = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const quaternion = useRef(new THREE.Quaternion())
  const euler = useRef(new THREE.Euler())
  
  // Minimum distance to prevent erratic behavior when too close
  const MIN_LOOKAT_DISTANCE = 0.2
  
  // Update on each frame
  useFrame(() => {
    // Only apply billboarding when pointer is locked (gameplay mode)
    pointerLockedRef.current = !!document.pointerLockElement
    
    if (!pointerLockedRef.current) return
    
    // Get camera world position once
    camera.getWorldPosition(camPos.current)

    // Traverse the scene once to find all card/media objects
    scene.traverse((obj) => {
      // Check for interactive project cards, all WorldObjects that should billboard
      if (obj.userData && (
          obj.userData.objectType === 'project' || 
          obj.userData.objectType === 'image' || 
          obj.userData.objectType === 'video' || 
          obj.userData.objectType === 'pdf' || 
          obj.userData.objectType === 'link' || 
          obj.userData.objectType === 'button' ||
          (obj.name && (
            obj.name.toLowerCase().includes('card') || 
            obj.name.toLowerCase().includes('media')
          ))
        )) {
        // Get object's world position
        obj.getWorldPosition(objPos.current)
        
        // Calculate direction vector from object to camera
        direction.current.subVectors(camPos.current, objPos.current)
        
        // Calculate distance to camera
        const distanceToCamera = direction.current.length()
        
        // Only billboard if camera is far enough away to prevent erratic behavior
        if (distanceToCamera > MIN_LOOKAT_DISTANCE) {
          // Create a target position at the same height as the object
          targetPos.current.set(camPos.current.x, objPos.current.y, camPos.current.z)
          
          // Make object look at camera (horizontal only)
          obj.lookAt(targetPos.current)
          
          // Get the current rotation as a quaternion
          obj.getWorldQuaternion(quaternion.current)
          
          // Convert quaternion to Euler angles
          euler.current.setFromQuaternion(quaternion.current, 'YXZ')
          
          // Zero out X and Z rotations (keep only Y rotation)
          euler.current.x = 0
          euler.current.z = 0
          
          // Apply the modified rotation back to the object
          obj.rotation.copy(euler.current)
        }
      }
    })
  })

  // This component doesn't render anything
  return null
} 