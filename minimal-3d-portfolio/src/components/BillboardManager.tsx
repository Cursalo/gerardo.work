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
  
  // Update on each frame
  useFrame(() => {
    // Only apply billboarding when pointer is locked (gameplay mode)
    pointerLockedRef.current = !!document.pointerLockElement
    
    if (!pointerLockedRef.current) return
    
    // Get camera world position once
    const camPos = new THREE.Vector3()
    camera.getWorldPosition(camPos)

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
        // Make it face the camera horizontally (Y-axis only)
        // This inherently prevents tilting by only using X and Z from camera
        obj.lookAt(camPos.x, obj.position.y, camPos.z)
        
        // Ensure no X or Z rotation (prevent any residual tilt)
        obj.rotation.x = 0
        obj.rotation.z = 0
      }
    })
  })

  // This component doesn't render anything
  return null
} 